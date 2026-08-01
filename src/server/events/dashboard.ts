import type { EventStage } from "@/lib/events/stages";
import { createClient } from "@/lib/supabase/server";

export interface DashboardActivity {
  changedAt: string;
  eventId: string;
  eventName: string;
  id: string;
  newStatus: EventStage;
  previousStatus: EventStage | null;
  reason: string | null;
}

export async function listRecentEventActivity() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_status_history")
    .select("id, event_id, previous_status, new_status, reason, changed_at, events(name)")
    .order("changed_at", { ascending: false })
    .limit(6);

  if (error) return { activity: [] as DashboardActivity[], error: error.message };
  const activity = (data ?? []).map((item) => {
    const event = Array.isArray(item.events) ? item.events[0] : item.events;
    return {
      id: item.id as string,
      eventId: item.event_id as string,
      eventName: event?.name ?? "Event",
      previousStatus: item.previous_status as EventStage | null,
      newStatus: item.new_status as EventStage,
      reason: item.reason as string | null,
      changedAt: item.changed_at as string,
    } satisfies DashboardActivity;
  });
  return { activity, error: null };
}
