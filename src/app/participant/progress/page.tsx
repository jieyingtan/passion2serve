import Link from "next/link";
import { Award, Check, Coins, Gift, LockKeyhole, MessageSquareText, Route, Sparkles, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader, SectionHeader } from "@/components/page-header";
import { getTranslations } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/server/auth";

import { FeedbackForm, RewardButton } from "./retention-forms";

export default async function ParticipantProgressPage() {
  const profile = await getCurrentProfile();
  const lang = profile?.preferredLanguage ?? "en";
  const t = getTranslations(lang);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { data: courses },
    { data: dependencies },
    { data: attendance },
    { data: events },
    { data: ledger },
    { data: participantBadges },
    { data: allBadges },
    { data: rewards },
    { data: redemptions },
    { data: feedback },
  ] = await Promise.all([
    supabase.from("courses").select("id,code,name,description,event_type,display_order").eq("active", true).order("display_order"),
    supabase.from("course_prerequisites").select("course_id,prerequisite_course_id"),
    supabase.from("attendance").select("event_id,scanned_at,events(course_id,name)").eq("participant_id", user.id),
    supabase.from("events").select("id,name,course_id,starts_at,status").in("status", ["ongoing", "upcoming"]).order("starts_at"),
    supabase.from("point_ledger").select("points,reason,created_at").eq("participant_id", user.id),
    supabase.from("participant_badges").select("badge_id,awarded_at,badges(name,description,icon)").eq("participant_id", user.id).order("awarded_at", { ascending: false }),
    supabase.from("badges").select("id,name,description,icon").eq("active",true).order("created_at"),
    supabase.from("rewards").select("id,name,description,sponsor_name,points_cost,stock").eq("active", true).order("points_cost"),
    supabase.from("reward_redemptions").select("points_spent,status").eq("participant_id", user.id).neq("status", "cancelled"),
    supabase.from("participant_feedback").select("event_id,rating,feedback,personal_story,story_consent,updated_at,events(name)").eq("participant_id", user.id).order("updated_at", { ascending: false }),
  ]);

  const earned = (ledger ?? []).reduce((sum, item) => sum + item.points, 0);
  const spent = (redemptions ?? []).reduce((sum, item) => sum + item.points_spent, 0);
  const balance = earned - spent;
  const completedIds = new Set((attendance ?? []).map((record) => {
    const event = Array.isArray(record.events) ? record.events[0] : record.events;
    return event?.course_id;
  }).filter(Boolean));
  const nameById = new Map((courses ?? []).map((course) => [course.id, course.name]));
  const prerequisitesByCourse = new Map<string, string[]>();
  (dependencies ?? []).forEach((dependency) => {
    prerequisitesByCourse.set(dependency.course_id, [
      ...(prerequisitesByCourse.get(dependency.course_id) ?? []),
      dependency.prerequisite_course_id,
    ]);
  });
  const feedbackEventIds = new Set((feedback ?? []).map((item) => item.event_id));
  const earnedBadgeIds = new Set((participantBadges ?? []).map((item)=>item.badge_id));
  const feedbackEvents = (attendance ?? []).flatMap((record) => {
    const event = Array.isArray(record.events) ? record.events[0] : record.events;
    return event && !feedbackEventIds.has(record.event_id) ? [{ id: record.event_id, name: event.name }] : [];
  }).filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);
  const pathwayGroups = [
    { label: t.progress.wellness, eventType: "Peace to Serve", accent: "bg-rose-100 text-rose-800" },
    { label: t.progress.knowledge, eventType: "Knowledge to Serve", accent: "bg-blue-100 text-blue-800" },
    { label: t.progress.distribution, eventType: "Items to Serve", accent: "bg-amber-100 text-amber-900" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <PageHeader eyebrow={<span className="inline-flex items-center gap-2"><Route className="size-4" />{t.progress.badge}</span>} title={t.progress.title} description={t.progress.subtitle} />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-0"><CardContent className="p-5"><Coins className="size-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">{t.progress.availablePoints}</p><p className="text-3xl font-bold">{balance}</p></CardContent></Card>
        <Card className="border-0"><CardContent className="p-5"><Award className="size-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">{t.progress.badgesEarned}</p><p className="text-3xl font-bold">{participantBadges?.length ?? 0}</p></CardContent></Card>
        <Card className="border-0"><CardContent className="p-5"><Gift className="size-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">{t.progress.rewardsRequested}</p><p className="text-3xl font-bold">{redemptions?.length ?? 0}</p></CardContent></Card>
      </div>

      <section>
        <SectionHeader title={t.progress.learningPathway} description={t.progress.subtitle} />
        <div className="grid gap-6 lg:grid-cols-3">
          {pathwayGroups.map((group) => {
            const groupCourses = (courses ?? []).filter((course) => course.event_type === group.eventType);
            return (
              <div className="rounded-2xl bg-background p-5 shadow-soft" key={group.eventType}>
                <div className={`rounded-xl px-4 py-3 text-center font-bold ${group.accent}`}>{group.label}</div>
                <div className="mt-6">
                  {groupCourses.map((course, index) => {
                    const requirements = prerequisitesByCourse.get(course.id) ?? [];
                    const unmet = requirements.filter((id) => !completedIds.has(id));
                    const completed = completedIds.has(course.id);
                    const available = !completed && !unmet.length;
                    const related = (events ?? []).filter((event) => event.course_id === course.id);
                    return (
                      <div className="relative pb-8 last:pb-0" key={course.id}>
                        {index > 0 && <div className="absolute -top-8 left-6 h-8 w-0.5 bg-border" />}
                        <Card className={completed ? "border-emerald-300 bg-emerald-50" : available ? "border-primary/40" : "border-border bg-muted/40"}>
                          <CardContent className="p-4">
                            <div className="flex gap-3">
                              <div className={`grid size-12 shrink-0 place-items-center rounded-full ${completed ? "bg-emerald-500 text-white" : available ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                {completed ? <Check className="size-5" /> : available ? <Sparkles className="size-5" /> : <LockKeyhole className="size-5" />}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{t.progress.step.replace("{count}", String(index + 1))}</p>
                                <h3 className="font-bold">{course.name}</h3>
                                <Badge className="mt-2" variant={completed ? "success" : available ? "warning" : "secondary"}>{completed ? t.progress.completed : available ? t.progress.eligibleNow : t.progress.locked}</Badge>
                              </div>
                            </div>
                            <p className="mt-3 text-sm text-muted-foreground">{course.description}</p>
                            {requirements.length > 0 && <p className="mt-3 text-xs"><strong>{t.progress.requires}</strong> {requirements.map((id) => nameById.get(id)).join(", ")}{unmet.length > 0 && <span className="block text-destructive">{t.progress.completeFirst.replace("{courses}", unmet.map((id) => nameById.get(id)).join(", "))}</span>}</p>}
                            {related.length > 0 && available && <Button asChild className="mt-4 w-full" size="sm"><Link href="/participant/events">{t.progress.viewEvents}</Link></Button>}
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                  {!groupCourses.length && <p className="py-8 text-center text-sm text-muted-foreground">{t.progress.noPathwayCourses}</p>}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <SectionHeader title={t.progress.achievements} />
        <div className="grid gap-4 md:grid-cols-3">
          {(allBadges??[]).map((badge) => {const active=earnedBadgeIds.has(badge.id);return <Card className={active?"border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 shadow-soft":"border-dashed bg-muted/50 grayscale"} key={badge.id}><CardContent className="p-5"><div className={`grid size-12 place-items-center rounded-full ${active?"bg-amber-400 text-amber-950":"bg-muted text-muted-foreground"}`}><Award className="size-6" /></div><div className="mt-4 flex items-center justify-between gap-2"><p className="font-bold">{badge.name}</p><Badge variant={active?"success":"secondary"}>{active?"Achieved":"Locked"}</Badge></div><p className="mt-2 text-sm text-muted-foreground">{badge.description}</p></CardContent></Card>})}
        </div>
      </section>

      <section>
        <SectionHeader title={t.progress.sponsorRewards} />
        <div className="grid gap-4 md:grid-cols-3">
          {(rewards ?? []).map((reward) => <Card className="border-0" key={reward.id}><CardHeader><CardTitle>{reward.name}</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">{reward.description}</p><p className="mt-3 text-sm">{t.progress.sponsoredBy} <strong>{reward.sponsor_name}</strong></p><p className="mt-3 font-bold text-primary">{t.progress.points.replace("{count}", String(reward.points_cost))}</p><RewardButton disabled={balance < reward.points_cost || reward.stock === 0} rewardId={reward.id} t={t} /></CardContent></Card>)}
        </div>
      </section>

      {feedbackEvents.length > 0 && <section><SectionHeader title={t.progress.feedback} description="Share your experience and earn 10 points." /><div className="grid gap-4 md:grid-cols-2">{feedbackEvents.map((event) => <FeedbackForm eventId={event.id} eventName={event.name} key={event.id} t={t} />)}</div></section>}

      {(feedback ?? []).length > 0 && (
        <section>
          <SectionHeader title="Your submitted feedback" description="Your latest response for each attended event is shown here." />
          <div className="grid gap-4 md:grid-cols-2">
            {(feedback ?? []).map((item) => {
              const event = Array.isArray(item.events) ? item.events[0] : item.events;
              return (
                <Card className="border-0" key={item.event_id}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary"><MessageSquareText className="size-5" /></span>
                        <div className="min-w-0"><p className="truncate font-bold">{event?.name ?? "Passion2Serve event"}</p><p className="text-xs text-muted-foreground">Submitted feedback</p></div>
                      </div>
                      <div className="flex shrink-0" aria-label={`${item.rating} out of 5 stars`}>{Array.from({ length: 5 }, (_, index) => <Star className={`size-4 ${index < item.rating ? "fill-amber-400 text-amber-400" : "text-muted"}`} key={index} />)}</div>
                    </div>
                    <p className="mt-4 rounded-xl bg-muted p-4 text-sm leading-6">{item.feedback}</p>
                    {item.personal_story && <p className="mt-3 text-sm leading-6 text-muted-foreground"><strong className="text-foreground">Your story:</strong> {item.personal_story}</p>}
                    <p className="mt-4 text-xs font-semibold text-muted-foreground">{item.story_consent ? "Approved to appear anonymously on the Passion2Serve landing page." : "Private — not shown on the public landing page."}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
