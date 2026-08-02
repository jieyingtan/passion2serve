"use server";

import { revalidatePath } from "next/cache";
import OpenAI from "openai";
import { z } from "zod";

import { eventTypes, getDirectoryMatch, type EventType } from "@/lib/events/matching";
import { parseSpreadsheet, splitList } from "@/lib/imports/spreadsheet";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const idSchema = z.object({ eventId: z.string().uuid(), entityId: z.string().uuid() });
const businessStatusSchema = z.enum(["not_contacted", "awaiting_response", "confirmed", "declined"]);
const volunteerStatusSchema = z.enum(["recommended", "contacted", "awaiting_response", "confirmed", "declined", "attended", "no_show"]);

export interface ImportState { error?: string; success?: string }
export interface AiShortlistState { error?: string; success?: string }

const aiShortlistSchema = z.object({
  businesses: z.array(z.object({ id: z.string().uuid(), score: z.number().int().min(0).max(100), explanation: z.string().min(8).max(300) })).max(6),
  volunteers: z.array(z.object({ id: z.string().uuid(), score: z.number().int().min(0).max(100), explanation: z.string().min(8).max(300) })).max(6),
});

export async function generateAiShortlist(_state: AiShortlistState, formData: FormData): Promise<AiShortlistState> {
  try {
    return await runAiShortlist(formData);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "AI matching could not be completed." };
  }
}

