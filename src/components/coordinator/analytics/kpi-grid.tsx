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
  const certificateRate = summary.attended_total > 0
    ? summary.certificates_issued / summary.attended_total
    : null
  const averagePoints = summary.participants_reached > 0
    ? summary.points_awarded / summary.participants_reached
    : null
  const kpis: Kpi[] = [
    {
      label: 'Events delivered',
      value: formatNumber(summary.events_count),
      detail: `${formatNumber(summary.registrations_committed)} confirmed registrations`,
    },
    {
      label: 'Participant participation rate',
      value: formatPercent(summary.attendance_rate),
      detail: `${formatNumber(summary.attended_total)} of ${formatNumber(summary.registrations_committed)} confirmed participants attended`,
    },
    {
      label: 'Registration drop-off rate',
      value: formatPercent(summary.drop_off_rate),
      detail: `${formatNumber(summary.cancelled_total)} cancelled · ${formatNumber(summary.no_show_total)} did not attend`,
    },
    {
      label: 'Participant retention rate',
      value: formatPercent(summary.retention_rate, 0),
      detail: `${formatNumber(summary.returning_participants)} of ${formatNumber(summary.participants_reached)} participants returned`,
    },
    {
      label: 'Volunteer target achieved',
      value: formatPercent(participation.volunteer_fill_rate, 0),
      detail: `${formatNumber(participation.volunteers_confirmed)} confirmed against a target of ${formatNumber(participation.volunteer_target_total)}`,
    },
    {
      label: 'Business participation rate',
      value: formatPercent(participation.business_confirmation_rate, 0),
      detail: `${formatNumber(participation.businesses_confirmed)} of ${formatNumber(participation.businesses_selected)} approached businesses confirmed`,
    },
    {
      label: 'Certificate coverage',
      value: formatPercent(certificateRate, 0),
      detail: `${formatNumber(summary.certificates_issued)} certificates for ${formatNumber(summary.attended_total)} attendees`,
    },
    {
      label: 'Average points earned',
      value: averagePoints === null ? 'Not available' : formatNumber(Math.round(averagePoints)),
      detail: `${formatNumber(summary.points_awarded)} total points · ${formatNumber(summary.rewards_redeemed)} rewards redeemed`,
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
