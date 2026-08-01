import 'server-only'

import { createClient } from '@/lib/supabase/server'
import {
  getAttendanceTrend,
  getBeneficiaryImpact,
  getCompletionTrend,
  getEventSummary,
  getFilterOptions,
  getParticipationByEvent,
  getParticipationSummary,
  getSocialTotals,
  getSocialTrend,
} from '@/server/repositories/analytics-repository'
import type {
  AnalyticsFilters,
  FilterOptionRow,
  ImpactAnalytics,
  SocialTotalsRow,
} from '@/types/analytics'

/** Only Coordinators may open the impact dashboard (spec §16.1). */
export async function assertCoordinator() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { supabase, user: null, isCoordinator: false as const }
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return { supabase, user, isCoordinator: profile?.role === 'coordinator' }
}

/**
 * Fetches every panel in one round of parallel queries. Each RPC is already
 * scoped by RLS, so a Coordinator only ever aggregates their own programmes.
 */
export async function getImpactAnalytics(filters: AnalyticsFilters): Promise<ImpactAnalytics> {
  const supabase = await createClient()

  const [
    summary,
    attendanceTrend,
    participation,
    participationByEvent,
    beneficiaries,
    socialTotals,
    socialTrend,
    completionTrend,
  ] = await Promise.all([
    getEventSummary(supabase, filters),
    getAttendanceTrend(supabase, filters),
    getParticipationSummary(supabase, filters),
    getParticipationByEvent(supabase, filters),
    getBeneficiaryImpact(supabase, filters),
    getSocialTotals(supabase, filters),
    getSocialTrend(supabase, filters),
    getCompletionTrend(supabase, filters),
  ])

  return {
    filters,
    summary,
    attendanceTrend,
    participation,
    participationByEvent,
    beneficiaries,
    socialTotals,
    socialTrend,
    completionTrend,
  }
}

export async function getAnalyticsFilterOptions(): Promise<{
  eventTypes: FilterOptionRow[]
  venues: FilterOptionRow[]
  organisations: FilterOptionRow[]
}> {
  const supabase = await createClient()
  const options = await getFilterOptions(supabase)
  return {
    eventTypes: options.filter((option) => option.kind === 'event_type'),
    venues: options.filter((option) => option.kind === 'venue'),
    organisations: options.filter((option) => option.kind === 'organisation'),
  }
}

/**
 * Adds platform totals without inventing zeros: a metric stays `null` unless at
 * least one platform reported it, so the UI can print "Not available"
 * (spec §17.5).
 */
export function sumSocialMetric(
  rows: SocialTotalsRow[],
  metric: keyof Pick<SocialTotalsRow, 'likes' | 'shares' | 'comments' | 'impressions' | 'reach'>,
): number | null {
  const reported = rows.map((row) => row[metric]).filter((value): value is number => value !== null)
  if (reported.length === 0) return null
  return reported.reduce((total, value) => total + value, 0)
}

/** Plain-language summary used as the accessible description of the page. */
export function describeImpact(analytics: ImpactAnalytics): string {
  const { summary } = analytics
  if (summary.events_count === 0) {
    return 'No completed events match these filters yet.'
  }

  const attendance =
    summary.attendance_rate === null
      ? 'no recorded attendance'
      : `${Math.round(summary.attendance_rate * 100)}% attendance`

  return [
    `${summary.events_count} completed ${summary.events_count === 1 ? 'event' : 'events'}`,
    `${summary.participants_reached} participants reached`,
    attendance,
    `${summary.certificates_issued} certificates issued`,
  ].join(' · ')
}
