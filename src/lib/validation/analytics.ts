import { z } from 'zod'

import type { AnalyticsFilters } from '@/types/analytics'

/**
 * Filters accepted by the archived analytics view (spec §5.9).
 * Dates are plain ISO dates; `to` is treated as exclusive by the RPCs.
 */
export const analyticsBucketSchema = z.enum(['day', 'week', 'month', 'quarter', 'year'])

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use the format YYYY-MM-DD')

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const csv = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (!value) return [] as string[]
    const parts = Array.isArray(value) ? value : value.split(',')
    return parts.map((part) => part.trim()).filter(Boolean)
  })

export const analyticsFilterSchema = z
  .object({
    from: isoDate.optional(),
    to: isoDate.optional(),
    bucket: analyticsBucketSchema.optional(),
    types: csv,
    orgs: csv.transform((values) => values.filter((value) => UUID_PATTERN.test(value))),
    venues: csv,
    statuses: csv,
  })
  .transform((value): AnalyticsFilters => {
    const { from, to } = resolveRange(value.from, value.to)
    return {
      from,
      to,
      bucket: value.bucket ?? 'month',
      eventTypes: value.types,
      organisationIds: value.orgs,
      venues: value.venues,
      // Archived is the default because this view reports on completed events.
      statuses: value.statuses.length > 0 ? value.statuses : ['archived'],
    }
  })

/** Default window: the last 12 whole months plus the current one. */
function resolveRange(from?: string, to?: string): { from: string; to: string } {
  const today = new Date()
  const defaultTo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 1))
  const defaultFrom = new Date(Date.UTC(today.getUTCFullYear() - 1, today.getUTCMonth(), 1))

  const resolvedFrom = from ?? toIsoDate(defaultFrom)
  const resolvedTo = to ?? toIsoDate(defaultTo)

  // A reversed range returns nothing and looks like a bug, so swap it.
  return resolvedFrom <= resolvedTo
    ? { from: resolvedFrom, to: resolvedTo }
    : { from: resolvedTo, to: resolvedFrom }
}

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export type AnalyticsSearchParams = Record<string, string | string[] | undefined>

/**
 * Parses URL search params. Invalid values fall back to defaults rather than
 * throwing — a mistyped query string should not blank the dashboard.
 */
export function parseAnalyticsFilters(searchParams: AnalyticsSearchParams): AnalyticsFilters {
  const result = analyticsFilterSchema.safeParse(searchParams)
  return result.success ? result.data : analyticsFilterSchema.parse({})
}

/** Serialises filters back into a query string for links and CSV export. */
export function analyticsFiltersToSearchParams(filters: AnalyticsFilters): URLSearchParams {
  const params = new URLSearchParams()
  params.set('from', filters.from)
  params.set('to', filters.to)
  params.set('bucket', filters.bucket)
  if (filters.eventTypes.length) params.set('types', filters.eventTypes.join(','))
  if (filters.organisationIds.length) params.set('orgs', filters.organisationIds.join(','))
  if (filters.venues.length) params.set('venues', filters.venues.join(','))
  if (filters.statuses.length) params.set('statuses', filters.statuses.join(','))
  return params
}
