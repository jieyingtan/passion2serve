"use client";

import { useActionState, useState } from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { eventTypes } from "@/lib/events/matching";
import type { EventOrganisationOption } from "@/server/events";
import type { CourseOption } from "@/server/courses";

import { updateEvent, type EditEventState } from "./actions";

interface EditableEvent {
  id: string;
  name: string;
  eventType: string;
  description: string | null;
  startsAt: string;
  venue: string;
  organisationId: string;
  volunteerTarget: number;
  businessTarget: number;
  participantCapacity: number | null;
  courseId: string | null;
}

function FieldError({ errors }: { errors?: string[] }) {
  return errors?.length ? <span className="mt-1 block text-xs font-medium text-destructive">{errors[0]}</span> : null;
}

export function EditEventForm({ courses, event, organisations }: { courses: CourseOption[]; event: EditableEvent; organisations: EventOrganisationOption[] }) {
  const [state, action, pending] = useActionState<EditEventState, FormData>(updateEvent, {});
  const [selectedType,setSelectedType]=useState(event.eventType);
  const inputClassName = "mt-2 h-11 w-full rounded-md border bg-background px-3 font-normal outline-none focus:ring-2 focus:ring-ring";
  return <form action={action} className="grid gap-5 sm:grid-cols-2">
    <input name="eventId" type="hidden" value={event.id} />
    <label className="text-sm font-semibold">Event name<input className={inputClassName} defaultValue={event.name} name="name" required /><FieldError errors={state.fieldErrors?.name}/></label>
    <label className="text-sm font-semibold">Event type<select className={inputClassName} name="eventType" onChange={event=>setSelectedType(event.target.value)} required value={selectedType}>{eventTypes.map(type=><option key={type} value={type}>{type}</option>)}</select><FieldError errors={state.fieldErrors?.eventType}/></label>
    <label className="text-sm font-semibold sm:col-span-2">Course or programme<select className={inputClassName} defaultValue={courses.some(course=>course.id===event.courseId&&course.eventType===selectedType)?event.courseId??"":""} key={selectedType} name="courseId" required><option disabled value="">Select a course</option>{courses.filter(course=>course.eventType===selectedType).map(course=><option key={course.id} value={course.id}>{course.name}</option>)}</select><FieldError errors={state.fieldErrors?.courseId}/></label>
    <label className="text-sm font-semibold">Date and time <span className="font-normal text-muted-foreground">(SGT)</span><input className={inputClassName} defaultValue={event.startsAt} name="startsAt" required type="datetime-local"/><FieldError errors={state.fieldErrors?.startsAt}/></label>
    <label className="text-sm font-semibold">Venue<input className={inputClassName} defaultValue={event.venue} name="venue" required/><FieldError errors={state.fieldErrors?.venue}/></label>
    <label className="text-sm font-semibold sm:col-span-2">Beneficiary organisation<select className={inputClassName} defaultValue={event.organisationId} name="organisationId" required>{organisations.map(organisation=><option key={organisation.id} value={organisation.id}>{organisation.name}</option>)}</select><FieldError errors={state.fieldErrors?.organisationId}/></label>
    <label className="text-sm font-semibold">Volunteer target<input className={inputClassName} defaultValue={event.volunteerTarget} min="0" name="volunteerTarget" required type="number"/><FieldError errors={state.fieldErrors?.volunteerTarget}/></label>
    <label className="text-sm font-semibold">Business target<input className={inputClassName} defaultValue={event.businessTarget} min="0" name="businessTarget" required type="number"/><FieldError errors={state.fieldErrors?.businessTarget}/></label>
    <label className="text-sm font-semibold sm:col-span-2">Participant capacity<input className={inputClassName} defaultValue={event.participantCapacity ?? ""} min="1" name="participantCapacity" placeholder="Optional" type="number"/><FieldError errors={state.fieldErrors?.participantCapacity}/></label>
    <label className="text-sm font-semibold sm:col-span-2">Description<textarea className="mt-2 min-h-28 w-full rounded-md border bg-background p-3 font-normal outline-none focus:ring-2 focus:ring-ring" defaultValue={event.description ?? ""} name="description"/><FieldError errors={state.fieldErrors?.description}/></label>
    {state.error&&<p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive sm:col-span-2" role="alert">{state.error}</p>}
    {state.success&&<p className="rounded-lg bg-emerald-100 px-3 py-2 text-sm font-semibold text-emerald-800 sm:col-span-2" role="status">{state.success}</p>}
    <div className="flex justify-end gap-3 sm:col-span-2"><Button asChild variant="outline"><Link href={`/coordinator/events/${event.id}/operations`}>Cancel</Link></Button><Button disabled={pending} type="submit">{pending?"Saving…":"Save changes"}</Button></div>
  </form>;
}
