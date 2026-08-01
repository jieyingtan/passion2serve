# Impact analytics (Archived view)

Implements spec §5.9, the Recharts requirements in §17.7, and the analytics half
of Phase 5. Covers attendance and drop-off, volunteer and business
participation, beneficiary impact, social engagement, and event and course
completion trends.

## What is in this change

| Path | Purpose |
| --- | --- |
| `supabase/migrations/20260801120000_impact_analytics.sql` | Adapter views plus nine analytics RPCs |
| `src/types/analytics.ts` | Return shapes for each RPC |
| `src/lib/validation/analytics.ts` | Zod filter schema and URL serialisation |
| `src/server/repositories/analytics-repository.ts` | Typed RPC calls, numeric normalisation |
| `src/server/services/analytics-service.ts` | Role check, parallel fetch, derived text |
| `src/app/coordinator/analytics/page.tsx` | Server-rendered dashboard |
| `src/app/api/analytics/export/route.ts` | Full report as CSV |
| `src/components/coordinator/analytics/*` | Filter bar, KPI grid, four charts, impact table |

## Applying it

```bash
supabase db push                 # or: supabase migration up
supabase gen types typescript --local > src/types/database.ts
npx shadcn@latest add card button   # only if these are not already installed
```

Recharts and Zod are already in the stack (spec §13). Nothing else is added.

## Adapting to the real schema

Section 1 of the migration is the only place that references table columns.
If a name differs, change the view and every chart follows. The assumed columns:

| View | Assumes |
| --- | --- |
| `events_base` | `events(id, name, event_type, status, starts_at, ends_at, venue, organisation_id, participant_capacity, volunteer_target)` |
| `registrations_base` | `registrations(event_id, participant_id, status)` |
| `attendance_base` | `attendance(event_id, participant_id, scanned_at)` |
| `event_volunteers_base` | `event_volunteers(event_id, volunteer_id, status)` |
| `event_businesses_base` | `event_businesses(event_id, business_id, status)` |
| `certificates_base` | `certificates(event_id, participant_id)` |
| `points_base` | `point_ledger(event_id, points, created_at)` |
| `social_posts_base` | `social_posts(id, event_id, status, published_at\|scheduled_at\|created_at)` |
| `social_metrics_base` | `social_metrics(social_post_id, integration, metric, value, measured_at)` |

Status values are normalised before comparison, so `No-show`, `no_show` and
`NO SHOW` all match. Enum, text and citext columns all work.

## Security

Every view and function is `security invoker`, so Row Level Security decides
which events are aggregated. A Coordinator sees totals for their assigned
organisations only, and no service-role key is involved. The export route
re-checks the session and role because a Route Handler is a public HTTP
boundary, not an extension of the page.

## Metric definitions

Agree these with the programme team before the figures go into a report.

- **Committed registrations** — every registration except invited, ineligible,
  waitlisted and cancelled.
- **Attendance rate** — attendance rows ÷ committed registrations. The
  `attendance` table is the source of truth, not the registration status, so a
  status that was never updated cannot inflate the figure.
- **No-show** — committed registrations with no attendance row.
- **Drop-off rate** — (cancelled + no-show) ÷ (committed + cancelled): of
  everyone who ever signed up, the share who did not attend.
- **Retention** — of the participants reached in this period, those with more
  than one lifetime attendance. Bounded by what RLS lets the Coordinator see.
- **Course completion** — distinct participant/course pairs derived from
  attendance joined to `event_courses`.
- **Social metrics** — provider metrics are cumulative snapshots, so only the
  most recent measurement per post, channel and metric is counted. Summing every
  row would multiply-count the same likes. A metric no platform reported stays
  `null` end to end and renders as "Not available" rather than 0, per §17.5.

## Accessibility

Each chart carries a visible title and description, a screen-reader summary, a
table alternative and a CSV download (§17.7). Filters are native controls with
labels, and the page is keyboard-navigable. Filter state lives in the URL, so a
view can be bookmarked or shared.

## Open items

1. **Participant group filter.** §5.9 lists it, but the spec does not define a
   group. The RPCs take a filter array per dimension, so adding one is a new
   parameter plus a join once "group" is defined (course cohort? beneficiary
   segment? first-time versus returning?). Everything else in §5.9 is filterable
   today.
2. **`points_transactions.event_id`** must exist for points to be attributed to
   an event. If points reference events only through a reward, adjust
   `points_base`.
3. **AI impact summary** (§7) is not included here. It belongs on top of
   `analytics_event_summary` output once this lands.
4. **Multi-select filters.** The bar sends one value per dimension today; the
   RPCs already accept arrays, so upgrading to a multi-select is UI-only work.

## Tests

`src/lib/validation/__tests__/analytics.test.ts` covers filter parsing, the
reversed-range fallback, percentage formatting and CSV escaping. Worth adding
before release: a database test that seeds two events and asserts the summary
figures, and an RLS test asserting a Coordinator cannot aggregate another
organisation's events.
