"use client";

import { CalendarPlus, ChevronLeft, ChevronRight, Clock3, MapPin } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/page-header";
import { dateKeyInSingapore, dateKeyToUtc, monthGridKeys, shiftMonthKey } from "@/lib/events/calendar";
import { cn } from "@/lib/utils";

export type ParticipantCalendarEvent = { id:string; name:string; startsAt:string; venue:string; status:string; organisation:string };

export function ParticipantCalendar({ events, todayKey }: { events:ParticipantCalendarEvent[]; todayKey:string }) {
  const [anchorKey,setAnchorKey]=useState(todayKey);
  const [selectedKey,setSelectedKey]=useState<string|null>(null);
  const keys=monthGridKeys(anchorKey);
  const currentMonth=anchorKey.slice(0,7);
  const eventsByDay=useMemo(()=>{const map=new Map<string,ParticipantCalendarEvent[]>();events.forEach(event=>{const key=dateKeyInSingapore(event.startsAt);map.set(key,[...(map.get(key)??[]),event]);});return map;},[events]);
  const visibleEvents=(selectedKey?eventsByDay.get(selectedKey)??[]:events.filter(event=>dateKeyInSingapore(event.startsAt).slice(0,7)===currentMonth)).sort((a,b)=>new Date(a.startsAt).getTime()-new Date(b.startsAt).getTime());
  const title=new Intl.DateTimeFormat("en-SG",{month:"long",year:"numeric",timeZone:"UTC"}).format(dateKeyToUtc(anchorKey));
  return <div className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
    <div className="overflow-hidden rounded-2xl border bg-card shadow-soft">
      <div className="flex items-center justify-between border-b p-4"><Button aria-label="Previous month" onClick={()=>{setAnchorKey(shiftMonthKey(anchorKey,-1));setSelectedKey(null)}} size="icon" variant="outline"><ChevronLeft className="size-4"/></Button><div className="text-center"><p className="text-lg font-bold">{title}</p><button className="text-xs font-semibold text-primary" onClick={()=>{setAnchorKey(todayKey);setSelectedKey(todayKey)}} type="button">Go to today</button></div><Button aria-label="Next month" onClick={()=>{setAnchorKey(shiftMonthKey(anchorKey,1));setSelectedKey(null)}} size="icon" variant="outline"><ChevronRight className="size-4"/></Button></div>
      <div className="grid grid-cols-7 bg-primary px-2 py-3 text-center text-xs font-bold text-primary-foreground">{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(day=><span key={day}>{day}</span>)}</div>
      <div className="grid grid-cols-7 p-2">{keys.map(key=>{const count=eventsByDay.get(key)?.length??0;const selected=selectedKey===key;return <button aria-label={`${key}, ${count} events`} className={cn("relative grid min-h-14 place-items-center rounded-xl text-sm transition-colors sm:min-h-20",key.slice(0,7)!==currentMonth&&"text-muted-foreground/40",key===todayKey&&"ring-2 ring-primary/35",selected&&"bg-primary text-primary-foreground",count&&!selected&&"bg-emerald-50 font-bold text-emerald-900 hover:bg-emerald-100")} key={key} onClick={()=>setSelectedKey(selected?null:key)} type="button"><span>{Number(key.slice(8,10))}</span>{count>0&&<span className={cn("absolute bottom-1.5 rounded-full px-1.5 text-[10px]",selected?"bg-white/20":"bg-emerald-600 text-white")}>{count}</span>}</button>})}</div>
    </div>
    <div className="space-y-3"><SectionHeader title="Your events" description={selectedKey?"Events on the selected day":"Registered events this month"} />{visibleEvents.length?visibleEvents.map(event=><div className="rounded-xl border bg-card p-4 shadow-sm" key={event.id}><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{event.name}</h3><Badge variant={event.status==="waitlisted"?"warning":"success"}>{event.status}</Badge></div><p className="mt-2 flex gap-2 text-sm text-muted-foreground"><Clock3 className="mt-0.5 size-4 shrink-0"/>{new Intl.DateTimeFormat("en-SG",{dateStyle:"medium",timeStyle:"short",timeZone:"Asia/Singapore"}).format(new Date(event.startsAt))}</p><p className="mt-1 flex gap-2 text-sm text-muted-foreground"><MapPin className="mt-0.5 size-4 shrink-0"/>{event.venue}</p>{event.status!=="waitlisted"&&<Button asChild className="mt-4 w-full" size="sm" variant="outline"><a href={`/api/calendar/${event.id}`}><CalendarPlus className="size-4"/>Add to calendar</a></Button>}</div>):<div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No registered events in this period.</div>}</div>
  </div>;
}
