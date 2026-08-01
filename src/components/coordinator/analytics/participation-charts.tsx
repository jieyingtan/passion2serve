'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { ParticipationByEventRow, ParticipationSummaryRow } from '@/types/analytics'
import { ChartFrame } from './chart-frame'
import { CHART_COLORS, formatDate, formatNumber, formatPercent, tooltipNumber } from './format'

export function VolunteerParticipationChart({
  rows,
  summary,
}: {
  rows: ParticipationByEventRow[]
  summary: ParticipationSummaryRow
}) {
  const data = [...rows]
    .reverse()
    .map((row) => ({
      ...row,
      label: row.event_name.length > 22 ? `${row.event_name.slice(0, 21)}…` : row.event_name,
      volunteer_target: row.volunteer_target ?? 0,
    }))

  return (
    <ChartFrame
      title="Volunteer participation"
      description="Recruitment target, confirmed volunteers and volunteers who attended, per event."
      textSummary={`${formatNumber(summary.volunteers_confirmed)} volunteers were confirmed against a combined target of ${formatNumber(summary.volunteer_target_total)}, and ${formatNumber(summary.volunteers_attended)} attended.`}
      filename="volunteer-participation"
      columns={[
        { key: 'event_name', label: 'Event' },
        { key: 'starts_at', label: 'Date', format: (row) => formatDate(row.starts_at as string) },
        { key: 'volunteer_target', label: 'Target' },
        { key: 'volunteers_confirmed', label: 'Confirmed' },
        { key: 'volunteers_attended', label: 'Attended' },
      ]}
      rows={data as unknown as Record<string, unknown>[]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.35} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={11} interval={0} angle={-20} textAnchor="end" height={56} />
          <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
          <Tooltip formatter={(value) => tooltipNumber(value)} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="volunteer_target" name="Target" fill={CHART_COLORS.context} radius={[3, 3, 0, 0]} />
          <Bar dataKey="volunteers_confirmed" name="Confirmed" fill={CHART_COLORS.commitment} radius={[3, 3, 0, 0]} />
          <Bar dataKey="volunteers_attended" name="Attended" fill={CHART_COLORS.outcome} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

export function BusinessFunnelChart({ summary }: { summary: ParticipationSummaryRow }) {
  const data = [
    { stage: 'Selected', count: summary.businesses_selected, fill: CHART_COLORS.context },
    { stage: 'Contacted', count: summary.businesses_contacted, fill: CHART_COLORS.commitment },
    { stage: 'Responded', count: summary.businesses_confirmed + summary.businesses_declined, fill: CHART_COLORS.reach },
    { stage: 'Confirmed', count: summary.businesses_confirmed, fill: CHART_COLORS.outcome },
  ]

  return (
    <ChartFrame
      title="Business outreach conversion"
      description="How many approached businesses reached each stage of outreach."
      textSummary={`${formatNumber(summary.businesses_confirmed)} of ${formatNumber(summary.businesses_selected)} approached businesses confirmed, a ${formatPercent(summary.business_confirmation_rate, 0)} confirmation rate.`}
      filename="business-outreach-conversion"
      columns={[
        { key: 'stage', label: 'Stage' },
        { key: 'count', label: 'Businesses' },
      ]}
      rows={summary.businesses_selected > 0 ? (data as unknown as Record<string, unknown>[]) : []}
      empty="No businesses were approached for events in this period."
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 24, bottom: 0, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.35} />
          <XAxis type="number" tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
          <YAxis type="category" dataKey="stage" tickLine={false} axisLine={false} fontSize={12} width={80} />
          <Tooltip formatter={(value) => [tooltipNumber(value), 'Businesses'] as [string, string]} />
          <Bar dataKey="count" name="Businesses" radius={[0, 3, 3, 0]}>
            {data.map((entry) => (
              <Cell key={entry.stage} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