async function runAiShortlist(formData: FormData): Promise<AiShortlistState> {
  const eventId = z.string().uuid().parse(formData.get("eventId"));
  const { admin, event } = await authorisedEvent(eventId);
  const [{ data: businesses }, { data: volunteers }, { data: existingBusinesses }, { data: existingVolunteers }] = await Promise.all([
    admin.from("businesses").select("id,name,capabilities").eq("active", true),
    admin.from("volunteers").select("id,full_name,interests,skills").eq("active", true),
    admin.from("event_businesses").select("business_id,status").eq("event_id", eventId),
    admin.from("event_volunteers").select("volunteer_id,status").eq("event_id", eventId),
  ]);
  if (!businesses?.length && !volunteers?.length) throw new Error("Import directory records before generating a shortlist.");

  if (!eventTypes.includes(event.event_type as EventType)) throw new Error("Unsupported event type.");
  const eventType = event.event_type as EventType;
  const deterministicShortlist: z.infer<typeof aiShortlistSchema> = {
    businesses: (businesses ?? []).map((business) => ({ business, match: getDirectoryMatch(eventType, event.name, business.capabilities) })).filter(({ match }) => match.eligible).sort((a, b) => b.match.score - a.match.score).filter((candidate, index, all) => all.findIndex((item) => item.business.name.trim().toLowerCase() === candidate.business.name.trim().toLowerCase()) === index).map(({ business, match }) => ({ id: business.id, score: match.score, explanation: `Matched capabilities: ${match.matchedSkills.join(", ")}.` })).slice(0, 6),
    volunteers: (volunteers ?? []).map((volunteer) => ({ volunteer, match: getDirectoryMatch(eventType, event.name, [...volunteer.interests, ...volunteer.skills]) })).filter(({ match }) => match.eligible).sort((a, b) => b.match.score - a.match.score).filter((candidate, index, all) => all.findIndex((item) => item.volunteer.full_name.trim().toLowerCase() === candidate.volunteer.full_name.trim().toLowerCase()) === index).map(({ volunteer, match }) => ({ id: volunteer.id, score: match.score, explanation: `Matched skills and interests: ${match.matchedSkills.join(", ")}.` })).slice(0, 6),
  };
  if (!deterministicShortlist.businesses.length && !deterministicShortlist.volunteers.length) {
    throw new Error("No directory records have skills or capabilities matching this event type.");
  }

  let shortlist = deterministicShortlist;
  let usedAi = false;
  if (process.env.OPENAI_API_KEY) {
    try {
      const response = await new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        maxRetries: 0,
        timeout: 4000,
      }).responses.create({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        input: [
          { role: "system", content: "You match community-service events to partners and volunteers. Return only valid JSON. Use only supplied IDs. Recommend a candidate only when their supplied capabilities, interests, or skills directly match the event type and purpose. Omit candidates without clear evidence. Scores and concise explanations must cite that evidence." },
          { role: "user", content: JSON.stringify({ task: "Select up to 6 suitable businesses and 6 suitable volunteers. Do not fill the list with weak or unrelated candidates.", output: { businesses: [{ id: "uuid", score: 0, explanation: "reason" }], volunteers: [{ id: "uuid", score: 0, explanation: "reason" }] }, event, businesses, volunteers }) },
        ],
      });
      const aiShortlist = aiShortlistSchema.parse(JSON.parse(response.output_text));
      const aiBusinesses = new Map(aiShortlist.businesses.map((item) => [item.id, item]));
      const aiVolunteers = new Map(aiShortlist.volunteers.map((item) => [item.id, item]));
      shortlist = {
        businesses: deterministicShortlist.businesses.map((item) => aiBusinesses.get(item.id) ?? item).sort((a, b) => b.score - a.score),
        volunteers: deterministicShortlist.volunteers.map((item) => aiVolunteers.get(item.id) ?? item).sort((a, b) => b.score - a.score),
      };
      usedAi = true;
    } catch (error) {
      console.error("AI shortlist failed; using deterministic matching.", error);
    }
  }

  const businessDirectory = new Map((businesses ?? []).map((item) => [item.id, item]));
  const volunteerDirectory = new Map((volunteers ?? []).map((item) => [item.id, item]));
  const seenBusinesses = new Set<string>();
  const seenVolunteers = new Set<string>();
  const seenBusinessNames = new Set<string>();
  const seenVolunteerNames = new Set<string>();
  const protectedBusinessIds = new Set((existingBusinesses ?? []).filter((item) => ["confirmed", "declined"].includes(item.status)).map((item) => item.business_id));
  const protectedVolunteerIds = new Set((existingVolunteers ?? []).filter((item) => ["contacted", "confirmed", "declined", "attended", "no_show"].includes(item.status)).map((item) => item.volunteer_id));
  const businessRows = shortlist.businesses.flatMap((item) => {
    const business = businessDirectory.get(item.id);
    const nameKey = business?.name.trim().toLowerCase();
    if (!business || !nameKey || protectedBusinessIds.has(item.id) || seenBusinesses.has(item.id) || seenBusinessNames.has(nameKey)) return [];
    const match = getDirectoryMatch(eventType, event.name, business.capabilities);
    if (!match.eligible) return [];
    seenBusinesses.add(item.id);
    seenBusinessNames.add(nameKey);
    return [{ event_id: event.id, business_id: item.id, match_score: Math.round((item.score + match.score) / 2), match_explanation: `AI match based on: ${match.matchedSkills.join(", ")}. ${item.explanation}`, status: "awaiting_response", contacted_at: new Date().toISOString() }];
  });
  const volunteerRows = shortlist.volunteers.flatMap((item) => {
    const volunteer = volunteerDirectory.get(item.id);
    const nameKey = volunteer?.full_name.trim().toLowerCase();
    if (!volunteer || !nameKey || protectedVolunteerIds.has(item.id) || seenVolunteers.has(item.id) || seenVolunteerNames.has(nameKey)) return [];
    const match = getDirectoryMatch(eventType, event.name, [...volunteer.interests, ...volunteer.skills]);
    if (!match.eligible) return [];
    seenVolunteers.add(item.id);
    seenVolunteerNames.add(nameKey);
    return [{ event_id: event.id, volunteer_id: item.id, match_score: Math.round((item.score + match.score) / 2), match_explanation: `AI match based on: ${match.matchedSkills.join(", ")}. ${item.explanation}`, status: "awaiting_response", contacted_at: new Date().toISOString() }];
  });
  await Promise.all([
    admin.from("event_businesses").delete().eq("event_id", event.id).eq("status", "not_contacted"),
    admin.from("event_volunteers").delete().eq("event_id", event.id).eq("status", "recommended"),
  ]);
  const results = await Promise.all([
    businessRows.length ? admin.from("event_businesses").upsert(businessRows, { onConflict: "event_id,business_id" }) : Promise.resolve({ error: null }),
    volunteerRows.length ? admin.from("event_volunteers").upsert(volunteerRows, { onConflict: "event_id,volunteer_id" }) : Promise.resolve({ error: null }),
  ]);
  if (results.some((result) => result.error)) throw new Error("The shortlist could not be saved.");
  await admin.from("audit_logs").insert({ action: "event.ai_shortlist_generated", entity_type: "event", entity_id: event.id, after_value: { businesses: businessRows.length, volunteers: volunteerRows.length, source: usedAi ? "openai_with_eligibility_guard" : "deterministic_fallback" } });
  revalidatePath(`/coordinator/events/${event.id}/operations`);
  const businessCount = deterministicShortlist.businesses.length;
  const volunteerCount = deterministicShortlist.volunteers.length;
  return { success: `Matched ${businessCount} business${businessCount === 1 ? "" : "es"} and ${volunteerCount} volunteer${volunteerCount === 1 ? "" : "s"}.` };
}

