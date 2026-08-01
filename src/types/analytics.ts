/**
 * Return shapes for the analytics RPCs in
 * supabase/migrations/20260801120000_impact_analytics.sql
 *
 * These are hand-written because `supabase gen types` only picks up functions
 * after the migration has been applied. Regenerate database types after
 * deploying and these can be narrowed to `Database['public']['Functions'][...]`.
 *
 * `null` always means "not available" — never zero. Rates are 0–1 fractions.
 */

export type AnalyticsBucket = 'day' | 'week' | 'month' | 'quarter' | 'year'

export interface AnalyticsFilters {
  from: string // ISO date, inclusive
  to: string // ISO date, exclusive
  bucket: AnalyticsBucket
  eventTypes: string[]
  organisationIds: string[]
  venues: string[]
  statuses: string[]
}

export interface EventSummaryRow {
  events_count: number
  registrations_total: number
  registrations_committed: number
  waitlisted_total: number
  cancelled_total: number
  attended_total: number
  no_show_total: number
  participants_reached: number
  attendance_rate: number | null
  no_show_rate: number | null
  drop_off_rate: number | null
  cancellation_rate: number | null
  capacity_total: number
  capacity_fill_rate: number | null
  new_participants: number
  returning_participants: number
  retention_rate: number | null
  certificates_issued: number
  course_completions: number
  points_awarded: number
  points_redeemed: number
  rewards_redeemed: number
}

export interface AttendanceTrendRow {
  period_start: string
  events_count: number
  registrations_committed: number
  attended: number
  no_show: number
  cancelled: number
  attendance_rate: number | null
  drop_off_rate: number | null
}

export interface ParticipationSummaryRow {
  volunteer_target_total: number
  volunteers_assigned: number
  volunteers_confirmed: number
  volunteers_declined: number
  volunteers_awaiting: number
  volunteers_attended: number
  volunteers_no_show: number
  volunteer_fill_rate: number | null
  volunteer_show_rate: number | null
  businesses_selected: number
  businesses_contacted: number
  businesses_confirmed: number
  businesses_declined: number
  businesses_awaiting: number
  business_confirmation_rate: number | null
  business_response_rate: number | null
}

export interface ParticipationByEventRow {
  event_id: string
  event_name: string
  starts_at: string
  volunteer_target: number | null
  volunteers_confirmed: number
  volunteers_attended: number
  businesses_selected: number
  businesses_confirmed: number
}

export interface BeneficiaryImpactRow {
  organisation_id: string | null
  organisation_name: string
  events_count: number
  participants_reached: number
  attended_total: number
  registrations_committed: number
  attendance_rate: number | null
  volunteers_engaged: number
  businesses_engaged: number
  certificates_issued: number
  course_completions: number
}

export interface SocialTotalsRow {
  integration: string
  posts_count: number
  likes: number | null
  shares: number | null
  comments: number | null
  impressions: number | null
  reach: number | null
}

export interface SocialTrendRow {
  period_start: string
  posts_count: number
  likes: number | null
  shares: number | null
  comments: number | null
  impressions: number | null
  reach: number | null
}

export interface CompletionTrendRow {
  period_start: string
  events_completed: number
  course_completions: number
  certificates_issued: number
  participants_completing: number
  completion_rate: number | null
}

export interface FilterOptionRow {
  kind: 'event_type' | 'venue' | 'organisation'
  value: string
  label: string
}

/** Everything the archived analytics page renders, fetched in one pass. */
export interface ImpactAnalytics {
  filters: AnalyticsFilters
  summary: EventSummaryRow
  attendanceTrend: AttendanceTrendRow[]
  participation: ParticipationSummaryRow
  participationByEvent: ParticipationByEventRow[]
  beneficiaries: BeneficiaryImpactRow[]
  socialTotals: SocialTotalsRow[]
  socialTrend: SocialTrendRow[]
  completionTrend: CompletionTrendRow[]
}
