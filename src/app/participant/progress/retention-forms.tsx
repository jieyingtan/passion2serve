"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { inputClassName } from "@/components/ui/input-styles";
import type { TranslationDict } from "@/lib/i18n";
import { redeemReward, saveFeedback, type RetentionState } from "./actions";

export function RewardButton({ rewardId, disabled, t }: { rewardId: string; disabled: boolean; t: TranslationDict }) {
  const [state, action, pending] = useActionState<RetentionState, FormData>(redeemReward, {});
  return <form action={action} className="mt-4 space-y-2"><input name="rewardId" type="hidden" value={rewardId} /><Button disabled={disabled || pending} size="sm" type="submit">{pending ? t.progress.requesting : t.progress.redeem}</Button>{state.error && <p className="text-xs text-destructive">{state.error}</p>}{state.success && <p className="text-xs text-emerald-700">{state.success}</p>}</form>;
}

export function FeedbackForm({ eventId, eventName, t }: { eventId: string; eventName: string; t: TranslationDict }) {
  const [state, action, pending] = useActionState<RetentionState, FormData>(saveFeedback, {});
  return <form action={action} className="space-y-3 rounded-xl border p-4"><input name="eventId" type="hidden" value={eventId} /><div><p className="font-semibold">{t.progress.shareFeedback.replace("{event}", eventName)}</p><p className="mt-1 text-xs font-semibold text-primary">Earn 10 points when you submit.</p></div><label className="block text-sm font-medium">{t.progress.rating}<select className={`${inputClassName} mt-1`} defaultValue="5" name="rating">{[5, 4, 3, 2, 1].map((value) => <option key={value} value={value}>{value} / 5</option>)}</select></label><label className="block text-sm font-medium">{t.progress.feedbackLabel}<textarea className={`${inputClassName} mt-1 min-h-20`} name="feedback" required /></label><label className="block text-sm font-medium">{t.progress.personalStory}<textarea className={`${inputClassName} mt-1 min-h-20`} name="personalStory" /></label><label className="flex gap-2 text-sm"><input name="storyConsent" type="checkbox" />{t.progress.storyConsent}</label><Button disabled={pending} size="sm" type="submit">{pending ? t.progress.saving : t.progress.submit}</Button>{state.error && <p className="text-sm text-destructive">{state.error}</p>}{state.success && <p className="text-sm text-emerald-700">{state.success}</p>}</form>;
}
