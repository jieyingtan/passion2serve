import 'server-only'

import { createClient } from '@/lib/supabase/server'
import type {
  AnalyticsFilters,
  AttendanceTrendRow,
  BeneficiaryImpactRow,
  CompletionTrendRow,
  EventSummaryRow,
  FilterOptionRow,
  ParticipationByEventRow,
  ParticipationSummaryRow,
  SocialTotalsRow,
  SocialTrendRow,
} from '@/types/analytics'

/**
 * Every call runs through the authenticated SSR client, so Row Level Security
 * limits aggregation to the Coordinator's assigned organisations (spec §16.4).
 * The service-role key is deliberately not used here.
 */

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

interface RpcArgs {
  p_from: string
  p_to: string
  p_event_types: string[] | null
  p_organisation_ids: string[] | null
  p_venues: string[] | null
  p_statuses: string[]
}

export function toRpcArgs(filters: AnalyticsFilters): RpcArgs {
  return {
    p_from: filters.from,
    p_to: filters.to,
    p_event_types: filters.eventTypes.length ? filters.eventTypes : null,
    p_organisation_ids: filters.organisationIds.length ? filters.organisationIds : null,
    p_venues: filters.venues.length ? filters.venues : null,
    p_statuses: filters.statuses,
  }
}

/** Postgres returns bigints and numerics as strings over PostgREST in some
 * configurations. Normalise once here so charts never receive "12" as a label. */
function toNumber(value: unknown): number {
  const parsed = typeof value === 'string' ? Number(value) : (value as number)
  return Number.isFinite(parsed) ? parsed : 0
}

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Columns that carry labels or timestamps and must never be coerced. */
const TEXT_COLUMNS = new Set([
  'period_start',
  'starts_at',
  'event_id',
  'event_name',
  'organisation_id',
  'organisation_name',
  'integration',
  'kind',
  'value',
  'label',
])

const NUMERIC_STRING = /^-?\d+(\.\d+)?$/

function numeric<T extends object>(row: T, nullableKeys: readonly string[]): T {
  const output: Record<string, unknown> = { ...(row as Record<string, unknown>) }
  for (const [key, value] of Object.entries(row as Record<string, unknown>)) {
    if (TEXT_COLUMNS.has(key)) continue
    const isNumericLike =
      typeof value === 'number' || (typeof value === 'string' && NUMERIC_STRING.test(value))
    if (!isNumericLike) continue
    output[key] = nullableKeys.includes(key) ? toNullableNumber(value) : toNumber(value)
  }
  return output as T
}

async function rpc<T>(client: SupabaseClient, fn: string, args: object): Promise<T[]> {
  const { data, error } = await client.rpc(fn, args)
  if (error) {
    throw new Error(`Analytics query ${fn} failed: ${error.message}`)
  }
  return (data ?? []) as T[]
}

export const EMPTY_SUMMARY: EventSummaryRow = {
  events_count: 0,
  registrations_total: 0,
  registrations_committed: 0,
  waitlisted_total: 0,
  cancelled_total: 0,
  attended_total: 0,
  no_show_total: 0,
  participants_reached: 0,
  attendance_rate: null,
  no_show_rate: null,
  drop_off_rate: null,
  cancellation_rate: null,
  capacity_total: 0,
  capacity_fill_rate: null,
  new_participants: 0,
  returning_participants: 0,
  retention_rate: null,
  certificates_issued: 0,
  course_completions: 0,
  points_awarded: 0,
  points_redeemed: 0,
  rewards_redeemed: 0,
}

export const EMPTY_PARTICIPATION: ParticipationSummaryRow = {
  volunteer_target_total: 0,
  volunteers_assigned: 0,
  volunteers_confirmed: 0,
  volunteers_declined: 0,
  volunteers_awaiting: 0,
  volunteers_attended: 0,
  volunteers_no_show: 0,
  volunteer_fill_rate: null,
  volunteer_show_rate: null,
  businesses_selected: 0,
  businesses_contacted: 0,
  businesses_confirmed: 0,
  businesses_declined: 0,
  businesses_awaiting: 0,
  business_confirmation_rate: null,
  business_response_rate: null,
}