export async function importVolunteers(_state: ImportState, formData: FormData): Promise<ImportState> {
  const eventId = z.string().uuid().safeParse(formData.get("eventId"));
  const file = formData.get("file");
  if (!eventId.success || !(file instanceof File)) return { error: "Choose a valid volunteer spreadsheet." };
  try {
    const { admin, event } = await authorisedEvent(eventId.data);
    const rows = await parseSpreadsheet(file);
    const parsedRows = rows.map((row, index) => {
      const result = z.object({
        fullName: z.string().trim().min(2), email: z.string().email(), phone: z.string().trim().min(8),
      }).safeParse({ fullName: row.full_name || row.name, email: row.email?.toLowerCase(), phone: row.phone || row.phone_number });
      if (!result.success) throw new Error(`Check the name, email, and phone in spreadsheet row ${index + 2}.`);
      return {
        full_name: result.data.fullName, email: result.data.email, phone: result.data.phone,
        interests: splitList(row.interests || row.interest || ""), skills: splitList(row.skills || ""),
        source: row.source || "Spreadsheet import", active: true,
      };
    });
    const { data: importedVolunteers, error } = await admin.from("volunteers").upsert(parsedRows, { onConflict: "email" }).select("id,full_name,interests,skills");
    if (error) throw new Error("The volunteer spreadsheet could not be saved.");
    if (!eventTypes.includes(event.event_type as EventType)) throw new Error("Unsupported event type.");
    const { data: existingSelections } = await admin.from("event_volunteers").select("volunteer_id").eq("event_id", event.id);
    const selectedIds = new Set((existingSelections ?? []).map((selection) => selection.volunteer_id));
    const matchedRows = (importedVolunteers ?? []).flatMap((volunteer) => {
      if (selectedIds.has(volunteer.id)) return [];
      const match = getDirectoryMatch(event.event_type as EventType, event.name, [...volunteer.interests, ...volunteer.skills]);
      if (!match.eligible) return [];
      return [{ event_id: event.id, volunteer_id: volunteer.id, match_score: match.score, match_explanation: `Matched imported skills and interests: ${match.matchedSkills.join(", ")}.`, status: "awaiting_response", contacted_at: null }];
    });
    if (matchedRows.length) {
      const { error: matchError } = await admin.from("event_volunteers").upsert(matchedRows, { onConflict: "event_id,volunteer_id" });
      if (matchError) throw new Error("The volunteers were imported, but their event matches could not be displayed.");
    }
    await admin.from("audit_logs").insert({ action: "volunteers.imported", entity_type: "event", entity_id: event.id, after_value: { count: parsedRows.length, matched: matchedRows.length, file: file.name } });
    revalidatePath(`/coordinator/events/${event.id}/operations`);
    return { success: `${parsedRows.length} volunteer${parsedRows.length === 1 ? "" : "s"} imported. ${matchedRows.length} matching volunteer${matchedRows.length === 1 ? " is" : "s are"} now shown below.` };
  } catch (error) { return { error: error instanceof Error ? error.message : "The spreadsheet could not be imported." }; }
}

