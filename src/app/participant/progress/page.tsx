import Link from "next/link";
import { Award, Check, Coins, Gift, LockKeyhole, Route, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    { data: rewards },
    { data: redemptions },
    { data: feedback },
  ] = await Promise.all([
    supabase.from("courses").select("id,code,name,description,event_type,display_order").eq("active", true).order("display_order"),
    supabase.from("course_prerequisites").select("course_id,prerequisite_course_id"),
    supabase.from("attendance").select("event_id,scanned_at,events(course_id,name)").eq("participant_id", user.id),
    supabase.from("events").select("id,name,course_id,starts_at,status").in("status", ["ongoing", "upcoming"]).order("starts_at"),
    supabase.from("point_ledger").select("points,reason,created_at").eq("participant_id", user.id),
    supabase.from("participant_badges").select("awarded_at,badges(name,description,icon)").eq("participant_id", user.id).order("awarded_at", { ascending: false }),
    supabase.from("rewards").select("id,name,description,sponsor_name,points_cost,stock").eq("active", true).order("points_cost"),
    supabase.from("reward_redemptions").select("points_spent,status").eq("participant_id", user.id).neq("status", "cancelled"),
    supabase.from("participant_feedback").select("event_id").eq("participant_id", user.id),
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
  (dependencies ?? []).forEach((dep) =>
    prerequisitesByCourse.set(dep.course_id, [...(prerequisitesByCourse.get(dep.course_id) ?? []), dep.prerequisite_course_id]),
  );
  const feedbackEventIds = new Set((feedback ?? []).map((item) => item.event_id));
  const feedbackEvents = (attendance ?? [])
    .flatMap((record) => {
      const event = Array.isArray(record.events) ? record.events[0] : record.events;
      return event && !feedbackEventIds.has(record.event_id) ? [{ id: record.event_id, name: event.name }] : [];
    })
    .filter((item, index, all) => all.findIndex((candidate) => candidate.id === item.id) === index);

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <span className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1.5 text-sm font-semibold text-primary">
          <Route className="size-4" />
          {t.progress.badge}
        </span>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{t.progress.title}</h1>
        <p className="mt-2 text-muted-foreground">{t.progress.subtitle}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-0">
          <CardContent className="p-5">
            <Coins className="size-5 text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">{t.progress.availablePoints}</p>
            <p className="text-3xl font-bold">{balance}</p>
          </CardContent>
        </Card>
        <Card className="border-0">
          <CardContent className="p-5">
            <Award className="size-5 text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">{t.progress.badgesEarned}</p>
            <p className="text-3xl font-bold">{participantBadges?.length ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="border-0">
          <CardContent className="p-5">
            <Gift className="size-5 text-primary" />
            <p className="mt-3 text-sm text-muted-foreground">{t.progress.rewardsRequested}</p>
            <p className="text-3xl font-bold">{redemptions?.length ?? 0}</p>
          </CardContent>
        </Card>
      </div>
      <section>
        <h2 className="mb-4 text-2xl font-bold">{t.progress.learningPathway}</h2>
        <div className="space-y-4">
          {(courses ?? []).map((course, index) => {
            const requirements = prerequisitesByCourse.get(course.id) ?? [];
            const unmet = requirements.filter((id) => !completedIds.has(id));
            const completed = completedIds.has(course.id);
            const available = !completed && !unmet.length;
            const related = (events ?? []).filter((event) => event.course_id === course.id);
            return (
              <Card
                className={`border-0 ${completed ? "bg-emerald-50" : available ? "ring-2 ring-primary/30" : "opacity-80"}`}
                key={course.id}
              >
                <CardContent className="flex gap-4 p-6">
                  <div
                    className={`grid size-12 shrink-0 place-items-center rounded-full ${completed ? "bg-emerald-500 text-white" : available ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    {completed ? <Check className="size-5" /> : available ? <Sparkles className="size-5" /> : <LockKeyhole className="size-5" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-bold">{index + 1}. {course.name}</h3>
                      <Badge variant={completed ? "success" : available ? "warning" : "secondary"}>
                        {completed ? t.progress.completed : available ? t.progress.eligibleNow : t.progress.locked}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{course.description}</p>
                    {requirements.length > 0 && (
                      <p className="mt-3 text-sm">
                        <strong>{t.progress.requires}</strong>{" "}
                        {requirements.map((id) => nameById.get(id)).join(", ")}
                        {unmet.length > 0 && (
                          <span className="text-destructive">
                            {" "}· {t.progress.completeFirst.replace("{courses}", unmet.map((id) => nameById.get(id)).join(", "))}
                          </span>
                        )}
                      </p>
                    )}
                    {related.length > 0 && available && (
                      <Button asChild className="mt-4" size="sm">
                        <Link href="/participant/events">{t.progress.viewEvents}</Link>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>
      <section>
        <h2 className="mb-4 text-2xl font-bold">{t.progress.achievements}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {participantBadges?.length ? (
            participantBadges.map((item, index) => {
              const badge = Array.isArray(item.badges) ? item.badges[0] : item.badges;
              return (
                <Card className="border-0 bg-amber-50" key={`${badge?.name}-${index}`}>
                  <CardContent className="p-5">
                    <Award className="size-6 text-amber-700" />
                    <p className="mt-3 font-bold">{badge?.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{badge?.description}</p>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground">{t.progress.noBadges}</p>
          )}
        </div>
      </section>
      <section>
        <h2 className="mb-4 text-2xl font-bold">{t.progress.sponsorRewards}</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {(rewards ?? []).map((reward) => (
            <Card className="border-0" key={reward.id}>
              <CardHeader>
                <CardTitle>{reward.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{reward.description}</p>
                <p className="mt-3 text-sm">
                  {t.progress.sponsoredBy} <strong>{reward.sponsor_name}</strong>
                </p>
                <p className="mt-3 font-bold text-primary">
                  {t.progress.points.replace("{count}", String(reward.points_cost))}
                </p>
                <RewardButton disabled={balance < reward.points_cost || reward.stock === 0} rewardId={reward.id} t={t} />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
      {feedbackEvents.length > 0 && (
        <section>
          <h2 className="mb-4 text-2xl font-bold">{t.progress.feedback}</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {feedbackEvents.map((event) => (
              <FeedbackForm eventId={event.id} eventName={event.name} key={event.id} t={t} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
