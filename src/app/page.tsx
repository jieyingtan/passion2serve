import Link from "next/link";
import { ArrowRight, CalendarCheck, HeartHandshake, Quote, Sparkles, Star, UsersRound } from "lucide-react";

import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isSupabaseConfigured } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";

const roles = [
  {
    title: "Coordinator workspace",
    description: "Plan events, match partners and volunteers, record attendance, and report impact.",
    href: "/coordinator/dashboard",
    icon: CalendarCheck,
    cta: "Open coordinator demo",
  },
  {
    title: "Participant experience",
    description: "Discover events, access your membership pass, and follow your learning journey.",
    href: "/participant/events",
    icon: UsersRound,
    cta: "Open participant demo",
  },
];

async function testimonials() {
  if (!isSupabaseConfigured() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return [];
  const {data}=await createAdminClient().from("participant_feedback").select("id,rating,feedback,personal_story,profiles(full_name),events(name)").eq("story_consent",true).order("updated_at",{ascending:false}).limit(8);
  return (data??[]).map(item=>{const profile=Array.isArray(item.profiles)?item.profiles[0]:item.profiles;const event=Array.isArray(item.events)?item.events[0]:item.events;const parts=(profile?.full_name??"Community member").trim().split(/\s+/);return {id:item.id,rating:item.rating,story:item.personal_story?.trim()||item.feedback,name:parts.length>1?`${parts[0]} ${parts.at(-1)?.[0]}.`:parts[0],event:event?.name??"Passion2Serve event"};}).filter(item=>item.story.length>0);
}

export default async function HomePage() {
  const liveTestimonials=await testimonials();
  const stories=liveTestimonials.length?liveTestimonials:[{id:"demo-1",rating:5,story:"I felt confident using digital services on my own for the first time.",name:"Community participant",event:"Digital Skills Workshop"},{id:"demo-2",rating:5,story:"The volunteers were patient, welcoming, and made learning enjoyable.",name:"Programme participant",event:"Knowledge to Serve"},{id:"demo-3",rating:5,story:"I met new friends and discovered the next programme I can join.",name:"Community member",event:"Wellness Together"}];
  return (
    <main className="relative min-h-screen overflow-hidden px-5 py-6 sm:px-8">
      <div className="absolute -right-32 -top-32 size-96 rounded-full bg-secondary/70 blur-3xl" />
      <div className="absolute -bottom-40 -left-32 size-[28rem] rounded-full bg-accent blur-3xl" />
      <div className="relative mx-auto max-w-6xl">
        <header className="flex items-center justify-between">
          <Brand />
          <Button asChild variant="outline">
            <Link href="/login">Sign in</Link>
          </Button>
        </header>

        <section className="grid items-center gap-12 py-20 lg:grid-cols-[1.1fr_0.9fr] lg:py-28">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm font-semibold text-primary">
              <Sparkles className="size-4" />
              One platform. More meaningful impact.
            </div>
            <h1 className="max-w-3xl text-balance text-5xl font-bold tracking-[-0.04em] sm:text-6xl">
              Bring every act of service into focus.
            </h1>
            <p className="mt-6 max-w-2xl text-balance text-lg leading-8 text-muted-foreground">
              Passion2Serve connects event operations with a participant journey that celebrates progress, builds
              confidence, and keeps communities engaged.
            </p>
          </div>

          <div className="relative">
            <div className="absolute inset-8 rotate-3 rounded-[2rem] bg-primary/10" />
            <Card className="relative overflow-hidden border-0">
              <CardContent className="p-8">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-primary">Community impact</p>
                    <p className="mt-1 text-4xl font-bold">1,248</p>
                    <p className="text-sm text-muted-foreground">lives reached this year</p>
                  </div>
                  <div className="grid size-12 place-items-center rounded-2xl bg-secondary">
                    <HeartHandshake className="size-6 text-secondary-foreground" />
                  </div>
                </div>
                <div className="mt-10 grid grid-cols-3 gap-3">
                  {[['42', 'Events'], ['316', 'Volunteers'], ['89%', 'Attendance']].map(([value, label]) => (
                    <div className="rounded-xl bg-muted p-4" key={label}>
                      <p className="text-xl font-bold">{value}</p>
                      <p className="text-xs text-muted-foreground">{label}</p>
                    </div>
                  ))}
                </div>
                <div className="mt-6 rounded-xl bg-primary p-5 text-primary-foreground">
                  <p className="text-sm font-semibold">Next milestone</p>
                  <p className="mt-1 text-lg font-bold">Digital Skills Workshop</p>
                  <p className="mt-3 text-sm text-primary-foreground/75">18 Aug · 9:00 AM · Tampines Hub</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-5 pb-20 md:grid-cols-2">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <Card className="group border-0" key={role.title}>
                <CardContent className="flex h-full flex-col p-7">
                  <div className="grid size-11 place-items-center rounded-xl bg-accent text-primary">
                    <Icon className="size-5" />
                  </div>
                  <h2 className="mt-6 text-2xl font-bold">{role.title}</h2>
                  <p className="mt-2 flex-1 leading-7 text-muted-foreground">{role.description}</p>
                  <Link className="mt-6 inline-flex items-center gap-2 font-semibold text-primary" href={role.href}>
                    {role.cta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </section>
        <section className="pb-24" aria-labelledby="community-stories"><div className="mb-7 text-center"><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">Real community voices</p><h2 className="mt-2 text-3xl font-bold" id="community-stories">What participants are saying</h2><p className="mt-2 text-muted-foreground">Stories appear here only when participants choose to share them.</p></div><div className="overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"><div className="testimonial-track flex w-max gap-4 py-2">{[...stories,...stories].map((story,index)=><Card className="w-[300px] shrink-0 border-0 sm:w-[380px]" key={`${story.id}-${index}`}><CardContent className="p-6"><div className="flex items-center justify-between"><Quote className="size-7 text-primary"/><div className="flex">{Array.from({length:story.rating},(_,star)=><Star className="size-4 fill-amber-400 text-amber-400" key={star}/>)}</div></div><blockquote className="mt-5 text-lg font-semibold leading-7">“{story.story}”</blockquote><p className="mt-5 text-sm font-bold">{story.name}</p><p className="text-xs text-muted-foreground">{story.event}</p></CardContent></Card>)}</div></div></section>
      </div>
    </main>
  );
}
