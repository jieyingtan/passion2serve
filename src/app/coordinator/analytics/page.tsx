import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { AnalyticsFilters } from '@/components/coordinator/analytics/analytics-filters'
import { PageHeader } from '@/components/page-header'
import { AttendanceTrendChart } from '@/components/coordinator/analytics/attendance-trend-chart'
import { BeneficiaryImpactTable } from '@/components/coordinator/analytics/beneficiary-impact-table'
import { CompletionTrendsChart } from '@/components/coordinator/analytics/completion-trends-chart'
import { KpiGrid } from '@/components/coordinator/analytics/kpi-grid'
import {
  BusinessFunnelChart,
  VolunteerParticipationChart,
} from '@/components/coordinator/analytics/participation-charts'
import { SocialEngagementChart } from '@/components/coordinator/analytics/social-engagement-chart'
import { formatDate } from '@/components/coordinator/analytics/format'
import { parseAnalyticsFilters } from '@/lib/validation/analytics'
import {
  assertCoordinator,
  describeImpact,
  getAnalyticsFilterOptions,
  getEmptyImpactAnalytics,
  getImpactAnalytics,
} from '@/server/services/analytics-service'

export const metadata: Metadata = {
  title: 'Impact analytics',
  description: 'Attendance, participation, beneficiary impact and engagement across archived events.',
}

// Aggregates change whenever an event closes, so never serve a cached page.
export const dynamic = 'force-dynamic'

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AnalyticsPage({ searchParams }: PageProps) {
  const { user, isCoordinator } = await assertCoordinator()

  if (!user) redirect('/login')
  if (!isCoordinator) redirect('/participant/events')

  const filters = parseAnalyticsFilters(await searchParams)
  let loadError = false
  const [analytics, options] = await Promise.all([
    getImpactAnalytics(filters).catch((error: unknown) => {
      loadError = true
      console.error('Impact analytics could not be loaded.', error)
      return getEmptyImpactAnalytics(filters)
    }),
    getAnalyticsFilterOptions().catch((error: unknown) => {
      loadError = true
      console.error('Impact analytics filters could not be loaded.', error)
      return { eventTypes: [], venues: [], organisations: [] }
    }),
  ])

  const hasEvents = analytics.summary.events_count > 0

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader eyebrow="Archived event reporting" title="Impact analytics" description={<>Archived events from {formatDate(filters.from)} to {formatDate(filters.to)} · {loadError ? 'Analytics data unavailable.' : describeImpact(analytics)}</>} />

      <AnalyticsFilters filters={filters} options={options} />

      {loadError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-amber-950">
          <h2 className="font-medium">Impact analytics are temporarily unavailable</h2>
          <p className="mt-1 max-w-2xl text-sm">
            The dashboard could not reach its analytics database functions. The rest of the
            coordinator workspace is still available; try this page again after the database update
            has been applied.
          </p>
        </div>
      ) : hasEvents ? (
        <div className="space-y-6">
          <KpiGrid summary={analytics.summary} participation={analytics.participation} />

          <section aria-labelledby="attendance-heading" className="space-y-4">
            <h2 id="attendance-heading" className="text-lg font-medium">
              Attendance and drop-off
            </h2>
            <AttendanceTrendChart rows={analytics.attendanceTrend} bucket={filters.bucket} />
          </section>

          <section aria-labelledby="participation-heading" className="space-y-4">
            <h2 id="participation-heading" className="text-lg font-medium">
              Volunteer and business participation
            </h2>
            <div className="grid gap-4 xl:grid-cols-2">
              <VolunteerParticipationChart
                rows={analytics.participationByEvent}
                summary={analytics.participation}
              />
              <BusinessFunnelChart summary={analytics.participation} />
            </div>
          </section>

          <section aria-labelledby="beneficiary-heading" className="space-y-4">
            <h2 id="beneficiary-heading" className="text-lg font-medium">
              Beneficiary impact
            </h2>
            <BeneficiaryImpactTable rows={analytics.beneficiaries} />
          </section>

          <section aria-labelledby="social-heading" className="space-y-4">
            <h2 id="social-heading" className="text-lg font-medium">
              Social media engagement
            </h2>
            <SocialEngagementChart
              trend={analytics.socialTrend}
              totals={analytics.socialTotals}
              bucket={filters.bucket}
            />
          </section>

          <section aria-labelledby="completion-heading" className="space-y-4">
            <h2 id="completion-heading" className="text-lg font-medium">
              Event and course completion
            </h2>
            <CompletionTrendsChart rows={analytics.completionTrend} bucket={filters.bucket} />
          </section>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed p-8 text-center sm:p-12">
          <h2 className="text-base font-medium">No archived events in this range</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Analytics appear once an event is closed and moved to Archived. Widen the date range, or
            finish closure for an event that is awaiting closure.
          </p>
        </div>
      )}
    </div>
  )
}
