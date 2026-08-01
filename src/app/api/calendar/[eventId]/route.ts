import { createClient } from "@/lib/supabase/server";

function icsDate(value:string){return new Date(value).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}Z$/,"Z");}
function escapeIcs(value:string){return value.replace(/\\/g,"\\\\").replace(/\n/g,"\\n").replace(/,/g,"\\,").replace(/;/g,"\\;");}

export async function GET(_request:Request,{params}:{params:Promise<{eventId:string}>}){
  const {eventId}=await params; const supabase=await createClient(); const {data:{user}}=await supabase.auth.getUser();
  if(!user)return new Response("Authentication required.",{status:401});
  const {data:registration}=await supabase.from("registrations").select("status,events(id,name,description,starts_at,ends_at,venue)").eq("event_id",eventId).eq("participant_id",user.id).in("status",["registered","confirmed"]).maybeSingle();
  const event=Array.isArray(registration?.events)?registration.events[0]:registration?.events;
  if(!event)return new Response("Registered event not found.",{status:404});
  const calendar=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Passion2Serve//Events//EN","BEGIN:VEVENT",`UID:${event.id}@passion2serve`,`DTSTAMP:${icsDate(new Date().toISOString())}`,`DTSTART:${icsDate(event.starts_at)}`,`DTEND:${icsDate(event.ends_at??new Date(new Date(event.starts_at).getTime()+2*60*60*1000).toISOString())}`,`SUMMARY:${escapeIcs(event.name)}`,`LOCATION:${escapeIcs(event.venue)}`,`DESCRIPTION:${escapeIcs(event.description??"Passion2Serve event")}`,"END:VEVENT","END:VCALENDAR"].join("\r\n");
  return new Response(calendar,{headers:{"Content-Type":"text/calendar; charset=utf-8","Content-Disposition":`attachment; filename="passion2serve-${event.id}.ics"`,"Cache-Control":"private, no-store"}});
}
