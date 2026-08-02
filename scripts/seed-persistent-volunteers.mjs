import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Supabase URL and service role key are required.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const volunteers = [
  {
    id: "30000000-0000-4000-8000-000000000001",
    full_name: "Aisha Rahman",
    email: "aisha.volunteer@example.com",
    phone: "+65 8123 1001",
    interests: ["Pre-loved item sorting", "Community distribution"],
    skills: ["Inventory", "Packing", "Beneficiary engagement"],
    source: "Giving.sg",
    active: true,
  },
  {
    id: "30000000-0000-4000-8000-000000000002",
    full_name: "Daniel Tan",
    email: "daniel.volunteer@example.com",
    phone: "+65 8123 1002",
    interests: ["Logistics", "Transport coordination"],
    skills: ["Route planning", "Driving", "Event operations"],
    source: "PTS Registration",
    active: true,
  },
  {
    id: "30000000-0000-4000-8000-000000000003",
    full_name: "Mei Lin",
    email: "meilin.volunteer@example.com",
    phone: "+65 8123 1003",
    interests: ["Sustainability", "Donation drives"],
    skills: ["Warehouse operations", "Stock counting"],
    source: "Giving.sg",
    active: true,
  },
  {
    id: "30000000-0000-4000-8000-000000000004",
    full_name: "Arjun Nair",
    email: "arjun.volunteer@example.com",
    phone: "+65 8123 1004",
    interests: ["Computer literacy", "Teaching seniors"],
    skills: ["Microsoft Office", "Coaching", "Troubleshooting"],
    source: "PTS Registration",
    active: true,
  },
  {
    id: "30000000-0000-4000-8000-000000000005",
    full_name: "Siti Nur",
    email: "siti.volunteer@example.com",
    phone: "+65 8123 1005",
    interests: ["Digital skills", "Course facilitation"],
    skills: ["Classroom support", "Mobile apps", "Translation"],
    source: "Giving.sg",
    active: true,
  },
  {
    id: "30000000-0000-4000-8000-000000000006",
    full_name: "Rachel Wong",
    email: "rachel.volunteer@example.com",
    phone: "+65 8123 1006",
    interests: ["Education", "Training administration"],
    skills: ["Registration", "Curriculum support", "Facilitation"],
    source: "PTS Registration",
    active: true,
  },
  {
    id: "30000000-0000-4000-8000-000000000007",
    full_name: "Priya Kumar",
    email: "priya.volunteer@example.com",
    phone: "+65 8123 1007",
    interests: ["Yoga", "Mindfulness"],
    skills: ["Beginner yoga", "Breathing exercises"],
    source: "Giving.sg",
    active: true,
  },
  {
    id: "30000000-0000-4000-8000-000000000008",
    full_name: "Farah Lim",
    email: "farah.volunteer@example.com",
    phone: "+65 8123 1008",
    interests: ["Zumba", "Active ageing"],
    skills: ["Group exercise", "Music coordination"],
    source: "PTS Registration",
    active: true,
  },
  {
    id: "30000000-0000-4000-8000-000000000009",
    full_name: "Marcus Lee",
    email: "marcus.volunteer@example.com",
    phone: "+65 8123 1009",
    interests: ["Meditation", "Mental wellness"],
    skills: ["Guided meditation", "Participant care"],
    source: "Giving.sg",
    active: true,
  },
];

let result = await supabase
  .from("volunteers")
  .upsert(
    volunteers.map((volunteer) => ({ ...volunteer, is_persistent: true })),
    { onConflict: "id" },
  );

if (result.error?.code === "PGRST204") {
  result = await supabase.from("volunteers").upsert(volunteers, { onConflict: "id" });
}

if (result.error) {
  throw result.error;
}

const [{ data: savedVolunteers, error: volunteerError }, { data: mark, error: markError }] =
  await Promise.all([
    supabase
      .from("volunteers")
      .select("full_name,email,active")
      .in(
        "id",
        volunteers.map((volunteer) => volunteer.id),
      )
      .order("full_name"),
    supabase
      .from("profiles")
      .select("full_name,email,role")
      .eq("email", "mark@passion2serve.com")
      .maybeSingle(),
  ]);

if (volunteerError || markError) {
  throw volunteerError || markError;
}

if (savedVolunteers?.length !== volunteers.length) {
  throw new Error(`Expected ${volunteers.length} permanent volunteers, found ${savedVolunteers?.length ?? 0}.`);
}

if (mark?.role !== "coordinator") {
  throw new Error("Mark's coordinator profile was not found.");
}

console.log(`${savedVolunteers.length} permanent volunteers restored.`);
console.log(`Coordinator retained: ${mark.full_name} <${mark.email}>.`);
