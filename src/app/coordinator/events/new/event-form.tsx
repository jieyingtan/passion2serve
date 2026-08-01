"use client";

import { useActionState, useMemo, useState } from "react";
import { Building2, Sparkles, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  eventTypes,
  getEventMatchPreview,
  type EventType,
} from "@/lib/events/matching";
import type { EventOrganisationOption } from "@/server/events";
import type { CourseOption } from "@/server/courses";

import { createEvent, type CreateEventState } from "./actions";

const initialState: CreateEventState = {};

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }
  return <span className="mt-1 block text-xs font-medium text-destructive">{errors[0]}</span>;
}

export function EventForm({ courses, organisations }: { courses: CourseOption[]; organisations: EventOrganisationOption[] }) {
  const [state, formAction, pending] = useActionState(createEvent, initialState);
  const [eventName, setEventName] = useState("");
  const [eventType, setEventType] = useState<EventType | "">("");
  const matchPreview = useMemo(
    () => (eventType ? getEventMatchPreview(eventType, eventName) : null),
    [eventName, eventType],
  );
  const matchingCourses = courses.filter((course) => course.eventType === eventType);
  const inputClassName =
    "mt-2 h-11 w-full rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring";

  return (
    <form action={formAction} className="grid gap-5 sm:grid-cols-2">
      <label className="text-sm font-semibold">
        Event name
        <input
          className={inputClassName}
          name="name"
          onChange={(event) => setEventName(event.target.value)}
          placeholder="e.g. Seniors Digital Skills Workshop"
          required
        />
        <FieldError errors={state.fieldErrors?.name} />
      </label>
      <label className="text-sm font-semibold">
        Event type
        <select
          className={inputClassName}
          name="eventType"
          onChange={(event) => setEventType(event.target.value as EventType | "")}
          required
          value={eventType}
        >
          <option disabled value="">Select a programme</option>
          {eventTypes.map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <FieldError errors={state.fieldErrors?.eventType} />
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        Course or programme
        <select className={inputClassName} defaultValue="" disabled={!eventType} key={eventType} name="courseId" required>
          <option disabled value="">{eventType ? "Select the learning outcome" : "Select an event type first"}</option>
          {matchingCourses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}
        </select>
        <FieldError errors={state.fieldErrors?.courseId} />
      </label>
      <section className="rounded-xl border border-primary/20 bg-accent/60 p-4 sm:col-span-2" aria-live="polite">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <div>
            <h2 className="font-bold">AI matching preview</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Matches are ranked from the event name, programme needs, volunteer form interests, and partner capabilities.
            </p>
          </div>
        </div>
        {!matchPreview ? (
          <p className="mt-4 rounded-lg bg-background/80 px-3 py-3 text-sm text-muted-foreground">
            Select an event type to preview suitable volunteers and partner organisations.
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            <div className="flex flex-wrap gap-2">
              {matchPreview.partnerNeeds.map((need) => (
                <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-primary" key={need}>
                  {need}
                </span>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg bg-background p-4">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Users className="size-4 text-primary" /> Volunteer matches
                </div>
                <div className="mt-3 space-y-3">
                  {matchPreview.volunteers.map((volunteer, index) => (
                    <div key={volunteer.name}>
                      <p className="text-sm font-semibold">{index + 1}. {volunteer.name}</p>
                      <p className="text-xs text-muted-foreground">{volunteer.interests.join(" · ")}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-lg bg-background p-4">
                <div className="flex items-center gap-2 text-sm font-bold">
                  <Building2 className="size-4 text-primary" /> Partner matches
                </div>
                <div className="mt-3 space-y-3">
                  {matchPreview.partners.map((partner, index) => (
                    <div key={partner.name}>
                      <p className="text-sm font-semibold">{index + 1}. {partner.name}</p>
                      <p className="text-xs text-muted-foreground">{partner.capabilities.join(" · ")}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
      <label className="text-sm font-semibold">
        Date and time <span className="font-normal text-muted-foreground">(SGT)</span>
        <input className={inputClassName} name="startsAt" required type="datetime-local" />
        <FieldError errors={state.fieldErrors?.startsAt} />
      </label>
      <label className="text-sm font-semibold">
        Venue
        <input className={inputClassName} name="venue" placeholder="Enter venue" required />
        <FieldError errors={state.fieldErrors?.venue} />
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        Beneficiary organisation
        <select className={inputClassName} defaultValue="" name="organisationId" required>
          <option disabled value="">Select an organisation</option>
          {organisations.map((organisation) => (
            <option key={organisation.id} value={organisation.id}>{organisation.name}</option>
          ))}
        </select>
        <FieldError errors={state.fieldErrors?.organisationId} />
      </label>
      <label className="text-sm font-semibold">
        Volunteer target
        <input className={inputClassName} defaultValue="20" min="0" name="volunteerTarget" required type="number" />
        <FieldError errors={state.fieldErrors?.volunteerTarget} />
      </label>
      <label className="text-sm font-semibold">
        Business target
        <input className={inputClassName} defaultValue="2" min="0" name="businessTarget" required type="number" />
        <FieldError errors={state.fieldErrors?.businessTarget} />
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        Participant capacity
        <input className={inputClassName} min="1" name="participantCapacity" placeholder="Optional" type="number" />
        <FieldError errors={state.fieldErrors?.participantCapacity} />
      </label>
      <label className="text-sm font-semibold sm:col-span-2">
        Description
        <textarea className="mt-2 min-h-28 w-full rounded-md border bg-background p-3 font-normal outline-none focus:ring-2 focus:ring-ring" name="description" />
        <FieldError errors={state.fieldErrors?.description} />
      </label>
      {state.error && (
        <p aria-live="polite" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2" role="alert">
          {state.error}
        </p>
      )}
      <div className="flex justify-end gap-3 sm:col-span-2">
        <Button disabled={pending || organisations.length === 0} name="intent" type="submit" value="draft" variant="outline">
          Save draft
        </Button>
        <Button disabled={pending || organisations.length === 0} name="intent" type="submit" value="start">
          {pending ? "Creating…" : "Create and match partners"}
        </Button>
      </div>
    </form>
  );
}