async function authorisedEvent(eventId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Authentication required.");
  const admin = createAdminClient();
  const [{ data: profile }, { data: event }] = await Promise.all([
    admin.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    admin.from("events").select("id, name, event_type, organisation_id, starts_at, venue, beneficiary_organisations(name)").eq("id", eventId).maybeSingle(),
  ]);
  if (profile?.role !== "coordinator") throw new Error("Coordinator access required.");
  if (!event) throw new Error("Event not found.");
  const { data: assignment } = await admin.from("coordinator_assignments").select("id").eq("coordinator_id", user.id).eq("organisation_id", event.organisation_id).maybeSingle();
  if (!assignment) throw new Error("You are not authorised to manage this event.");
  return { admin, event, supabase };
}

export async function addRecommendedBusiness(formData: FormData) {
  const parsed = idSchema.parse({ eventId: formData.get("eventId"), entityId: formData.get("businessId") });
  const { admin, event } = await authorisedEvent(parsed.eventId);
  if (!eventTypes.includes(event.event_type as EventType)) throw new Error("Unsupported event type.");
  const { data: business } = await admin.from("businesses").select("id, name, capabilities").eq("id", parsed.entityId).maybeSingle();
  if (!business) throw new Error("Business not found.");
  const match = getDirectoryMatch(event.event_type as EventType, event.name, business.capabilities);
  if (!match.eligible) throw new Error("This business does not have a capability that matches the event requirements.");
  const { error } = await admin.from("event_businesses").upsert({
    event_id: event.id,
    business_id: business.id,
    match_score: match.score,
    match_explanation: `Matched capabilities: ${match.matchedSkills.join(", ")}.`,
  }, { onConflict: "event_id,business_id" });
  if (error) throw new Error("The business recommendation could not be selected.");
  revalidatePath(`/coordinator/events/${event.id}/operations`);
}

export async function addRecommendedVolunteer(formData: FormData) {
  const parsed = idSchema.parse({ eventId: formData.get("eventId"), entityId: formData.get("volunteerId") });
  const { admin, event } = await authorisedEvent(parsed.eventId);
  if (!eventTypes.includes(event.event_type as EventType)) throw new Error("Unsupported event type.");
  const { data: volunteer } = await admin.from("volunteers").select("id, full_name, interests, skills").eq("id", parsed.entityId).maybeSingle();
  if (!volunteer) throw new Error("Volunteer not found.");
  const match = getDirectoryMatch(event.event_type as EventType, event.name, [...volunteer.interests, ...volunteer.skills]);
  if (!match.eligible) throw new Error("This volunteer's skills and interests do not match the event requirements.");
  const { error } = await admin.from("event_volunteers").upsert({
    event_id: event.id,
    volunteer_id: volunteer.id,
    match_score: match.score,
    match_explanation: `Matched skills and interests: ${match.matchedSkills.join(", ")}.`,
  }, { onConflict: "event_id,volunteer_id" });
  if (error) throw new Error("The volunteer recommendation could not be selected.");
  revalidatePath(`/coordinator/events/${event.id}/operations`);
}

export async function updateBusinessStatus(formData: FormData) {
  const parsed = idSchema.parse({ eventId: formData.get("eventId"), entityId: formData.get("eventBusinessId") });
  const status = businessStatusSchema.parse(formData.get("status"));
  const { admin, event } = await authorisedEvent(parsed.eventId);
  const { error } = await admin.from("event_businesses").update({
    status,
    contacted_at: status === "awaiting_response" ? new Date().toISOString() : undefined,
  }).eq("id", parsed.entityId).eq("event_id", event.id);
  if (error) throw new Error("Business status could not be updated.");
  revalidatePath(`/coordinator/events/${event.id}/operations`);
}

export async function updateVolunteerStatus(formData: FormData) {
  const parsed = idSchema.parse({ eventId: formData.get("eventId"), entityId: formData.get("eventVolunteerId") });
  const status = volunteerStatusSchema.parse(formData.get("status"));
  const { admin, event } = await authorisedEvent(parsed.eventId);
  const { error } = await admin.from("event_volunteers").update({
    status,
    contacted_at: ["contacted", "awaiting_response"].includes(status) ? new Date().toISOString() : undefined,
  }).eq("id", parsed.entityId).eq("event_id", event.id);
  if (error) throw new Error("Volunteer status could not be updated.");
  revalidatePath(`/coordinator/events/${event.id}/operations`);
}
