'use client'

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import type { AttendanceTrendRow } from '@/types/analytics'
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
  rows: AttendanceTrendRow[]
  bucket: string
}

export function AttendanceTrendChart({ rows, bucket }: Props) {
  const data = rows.map((row) => ({
    ...row,
    period: formatPeriod(row.period_start, bucket),
    attendance_percent: row.attendance_rate === null ? null : row.attendance_rate * 100,
  }))

  const totalAttended = rows.reduce((total, row) => total + row.attended, 0)
  const totalCommitted = rows.reduce((total, row) => total + row.registrations_committed, 0)

  return (
    <ChartFrame
      title="Attendance and drop-off"
      description="Confirmed registrations against recorded attendance for each period."
      textSummary={`Across ${rows.length} periods, ${formatNumber(totalAttended)} of ${formatNumber(totalCommitted)} confirmed registrations were recorded as attended.`}
      filename="attendance-and-drop-off"
      columns={[
        { key: 'period', label: 'Period' },
        { key: 'events_count', label: 'Events' },
        { key: 'registrations_committed', label: 'Confirmed' },
        { key: 'attended', label: 'Attended' },
        { key: 'no_show', label: 'No-show' },
        { key: 'cancelled', label: 'Cancelled' },
        {
          key: 'attendance_rate',
          label: 'Attendance rate',
          format: (row) => formatPercent(row.attendance_rate as number | null),
        },
        {
          key: 'drop_off_rate',
          label: 'Drop-off rate',
          format: (row) => formatPercent(row.drop_off_rate as number | null),
        },
      ]}
      rows={data as unknown as Record<string, unknown>[]}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
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
              name === 'Attendance rate'
                ? [tooltipPercent(value), name]
                : [tooltipNumber(value), name]
            }
          />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
          <Bar
            yAxisId="count"
            dataKey="attended"
            name="Attended"
            stackId="registrations"
            fill={CHART_COLORS.outcome}
            radius={[0, 0, 0, 0]}
          />
          <Bar
            yAxisId="count"
            dataKey="no_show"
            name="No-show"
            stackId="registrations"
            fill={CHART_COLORS.loss}
            radius={[3, 3, 0, 0]}
          />
          <Bar
            yAxisId="count"
            dataKey="cancelled"
            name="Cancelled"
            fill={CHART_COLORS.context}
            radius={[3, 3, 0, 0]}
          />
          <Line
            yAxisId="rate"
            type="monotone"
            dataKey="attendance_percent"
            name="Attendance rate"
            stroke={CHART_COLORS.ink}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}
