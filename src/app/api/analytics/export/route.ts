import { NextResponse, type NextRequest } from 'next/server'

import { toCsv } from '@/components/coordinator/analytics/format'
import { parseAnalyticsFilters } from '@/lib/validation/analytics'
import { assertCoordinator, getImpactAnalytics } from '@/server/services/analytics-service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/analytics/export
 *
 * Returns the whole archived-analytics report as a single CSV with one section
 * per panel. Authorisation is re-checked here: a Route Handler is a public HTTP
 * boundary, not an extension of the page (spec §19).
 */
export async function GET(request: NextRequest) {
  const { user, isCoordinator } = await assertCoordinator()

  if (!user) {
    return NextResponse.json({ error: 'Sign in to export analytics.' }, { status: 401 })
  }
  if (!isCoordinator) {
    return NextResponse.json({ error: 'Coordinator access is required.' }, { status: 403 })
  }

  const filters = parseAnalyticsFilters(Object.fromEntries(request.nextUrl.searchParams))

  try {
    const analytics = await getImpactAnalytics(filters)
    const sections: string[] = []

    sections.push(
      `Impact analytics,${filters.from} to ${filters.to},grouped by ${filters.bucket},stages: ${filters.statuses.join(' ')}`,
    )

    sections.push(
      section(
        'Summary',
        Object.entries(analytics.summary).map(([metric, value]) => ({
          metric,
          value: value ?? 'Not available',
        })),
        [
          { key: 'metric', label: 'Metric' },
          { key: 'value', label: 'Value' },
        ],
      ),
    )

    sections.push(
      section('Attendance and drop-off', analytics.attendanceTrend, [
        { key: 'period_start', label: 'Period' },
        { key: 'events_count', label: 'Events' },
        { key: 'registrations_committed', label: 'Confirmed registrations' },
        { key: 'attended', label: 'Attended' },
        { key: 'no_show', label: 'No-show' },
        { key: 'cancelled', label: 'Cancelled' },
        { key: 'attendance_rate', label: 'Attendance rate' },
        { key: 'drop_off_rate', label: 'Drop-off rate' },
      ]),
    )

    sections.push(
      section('Volunteer and business participation', analytics.participationByEvent, [
        { key: 'event_name', label: 'Event' },
        { key: 'starts_at', label: 'Date' },
        { key: 'volunteer_target', label: 'Volunteer target' },
        { key: 'volunteers_confirmed', label: 'Volunteers confirmed' },
        { key: 'volunteers_attended', label: 'Volunteers attended' },
        { key: 'businesses_selected', label: 'Businesses approached' },
        { key: 'businesses_confirmed', label: 'Businesses confirmed' },
      ]),
    )

    sections.push(
      section('Beneficiary impact', analytics.beneficiaries, [
        { key: 'organisation_name', label: 'Organisation' },
        { key: 'events_count', label: 'Events' },
        { key: 'participants_reached', label: 'Participants reached' },
        { key: 'attended_total', label: 'Attendances' },
        { key: 'attendance_rate', label: 'Attendance rate' },
        { key: 'volunteers_engaged', label: 'Volunteers' },
        { key: 'businesses_engaged', label: 'Businesses' },
        { key: 'certificates_issued', label: 'Certificates' },
      ]),
    )

    const filename = `impact-analytics-${filters.from}-to-${filters.to}.csv`

    return new NextResponse(sections.join('\n\n'), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    console.error('Analytics export failed', error)
    return NextResponse.json(
      { error: 'The report could not be generated. Try again in a moment.' },
      { status: 500 },
    )
  }
}

function section(
  title: string,
  rows: readonly object[],
  columns: { key: string; label: string }[],
): string {
  const normalised = rows.map((row) => {
    const output: Record<string, unknown> = {}
    for (const column of columns) {
      const value = (row as Record<string, unknown>)[column.key]
      output[column.key] = value === null || value === undefined ? 'Not available' : value
    }
    return output
  })
  return [title, toCsv(columns, normalised)].join('\n')
}
