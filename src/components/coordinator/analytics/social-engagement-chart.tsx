'use client'

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { SocialTotalsRow, SocialTrendRow } from '@/types/analytics'
import { ChartFrame } from './chart-frame'
import {
  CHART_COLORS,
  NOT_AVAILABLE,
  formatIntegration,
  formatNumber,
  formatPeriod,
  tooltipNumber,
} from './format'

const METRICS = [
  { key: 'likes', label: 'Likes', color: CHART_COLORS.commitment },
  { key: 'shares', label: 'Shares', color: CHART_COLORS.outcome },
  { key: 'impressions', label: 'Impressions', color: CHART_COLORS.reach },
  { key: 'reach', label: 'Reach', color: CHART_COLORS.loss },
] as const

interface Props {
  trend: SocialTrendRow[]
  totals: SocialTotalsRow[]
  bucket: string
}

/**
 * Platforms report different metrics. A metric the provider never returned stays
 * null all the way from SQL to here, and is shown as "Not available" rather than
 * being flattened to zero (spec §17.5).
 */
export function SocialEngagementChart({ trend, totals, bucket }: Props) {
  const data = trend.map((row) => ({ ...row, period: formatPeriod(row.period_start, bucket) }))

  const reported = METRICS.filter((metric) =>
    trend.some((row) => row[metric.key] !== null && row[metric.key] !== undefined),
  )
  const unreported = METRICS.filter((metric) => !reported.includes(metric))
  const totalPosts = trend.reduce((total, row) => total + row.posts_count, 0)

  return (
    <div className="space-y-4">
      <ChartFrame
        title="Social engagement"
        description="Latest reported engagement for publicity posts, grouped by the period they were published."
        textSummary={
          reported.length === 0
            ? 'No connected platform has reported engagement metrics for these posts.'
            : `${formatNumber(totalPosts)} published posts reported ${reported.map((metric) => metric.label.toLowerCase()).join(', ')}.`
        }
        filename="social-engagement"
        columns={[
          { key: 'period', label: 'Period' },
          { key: 'posts_count', label: 'Posts' },
          ...METRICS.map((metric) => ({
            key: metric.key,
            label: metric.label,
            format: (row: Record<string, unknown>) => {
              const value = row[metric.key]
              return value === null || value === undefined
                ? NOT_AVAILABLE
                : formatNumber(value as number)
            },
          })),
        ]}
        rows={data as unknown as Record<string, unknown>[]}
        empty="No engagement metrics have been synchronised for these events."
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.35} />
            <XAxis dataKey="period" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
            <Tooltip formatter={(value, name) => [tooltipNumber(value), name]} />
            <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
            {reported.map((metric) => (
              <Line
                key={metric.key}
                type="monotone"
                dataKey={metric.key}
                name={metric.label}
                stroke={metric.color}
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>

      {unreported.length > 0 && trend.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          Not reported by the connected platforms:{' '}
          {unreported.map((metric) => metric.label.toLowerCase()).join(', ')}.
        </p>
      ) : null}

      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-base">Engagement by platform</CardTitle>
          <CardDescription>
            Latest synchronised figures for each connected channel.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {totals.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No connected channel has returned metrics for these events.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <caption className="sr-only">Engagement metrics for each connected channel</caption>
                <thead className="bg-muted/50">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">
                      Channel
                    </th>
                    <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">
                      Posts
                    </th>
                    {METRICS.map((metric) => (
                      <th
                        key={metric.key}
                        scope="col"
                        className="px-3 py-2 text-right font-medium text-muted-foreground"
                      >
                        {metric.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {totals.map((row) => (
                    <tr key={row.integration} className="border-t">
                      <th scope="row" className="px-3 py-2 text-left font-medium">
                        {formatIntegration(row.integration)}
                      </th>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {formatNumber(row.posts_count)}
                      </td>
                      {METRICS.map((metric) => (
                        <td key={metric.key} className="px-3 py-2 text-right tabular-nums">
                          {row[metric.key] === null ? (
                            <span className="text-muted-foreground">{NOT_AVAILABLE}</span>
                          ) : (
                            formatNumber(row[metric.key])
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
