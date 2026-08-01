import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { EventStageTabs } from "@/components/coordinator/event-stage-tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatEventDate } from "@/lib/events/stages";
import { getEventOrganisations } from "@/server/events";
import { listEventsByStage } from "@/server/events/stages";
import { getCourseOptions } from "@/server/courses";

import { EventForm } from "./event-form";

export default async function CreateEventPage() {
  const [organisations, courses, { events: drafts }] = await Promise.all([getEventOrganisations(), getCourseOptions(), listEventsByStage("create")]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <p className="text-sm font-semibold text-primary">Create</p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Plan a new event</h1>
      <p className="mt-2 text-muted-foreground">Add the essentials and review matching recommendations before outreach.</p>
      <EventStageTabs active="create" />
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card className="border-0">
          <CardHeader>
            <CardTitle>Event details</CardTitle>
            <CardDescription>Fields marked required are needed before outreach can begin.</CardDescription>
          </CardHeader>
          <CardContent>
            <EventForm courses={courses} organisations={organisations} />
          </CardContent>
        </Card>
        <Card className="h-fit border-primary/20 bg-accent shadow-none">
          <CardContent className="p-6">
            <div className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="size-5" />
            </div>
            <h2 className="mt-5 font-bold">AI partner matching</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Recommendations use the event name and programme type to rank volunteer interests and partner capabilities. GPT-4 can enrich the shortlist with prospect research after creation.
            </p>
            <p className="mt-4 text-xs font-semibold text-primary">Every match includes a reason and requires your review.</p>
          </CardContent>
        </Card>
      </div>
      {drafts.length > 0 && <section><h2 className="text-2xl font-bold">Saved drafts</h2><div className="mt-4 grid gap-4 sm:grid-cols-2">{drafts.map((event)=><Card className="border-0" key={event.id}><CardContent className="p-5"><h3 className="font-bold">{event.name}</h3><p className="mt-2 text-sm text-muted-foreground">{event.eventType} · {formatEventDate(event.startsAt)}</p><p className="mt-1 text-sm text-muted-foreground">{event.venue}</p><Button asChild className="mt-4" size="sm" variant="outline"><Link href={`/coordinator/events/${event.id}/lifecycle`}>Review and start <ArrowRight className="size-4"/></Link></Button></CardContent></Card>)}</div></section>}
    </div>
  );
}
