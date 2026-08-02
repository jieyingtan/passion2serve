import { createClient } from "@/lib/supabase/server";

export interface Testimonial {
  id: string;
  firstName: string;
  eventName: string;
  feedback: string;
  rating: number;
}

const DEMO_TESTIMONIALS: Testimonial[] = [
  {
    id: "demo-1",
    firstName: "Aisha",
    eventName: "Community Garden Day",
    feedback: "Such a meaningful experience! I learned so much about urban gardening and met wonderful people who share the same passion for green spaces.",
    rating: 5,
  },
  {
    id: "demo-2",
    firstName: "Wei Jie",
    eventName: "Digital Skills Workshop",
    feedback: "The workshop was well-organised and the mentors were patient. I now feel confident helping my elderly neighbours with their devices.",
    rating: 5,
  },
  {
    id: "demo-3",
    firstName: "Priya",
    eventName: "Food Distribution Drive",
    feedback: "My first time volunteering and it was incredibly rewarding. Seeing the smiles on residents' faces made my whole week.",
    rating: 4,
  },
  {
    id: "demo-4",
    firstName: "Marcus",
    eventName: "Youth Mentorship Programme",
    feedback: "Being matched with a mentee who shares my interests made the programme feel personal. The platform made scheduling so easy.",
    rating: 5,
  },
  {
    id: "demo-5",
    firstName: "Li Ting",
    eventName: "Neighbourhood Clean-Up",
    feedback: "Great teamwork and organisation. I appreciated how the coordinators kept us informed every step of the way.",
    rating: 4,
  },
];

function relatedText(value: unknown, field: "full_name" | "name") {
  const related = Array.isArray(value) ? value[0] : value;
  if (!related || typeof related !== "object") return null;
  const text = (related as Record<string, unknown>)[field];
  return typeof text === "string" && text.trim() ? text : null;
}

export async function getTestimonials(): Promise<Testimonial[]> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("participant_feedback")
      .select(`
        id,
        feedback,
        rating,
        profiles!participant_id (full_name),
        events!event_id (name)
      `)
      .eq("story_consent", true)
      .not("feedback", "is", null)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error || !data || data.length === 0) return DEMO_TESTIMONIALS;

    return data.flatMap((row) => {
      const fullName = relatedText(row.profiles, "full_name");
      const eventName = relatedText(row.events, "name");
      if (!row.feedback || !eventName) return [];
      return [{
        id: row.id,
        firstName: fullName?.split(" ")[0] ?? "Participant",
        eventName,
        feedback: row.feedback,
        rating: row.rating,
      }];
    });
  } catch {
    return DEMO_TESTIMONIALS;
  }
}