const SUMMARY_NULLABLE = [
  'attendance_rate',
  'no_show_rate',
  'drop_off_rate',
  'cancellation_rate',
  'capacity_fill_rate',
  'retention_rate',
] as const

const SOCIAL_NULLABLE = ['likes', 'shares', 'comments', 'impressions', 'reach'] as const

export async function getEventSummary(
  client: SupabaseClient,
  filters: AnalyticsFilters,
): Promise<EventSummaryRow> {
  const rows = await rpc<EventSummaryRow>(client, 'analytics_event_summary', toRpcArgs(filters))
  const row = rows[0]
  return row ? numeric(row, SUMMARY_NULLABLE) : EMPTY_SUMMARY
}

export async function getAttendanceTrend(
  client: SupabaseClient,
  filters: AnalyticsFilters,
): Promise<AttendanceTrendRow[]> {
  const rows = await rpc<AttendanceTrendRow>(client, 'analytics_attendance_trend', {
    ...toRpcArgs(filters),
    p_bucket: filters.bucket,
  })
  return rows.map((row) => numeric(row, ['attendance_rate', 'drop_off_rate']))
}

export async function getParticipationSummary(
  client: SupabaseClient,
  filters: AnalyticsFilters,
): Promise<ParticipationSummaryRow> {
  const rows = await rpc<ParticipationSummaryRow>(
    client,
    'analytics_participation_summary',
    toRpcArgs(filters),
  )
  const row = rows[0]
  return row
    ? numeric(row, [
        'volunteer_fill_rate',
        'volunteer_show_rate',
        'business_confirmation_rate',
        'business_response_rate',
      ])
    : EMPTY_PARTICIPATION
}

export async function getParticipationByEvent(
  client: SupabaseClient,
  filters: AnalyticsFilters,
  limit = 24,
): Promise<ParticipationByEventRow[]> {
  const rows = await rpc<ParticipationByEventRow>(client, 'analytics_participation_by_event', {
    ...toRpcArgs(filters),
    p_limit: limit,
  })
  return rows.map((row) => numeric(row, ['volunteer_target']))
}

export async function getBeneficiaryImpact(
  client: SupabaseClient,
  filters: AnalyticsFilters,
): Promise<BeneficiaryImpactRow[]> {
  const rows = await rpc<BeneficiaryImpactRow>(
    client,
    'analytics_beneficiary_impact',
    toRpcArgs(filters),
  )
  return rows.map((row) => numeric(row, ['attendance_rate']))
}

export async function getSocialTotals(
  client: SupabaseClient,
  filters: AnalyticsFilters,
): Promise<SocialTotalsRow[]> {
  const rows = await rpc<SocialTotalsRow>(client, 'analytics_social_totals', toRpcArgs(filters))
  return rows.map((row) => numeric(row, SOCIAL_NULLABLE))
}

export async function getSocialTrend(
  client: SupabaseClient,
  filters: AnalyticsFilters,
): Promise<SocialTrendRow[]> {
  const rows = await rpc<SocialTrendRow>(client, 'analytics_social_trend', {
    ...toRpcArgs(filters),
    p_bucket: filters.bucket,
  })
  return rows.map((row) => numeric(row, SOCIAL_NULLABLE))
}

export async function getCompletionTrend(
  client: SupabaseClient,
  filters: AnalyticsFilters,
): Promise<CompletionTrendRow[]> {
  const rows = await rpc<CompletionTrendRow>(client, 'analytics_completion_trends', {
    ...toRpcArgs(filters),
    p_bucket: filters.bucket,
  })
  return rows.map((row) => numeric(row, ['completion_rate']))
}

export async function getFilterOptions(client: SupabaseClient): Promise<FilterOptionRow[]> {
  return rpc<FilterOptionRow>(client, 'analytics_filter_options', {})
}
