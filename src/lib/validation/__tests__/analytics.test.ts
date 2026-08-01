import { describe, expect, it } from 'vitest'

import {
  formatPercent,
  formatNumber,
  toCsv,
  NOT_AVAILABLE,
} from '@/components/coordinator/analytics/format'
import { analyticsFiltersToSearchParams, parseAnalyticsFilters } from '../analytics'

describe('parseAnalyticsFilters', () => {
  it('defaults to archived events over the last twelve months', () => {
    const filters = parseAnalyticsFilters({})
    expect(filters.statuses).toEqual(['archived'])
    expect(filters.bucket).toBe('month')
    expect(filters.from < filters.to).toBe(true)
  })

  it('splits comma-separated multi-value filters', () => {
    const filters = parseAnalyticsFilters({ types: 'workshop,outreach', venues: 'Blk 123' })
    expect(filters.eventTypes).toEqual(['workshop', 'outreach'])
    expect(filters.venues).toEqual(['Blk 123'])
  })

  it('drops organisation ids that are not uuids', () => {
    const filters = parseAnalyticsFilters({
      orgs: '11111111-1111-4111-8111-111111111111,not-an-id',
    })
    expect(filters.organisationIds).toEqual(['11111111-1111-4111-8111-111111111111'])
  })

  it('swaps a reversed date range instead of returning nothing', () => {
    const filters = parseAnalyticsFilters({ from: '2026-06-01', to: '2026-01-01' })
    expect(filters.from).toBe('2026-01-01')
    expect(filters.to).toBe('2026-06-01')
  })

  it('falls back to defaults when a value is malformed', () => {
    const filters = parseAnalyticsFilters({ from: 'last-tuesday', bucket: 'fortnight' })
    expect(filters.bucket).toBe('month')
    expect(filters.from).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('round-trips through search params', () => {
    const filters = parseAnalyticsFilters({ from: '2026-01-01', to: '2026-07-01', bucket: 'quarter' })
    const params = analyticsFiltersToSearchParams(filters)
    expect(parseAnalyticsFilters(Object.fromEntries(params))).toEqual(filters)
  })
})

describe('formatting', () => {
  it('shows "Not available" instead of zero for unreported metrics', () => {
    expect(formatPercent(null)).toBe(NOT_AVAILABLE)
    expect(formatNumber(null)).toBe(NOT_AVAILABLE)
    expect(formatPercent(0)).toBe('0.0%')
    expect(formatNumber(0)).toBe('0')
  })

  it('converts fractions to percentages', () => {
    expect(formatPercent(0.8421)).toBe('84.2%')
    expect(formatPercent(0.8421, 0)).toBe('84%')
  })

  it('escapes commas and quotes in exported CSV', () => {
    const csv = toCsv(
      [
        { key: 'name', label: 'Event' },
        { key: 'count', label: 'Attended' },
      ],
      [{ name: 'Cooking, level 2', count: 12 }, { name: 'The "Big" Day', count: null }],
    )
    expect(csv.split('\n')[1]).toBe('"Cooking, level 2",12')
    expect(csv.split('\n')[2]).toBe('"The ""Big"" Day",')
  })
})
