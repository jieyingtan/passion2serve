import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { BeneficiaryImpactRow } from '@/types/analytics'
import { formatNumber, formatPercent } from './format'

/**
 * Beneficiary impact is a comparison across organisations, so it reads better
 * as a ranked table than as a chart. The bar is a visual aid inside the row
 * rather than a separate figure.
 */
export function BeneficiaryImpactTable({ rows }: { rows: BeneficiaryImpactRow[] }) {
  const maxReach = rows.reduce((max, row) => Math.max(max, row.participants_reached), 0)

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">Beneficiary impact</CardTitle>
        <CardDescription>
          Reach and support delivered for each beneficiary organisation in this period.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            No completed events are linked to a beneficiary organisation yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <caption className="sr-only">
                Beneficiary organisations ranked by the number of participants reached
              </caption>
              <thead className="bg-muted/50">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Organisation
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">
                    Events
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-medium text-muted-foreground">
                    Participants reached
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">
                    Attendance
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">
                    Volunteers
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">
                    Businesses
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">
                    Certificates
                  </th>
                  <th scope="col" className="px-3 py-2 text-right font-medium text-muted-foreground">
                    Courses completed
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.organisation_id ?? row.organisation_name} className="border-t">
                    <th scope="row" className="px-3 py-2 text-left font-medium">
                      {row.organisation_name}
                    </th>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatNumber(row.events_count)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span
                          aria-hidden="true"
                          className="h-2 rounded-full bg-primary/70"
                          style={{
                            width: maxReach
                              ? `${Math.max((row.participants_reached / maxReach) * 100, 2)}%`
                              : '2%',
                            minWidth: '0.5rem',
                            maxWidth: '10rem',
                          }}
                        />
                        <span className="tabular-nums">{formatNumber(row.participants_reached)}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatPercent(row.attendance_rate, 0)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatNumber(row.volunteers_engaged)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatNumber(row.businesses_engaged)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatNumber(row.certificates_issued)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {formatNumber(row.course_completions)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
