'use client'

import { useId, useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toCsv } from './format'

export interface ChartColumn {
  key: string
  label: string
  /** Rendered value for the table and CSV. Defaults to the raw value. */
  format?: (row: Record<string, unknown>) => string
}

interface ChartFrameProps {
  title: string
  description: string
  /** One sentence stating what the chart shows, read by screen readers. */
  textSummary: string
  columns: ChartColumn[]
  rows: Record<string, unknown>[]
  filename: string
  children: ReactNode
  empty?: string
}

/**
 * Every chart on this page ships with a text summary, a table alternative and a
 * download, which is what spec §17.7 requires for accessibility.
 */
export function ChartFrame({
  title,
  description,
  textSummary,
  columns,
  rows,
  filename,
  children,
  empty = 'No data for these filters.',
}: ChartFrameProps) {
  const [showTable, setShowTable] = useState(false)
  const summaryId = useId()
  const hasData = rows.length > 0

  function download() {
    const csv = toCsv(
      columns,
      rows.map((row) => {
        const output: Record<string, unknown> = {}
        for (const column of columns) {
          output[column.key] = column.format ? column.format(row) : row[column.key]
        }
        return output
      }),
    )
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${filename}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch justify-between gap-4 space-y-0 sm:flex-row sm:items-start">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTable((current) => !current)}
            aria-expanded={showTable}
          >
            {showTable ? 'Hide table' : 'View as table'}
          </Button>
          <Button variant="ghost" size="sm" onClick={download} disabled={!hasData}>
            Download CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {hasData ? (
          <>
            <p id={summaryId} className="sr-only">
              {textSummary}
            </p>
            <figure
              role="img"
              aria-labelledby={summaryId}
              className="h-[240px] w-full sm:h-[280px] [&_svg]:overflow-visible"
            >
              {children}
            </figure>

            {showTable ? (
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <caption className="sr-only">{title}</caption>
                  <thead className="bg-muted/50">
                    <tr>
                      {columns.map((column) => (
                        <th
                          key={column.key}
                          scope="col"
                          className="px-3 py-2 text-left font-medium text-muted-foreground"
                        >
                          {column.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row, index) => (
                      <tr key={index} className="border-t">
                        {columns.map((column) => (
                          <td key={column.key} className="px-3 py-2 tabular-nums">
                            {column.format ? column.format(row) : String(row[column.key] ?? '')}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        ) : (
          <p className="py-12 text-center text-sm text-muted-foreground">{empty}</p>
        )}
      </CardContent>
    </Card>
  )
}
