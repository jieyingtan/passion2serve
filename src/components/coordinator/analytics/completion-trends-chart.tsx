'use client'

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { CompletionTrendRow } from '@/types/analytics'
import { ChartFrame } from './chart-frame'
import {
  CHART_COLORS,
  formatNumber,
  formatPercent,
  formatPeriod,
  tooltipNumber,
  tooltipPercent,
} from './format'

interface Props {
  rows: CompletionTrendRow[]
  bucket: string
}

export function CompletionTrendsChart({ rows, bucket }: Props) {
  const data = rows.map((row) => ({
    ...row,
    period: formatPeriod(row.period_start, bucket),
    completion_percent: row.completion_rate === null ? null : row.completion_rate * 100,
  }))

  const totalCourses = rows.reduce((total, row) => total + row.course_completions, 0)
  const totalEvents = rows.reduce((total, row) => total + row.events_completed, 0)

  return (
    <ChartFrame
      title="Event and course completion"
      description="Completed events, course completions and certificates issued over time."
      textSummary={`${formatNumber(totalEvents)} events closed in this period, producing ${formatNumber(totalCourses)} course completions.`}
      filename="event-and-course-completion"
      columns={[
        { key: 'period', label: 'Period' },
        { key: 'events_completed', label: 'Events completed' },
        { key: 'course_completions', label: 'Course completions' },
        { key: 'certificates_issued', label: 'Certificates' },
        { key: 'participants_completing', label: 'Participants' },
        {
          key: 'completion_rate',
          label: 'Completion rate',
          format: (row) => formatPercent(row.completion_rate as number | null),
        },
      ]}
      rows={data as unknown as Record<string, unknown>[]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="courseCompletionFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_COLORS.outcome} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART_COLORS.outcome} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.35} />
          <XAxis dataKey="period" tickLine={false} axisLine={false} fontSize={12} />
          <YAxis yAxisId="count" tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
          <YAxis
            yAxisId="rate"
            orientation="right"
            domain={[0, 100]}
            unit="%"
            tickLine={false}
            axisLine={false}
            fontSize={12}
          />
          <Tooltip
            formatter={(value, name) =>
              name === 'Completion rate'
                ? [tooltipPercent(value), name]
                : [tooltipNumber(value), name]
            }
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Area
            yAxisId="count"
            type="monotone"
            dataKey="course_completions"
            name="Course completions"
            stroke={CHART_COLORS.outcome}
            strokeWidth={2}
            fill="url(#courseCompletionFill)"
          />
          <Line
            yAxisId="count"
            type="monotone"
            dataKey="certificates_issued"
            name="Certificates issued"
            stroke={CHART_COLORS.commitment}
            strokeWidth={2}
            dot={false}
          />
          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="completion_percent"
            name="Completion rate"
            stroke={CHART_COLORS.context}
            strokeDasharray="4 4"
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
