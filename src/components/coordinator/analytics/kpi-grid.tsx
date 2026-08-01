import { Card, CardContent } from '@/components/ui/card'
import type { EventSummaryRow, ParticipationSummaryRow } from '@/types/analytics'
import { formatNumber, formatPercent } from './format'

interface KpiGridProps {
  summary: EventSummaryRow
  participation: ParticipationSummaryRow
}

interface Kpi {
  label: string
  value: string
  detail: string
}

/** Server component: no interactivity, so it stays out of the client bundle. */
export function KpiGrid({ summary, participation }: KpiGridProps) {
  const kpis: Kpi[] = [
    {
      label: 'Completed events',
      value: formatNumber(summary.events_count),
      detail: `${formatNumber(summary.registrations_committed)} confirmed registrations`,
    },
    {
      label: 'Attendance rate',
      value: formatPercent(summary.attendance_rate),
      detail: `${formatNumber(summary.attended_total)} attended · ${formatNumber(summary.no_show_total)} no-show`,
    },
    {
      label: 'Drop-off rate',
      value: formatPercent(summary.drop_off_rate),
      detail: `${formatNumber(summary.cancelled_total)} cancelled before the event`,
    },
    {
      label: 'Participants reached',
      value: formatNumber(summary.participants_reached),
      detail: `${formatNumber(summary.returning_participants)} returning · ${formatPercent(summary.retention_rate, 0)} retention`,
    },
    {
      label: 'Volunteers confirmed',
      value: formatNumber(participation.volunteers_confirmed),
      detail: `${formatPercent(participation.volunteer_fill_rate, 0)} of a ${formatNumber(participation.volunteer_target_total)} target`,
    },
    {
      label: 'Businesses confirmed',
      value: formatNumber(participation.businesses_confirmed),
      detail: `${formatPercent(participation.business_confirmation_rate, 0)} of ${formatNumber(participation.businesses_selected)} approached`,
    },
    {
      label: 'Certificates issued',
      value: formatNumber(summary.certificates_issued),
      detail: `${formatNumber(summary.course_completions)} course completions`,
    },
    {
      label: 'Points awarded',
      value: formatNumber(summary.points_awarded),
      detail: `${formatNumber(summary.rewards_redeemed)} rewards redeemed`,
    },
  ]

  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label}>
          <CardContent className="space-y-1 p-4">
            <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {kpi.label}
            </dt>
            <dd className="text-2xl font-semibold tabular-nums">{kpi.value}</dd>
            <p className="text-xs text-muted-foreground">{kpi.detail}</p>
          </CardContent>
        </Card>
      ))}
    </dl>
  )
}
