export type EventStage = "create" | "ongoing" | "upcoming" | "awaiting_closure" | "archived";

export interface EventStageDefinition {
  description: string;
  emptyDescription: string;
  emptyTitle: string;
  href: string;
  label: string;
  status: EventStage;
}

export const eventStages: EventStageDefinition[] = [
  {
    status: "create",
    label: "Create",
    href: "/coordinator/events/new",
    description: "Start a new event or save it as a draft.",
    emptyTitle: "Create your first event",
    emptyDescription: "Add the event details and choose whether to save a draft or begin outreach.",
  },
  {
    status: "ongoing",
    label: "Ongoing",
    href: "/coordinator/events/ongoing",
    description: "Track business, volunteer, and participant readiness before an event is confirmed.",
    emptyTitle: "No ongoing events",
    emptyDescription: "Events appear here after you start outreach from the Create event page.",
  },
  {
    status: "upcoming",
    label: "Upcoming",
    href: "/coordinator/events/upcoming",
    description: "Prepare confirmed events, review participants, and get ready to record attendance.",
    emptyTitle: "No upcoming events",
    emptyDescription: "Fully confirmed events will move here for final preparation and attendance.",
  },
  {
    status: "awaiting_closure",
    label: "Awaiting Closure",
    href: "/coordinator/events/awaiting-closure",
    description: "Complete attendance, publicity, acknowledgements, and impact reporting.",
    emptyTitle: "Nothing awaiting closure",
    emptyDescription: "Completed events appear here until their attendance and impact figures are approved.",
  },
  {
    status: "archived",
    label: "Archived",
    href: "/coordinator/events/archived",
    description: "Review closed events, attendance outcomes, and retained impact records.",
    emptyTitle: "No archived events",
    emptyDescription: "Admin-approved closures become permanent event records here.",
  },
];

export function getEventStage(status: EventStage) {
  const stage = eventStages.find((candidate) => candidate.status === status);
  if (!stage) {
    throw new Error(`Unknown event stage: ${status}`);
  }
  return stage;
}

export function formatEventDate(value: string) {
  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Singapore",
  }).format(new Date(value));
}

