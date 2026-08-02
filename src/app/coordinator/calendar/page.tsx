import { CoordinatorCalendar } from "@/components/coordinator/coordinator-calendar";
import { PageHeader } from "@/components/page-header";
import { dateKeyInSingapore } from "@/lib/events/calendar";
import { listCoordinatorCalendarEvents } from "@/server/events/calendar";

export default async function CoordinatorCalendarPage() {
  const { events, error } = await listCoordinatorCalendarEvents();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader eyebrow="Coordinator event pipeline" title="Calendar" description="Plan delivery dates and spot events that still need attention." />
      {error ? (
        <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          Calendar events could not be loaded: {error}
        </p>
      ) : (
        <CoordinatorCalendar events={events} todayKey={dateKeyInSingapore(new Date())} />
      )}
    </div>
  );
}
