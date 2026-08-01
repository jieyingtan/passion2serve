'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useTransition, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import { analyticsFiltersToSearchParams } from '@/lib/validation/analytics'
import type { AnalyticsFilters, FilterOptionRow } from '@/types/analytics'

interface Props {
  filters: AnalyticsFilters
  options: {
    eventTypes: FilterOptionRow[]
    venues: FilterOptionRow[]
    organisations: FilterOptionRow[]
  }
}

const FIELD_CLASS =
  'h-11 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm sm:h-10 ' +
  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50'

const LABEL_CLASS = 'text-xs font-medium text-muted-foreground'

/**
 * Native selects keep this bar dependency-free and keyboard-friendly on mobile.
 * Filters live in the URL so a Coordinator can bookmark or share a view.
 */
export function AnalyticsFilters({ filters, options }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [isPending, startTransition] = useTransition()

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const params = new URLSearchParams()

    const set = (key: string, value: FormDataEntryValue | null) => {
      if (typeof value === 'string' && value.length > 0) params.set(key, value)
    }

    set('from', form.get('from'))
    set('to', form.get('to'))
    set('bucket', form.get('bucket'))
    set('types', form.get('types'))
    set('orgs', form.get('orgs'))
    set('venues', form.get('venues'))
    set('statuses', form.get('statuses'))

    startTransition(() => router.push(`${pathname}?${params.toString()}`))
  }

  function reset() {
    startTransition(() => router.push(pathname))
  }

  const exportHref = `/api/analytics/export?${analyticsFiltersToSearchParams(filters).toString()}`

  return (
    <form
      onSubmit={apply}
      aria-label="Filter archived analytics"
      className="grid grid-cols-1 gap-3 rounded-lg border bg-card p-4 min-[520px]:grid-cols-2 md:grid-cols-4 lg:grid-cols-7"
    >
      <div className="space-y-1">
        <label className={LABEL_CLASS} htmlFor="from">
          From
        </label>
        <input id="from" name="from" type="date" defaultValue={filters.from} className={FIELD_CLASS} />
      </div>

      <div className="space-y-1">
        <label className={LABEL_CLASS} htmlFor="to">
          To
        </label>
        <input id="to" name="to" type="date" defaultValue={filters.to} className={FIELD_CLASS} />
      </div>

      <div className="space-y-1">
        <label className={LABEL_CLASS} htmlFor="bucket">
          Group by
        </label>
        <select id="bucket" name="bucket" defaultValue={filters.bucket} className={FIELD_CLASS}>
          <option value="day">Day</option>
          <option value="week">Week</option>
          <option value="month">Month</option>
          <option value="quarter">Quarter</option>
          <option value="year">Year</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className={LABEL_CLASS} htmlFor="types">
          Event type
        </label>
        <select id="types" name="types" defaultValue={filters.eventTypes[0] ?? ''} className={FIELD_CLASS}>
          <option value="">All types</option>
          {options.eventTypes.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className={LABEL_CLASS} htmlFor="orgs">
          Organisation
        </label>
        <select
          id="orgs"
          name="orgs"
          defaultValue={filters.organisationIds[0] ?? ''}
          className={FIELD_CLASS}
        >
          <option value="">All organisations</option>
          {options.organisations.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className={LABEL_CLASS} htmlFor="venues">
          Venue
        </label>
        <select id="venues" name="venues" defaultValue={filters.venues[0] ?? ''} className={FIELD_CLASS}>
          <option value="">All venues</option>
          {options.venues.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1">
        <label className={LABEL_CLASS} htmlFor="statuses">
          Stage
        </label>
        <select
          id="statuses"
          name="statuses"
          defaultValue={filters.statuses.join(',')}
          className={FIELD_CLASS}
        >
          <option value="archived">Archived only</option>
          <option value="archived,awaiting_closure">Archived and awaiting closure</option>
        </select>
      </div>

      <div className="grid grid-cols-2 items-end gap-2 min-[520px]:col-span-2 sm:flex md:col-span-4 lg:col-span-7">
        <Button className="w-full sm:w-auto" type="submit" disabled={isPending}>
          {isPending ? 'Updating…' : 'Apply filters'}
        </Button>
        <Button className="w-full sm:w-auto" type="button" variant="ghost" onClick={reset} disabled={isPending}>
          Reset
        </Button>
        <Button asChild variant="outline" className="col-span-2 w-full sm:ml-auto sm:w-auto">
          <a href={exportHref} download>
            Download full report
          </a>
        </Button>
      </div>
    </form>
  )
}
