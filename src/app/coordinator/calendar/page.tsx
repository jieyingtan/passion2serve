import { CoordinatorCalendar } from "@/components/coordinator/coordinator-calendar";
import { dateKeyInSingapore } from "@/lib/events/calendar";
import { listCoordinatorCalendarEvents } from "@/server/events/calendar";

export default async function CoordinatorCalendarPage() {
  const { events, error } = await listCoordinatorCalendarEvents();

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <p className="text-sm font-semibold text-primary">Coordinator event pipeline</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight">Calendar</h1>
        <p className="mt-2 text-muted-foreground">Plan delivery dates and spot events that still need attention.</p>
      </div>
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
