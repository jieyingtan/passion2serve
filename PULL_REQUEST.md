# How to get this onto your branch

Unzip the contents into the repository root. The folder structure already
matches the layout in spec §15, so files land in the right place.

```bash
git checkout -b feat/impact-analytics       # or: git checkout your-existing-branch
unzip ~/Downloads/impact-analytics.zip -d .
git add supabase/migrations src docs
git commit -m "feat(analytics): archived event impact dashboard"
git push -u origin feat/impact-analytics
```

Then open the pull request on GitHub and paste the description below. Once CI is
green and the migration has been reviewed, merge into `main` — per spec §22 the
merge triggers the production deploy, so run the migration before the page is
reachable.

---

## feat(analytics): archived event impact dashboard

Implements the Archived view analytics from spec §5.9 and the chart
requirements in §17.7.

### What this adds

- **Attendance and drop-off** — confirmed registrations against recorded
  attendance per period, with no-show and cancellation split out.
- **Volunteer and business participation** — target versus confirmed versus
  attended per event, and a business outreach conversion funnel.
- **Beneficiary impact** — reach, attendance, volunteers, businesses,
  certificates and course completions ranked by organisation.
- **Social media engagement** — likes, shares, impressions and reach over time
  plus per-channel totals.
- **Event and course completion trends** — closures, course completions,
  certificates and completion rate over time.
- Filters for date range, grouping, event type, organisation, venue and stage,
  all held in the URL. Full report exports as CSV.

### How it works

Nine `security invoker` Postgres functions do the aggregation, so Row Level
Security decides which events each Coordinator can see and no service-role key
is used. Section 1 of the migration is a thin adapter view layer — the only
place that touches real column names — so a schema difference is a one-line fix
rather than a rewrite. The page is a Server Component; only the charts and the
filter bar ship to the browser.

Two correctness details worth reviewing:

- Attendance comes from the `attendance` table rather than registration status,
  so a stale status cannot inflate the numbers.
- Social metrics are cumulative snapshots, so only the latest measurement per
  post, channel and metric is summed. Metrics a platform never reported stay
  `null` and render as "Not available" instead of 0 (§17.5).

### Checks

- [x] `tsc --noEmit` clean under strict mode
- [x] Unit tests for filter parsing, formatting and CSV escaping
- [x] Charts have a title, legend, tooltip, screen-reader summary, table
      alternative and CSV download (§17.7)
- [ ] `supabase db push` run against preview
- [ ] Verify the adapter views against the live schema (see
      `docs/impact-analytics.md`)
- [ ] Regenerate database types after the migration

### Follow-ups

The "participant group" filter in §5.9 is not implemented — the spec does not
define what a group is. The RPCs already take arrays per filter dimension, so it
is a parameter plus a join once that is settled. The AI impact summary (§7) sits
naturally on top of `analytics_event_summary` and is not in this change.
