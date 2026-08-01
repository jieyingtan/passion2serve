/** Shared formatting for the impact dashboard. */

export const NOT_AVAILABLE = 'Not available'

/**
 * Palette for the impact charts. Deliberately kept to five hues so a reader can
 * hold the whole legend in their head: outcome (teal), commitment (indigo),
 * loss (rose), reach (amber), context (slate).
 */
export const CHART_COLORS = {
  outcome: '#12796B',
  commitment: '#3D52D5',
  loss: '#B4436C',
  reach: '#C68A12',
  context: '#7A8699',
  ink: '#16233A',
} as const

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return NOT_AVAILABLE
  return new Intl.NumberFormat('en-SG').format(value)
}

/** Rates arrive as 0–1 fractions. `null` means the source reported nothing. */
export function formatPercent(value: number | null | undefined, fractionDigits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return NOT_AVAILABLE
  return `${(value * 100).toFixed(fractionDigits)}%`
}

export function formatPeriod(iso: string, bucket: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  switch (bucket) {
    case 'day':
      return date.toLocaleDateString('en-SG', { day: '2-digit', month: 'short' })
    case 'week':
      return `Wk of ${date.toLocaleDateString('en-SG', { day: '2-digit', month: 'short' })}`
    case 'quarter':
      return `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`
    case 'year':
      return String(date.getFullYear())
    default:
      return date.toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })
  }
}

export function formatDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleDateString('en-SG', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** Title-cases an integration key such as `instagram_business`. */
export function formatIntegration(value: string): string {
  return value
    .split(/[_\-\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/** Recharts hands tooltips a loose value type; normalise it once here. */
export function tooltipNumber(value: unknown): string {
  if (value === null || value === undefined) return NOT_AVAILABLE
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? formatNumber(parsed) : NOT_AVAILABLE
}

/** Expects a value already scaled to 0–100. */
export function tooltipPercent(value: unknown, fractionDigits = 1): string {
  if (value === null || value === undefined) return NOT_AVAILABLE
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? `${parsed.toFixed(fractionDigits)}%` : NOT_AVAILABLE
}

export function toCsv(columns: { key: string; label: string }[], rows: readonly object[]) {
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return ''
    const text = String(value)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const header = columns.map((column) => escape(column.label)).join(',')
  const body = rows.map((row) =>
    columns.map((column) => escape((row as Record<string, unknown>)[column.key])).join(','),
  )
  return [header, ...body].join('\n')
}
