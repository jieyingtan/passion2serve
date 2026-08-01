-- =============================================================================
-- Impact analytics for archived events (spec §5.9, §17.7)
--
-- Design notes
--  * All aggregation happens in SQL so the browser never receives row-level
--    participant data (spec §14.1).
--  * Every view and function is SECURITY INVOKER, so Row Level Security decides
--    which events a Coordinator can aggregate. No service-role key is needed
--    and coordinator_assignments scoping is inherited automatically (§16.4).
--  * Section 1 is the only place that touches real table column names. If your
--    schema uses different names, edit the adapter views and nothing else.
--  * Requires PostgreSQL 15+ for `security_invoker` views (Supabase default).
-- =============================================================================

create schema if not exists analytics;
grant usage on schema analytics to authenticated, service_role;

-- =============================================================================
-- 1. Adapter layer — the only place that references public table columns
-- =============================================================================

create or replace view analytics.events_base with (security_invoker = on) as
select
  e.id                    as id,
  e.name                  as name,
  e.type                  as event_type,
  e.status::text          as status,
  e.starts_at             as starts_at,
  e.ends_at               as ends_at,
  e.venue                 as venue,
  e.organisation_id       as organisation_id,
  e.participant_capacity  as capacity,
  e.volunteer_target      as volunteer_target
from public.events e;

create or replace view analytics.organisations_base with (security_invoker = on) as
select o.id as id, o.name as name
from public.beneficiary_organisations o;

create or replace view analytics.registrations_base with (security_invoker = on) as
select r.event_id as event_id, r.participant_id as participant_id, r.status::text as status
from public.registrations r;

create or replace view analytics.attendance_base with (security_invoker = on) as
select a.event_id as event_id, a.participant_id as participant_id, a.scanned_at as scanned_at
from public.attendance a;

create or replace view analytics.event_volunteers_base with (security_invoker = on) as
select
  ev.event_id           as event_id,
  ev.volunteer_id       as volunteer_id,
  ev.assignment_status::text as assignment_status,
  ev.attendance_status::text as attendance_status
from public.event_volunteers ev;

create or replace view analytics.event_businesses_base with (security_invoker = on) as
select eb.event_id as event_id, eb.business_id as business_id, eb.outreach_status::text as outreach_status
from public.event_businesses eb;

create or replace view analytics.event_courses_base with (security_invoker = on) as
select ec.event_id as event_id, ec.course_id as course_id
from public.event_courses ec;

create or replace view analytics.certificates_base with (security_invoker = on) as
select c.event_id as event_id, c.participant_id as participant_id
from public.certificates c;

create or replace view analytics.points_base with (security_invoker = on) as
select pt.event_id as event_id, pt.amount as amount, pt.created_at as created_at
from public.points_transactions pt;

create or replace view analytics.redemptions_base with (security_invoker = on) as
select r.id as id, r.status::text as status, r.created_at as created_at
from public.redemptions r;

create or replace view analytics.social_posts_base with (security_invoker = on) as
select
  sp.id           as id,
  sp.event_id     as event_id,
  sp.status::text as status,
  coalesce(sp.published_at, sp.scheduled_at, sp.created_at) as published_at
from public.social_posts sp;

create or replace view analytics.social_metrics_base with (security_invoker = on) as
select
  sm.social_post_id as post_id,
  sm.integration    as integration,
  sm.metric         as metric,
  sm.value          as value,
  sm.measured_at    as measured_at
from public.social_metrics sm;

-- =============================================================================
-- 2. Helpers
-- =============================================================================

-- 'No-show' / 'Awaiting Response' -> 'no_show' / 'awaiting_response'
create or replace function analytics.norm(p_value text)
returns text
language sql immutable strict
set search_path = pg_catalog, pg_temp
as $$
  select btrim(regexp_replace(lower(p_value), '[^a-z0-9]+', '_', 'g'), '_');
$$;

-- Null (not zero) when the denominator is missing, so the UI can show
-- "Not available" rather than a misleading 0% (spec §17.5).
create or replace function analytics.rate(p_numerator numeric, p_denominator numeric)
returns numeric
language sql immutable
set search_path = pg_catalog, pg_temp
as $$
  select case
    when p_denominator is null or p_denominator = 0 then null
    else round(coalesce(p_numerator, 0) / p_denominator, 4)
  end;
$$;

-- Provider metric names differ per platform; fold them into stable keys.
create or replace function analytics.metric_key(p_metric text)
returns text
language sql immutable strict
set search_path = analytics, pg_catalog, pg_temp
as $$
  select case analytics.norm(p_metric)
    when 'like' then 'likes'
    when 'likes' then 'likes'
    when 'favourites' then 'likes'
    when 'favorites' then 'likes'
    when 'reactions' then 'likes'
    when 'share' then 'shares'
    when 'shares' then 'shares'
    when 'reposts' then 'shares'
    when 'retweets' then 'shares'
    when 'comment' then 'comments'
    when 'comments' then 'comments'
    when 'replies' then 'comments'
    when 'impression' then 'impressions'
    when 'impressions' then 'impressions'
    when 'views' then 'impressions'
    when 'reach' then 'reach'
    when 'unique_reach' then 'reach'
    else analytics.norm(p_metric)
  end;
$$;

create or replace function analytics.bucket_unit(p_bucket text)
returns text
language sql immutable
set search_path = pg_catalog, pg_temp
as $$
  select case lower(coalesce(p_bucket, 'month'))
    when 'day' then 'day'
    when 'week' then 'week'
    when 'quarter' then 'quarter'
    when 'year' then 'year'
    else 'month'
  end;
$$;

-- Shared event filter. Every public function funnels through this so the
-- filter semantics can never drift between charts.
create or replace function analytics.filtered_events(
  p_from timestamptz,
  p_to timestamptz,
  p_event_types text[],
  p_organisation_ids uuid[],
  p_venues text[],
  p_statuses text[]
)
returns table (
  id uuid,
  name text,
  event_type text,
  status text,
  starts_at timestamptz,
  ends_at timestamptz,
  venue text,
  organisation_id uuid,
  capacity integer,
  volunteer_target integer
)
language sql stable security invoker
set search_path = analytics, public, pg_temp
as $$
  select
    e.id,
    e.name,
    e.event_type,
    analytics.norm(e.status) as status,
    e.starts_at,
    e.ends_at,
    e.venue,
    e.organisation_id,
    e.capacity,
    e.volunteer_target
  from analytics.events_base e
  where (p_from is null or e.starts_at >= p_from)
    and (p_to is null or e.starts_at < p_to)
    and (p_event_types is null or cardinality(p_event_types) = 0
         or e.event_type = any (p_event_types))
    and (p_organisation_ids is null or cardinality(p_organisation_ids) = 0
         or e.organisation_id = any (p_organisation_ids))
    and (p_venues is null or cardinality(p_venues) = 0
         or e.venue = any (p_venues))
    and (p_statuses is null or cardinality(p_statuses) = 0
         or analytics.norm(e.status) = any (
              select analytics.norm(s) from unnest(p_statuses) as s
            ));
$$;

-- Latest snapshot per post/integration/metric. Social metrics are cumulative
-- samples, so summing every row would multiply-count the same likes.
create or replace function analytics.latest_social_metrics(
  p_from timestamptz,
  p_to timestamptz,
  p_event_types text[],
  p_organisation_ids uuid[],
  p_venues text[],
  p_statuses text[]
)
returns table (
  post_id uuid,
  event_id uuid,
  integration text,
  metric_key text,
  value numeric,
  published_at timestamptz
)
language sql stable security invoker
set search_path = analytics, public, pg_temp
as $$
  select distinct on (m.post_id, m.integration, analytics.metric_key(m.metric))
    m.post_id,
    p.event_id,
    m.integration,
    analytics.metric_key(m.metric) as metric_key,
    m.value,
    p.published_at
  from analytics.social_metrics_base m
  join analytics.social_posts_base p on p.id = m.post_id
  join analytics.filtered_events(
         p_from, p_to, p_event_types, p_organisation_ids, p_venues, p_statuses
       ) e on e.id = p.event_id
  order by m.post_id, m.integration, analytics.metric_key(m.metric), m.measured_at desc;
$$;

-- =============================================================================
-- 3. Headline summary
-- =============================================================================

create or replace function public.analytics_event_summary(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_event_types text[] default null,
  p_organisation_ids uuid[] default null,
  p_venues text[] default null,
  p_statuses text[] default array['archived']
)
returns table (
  events_count bigint,
  registrations_total bigint,
  registrations_committed bigint,
  waitlisted_total bigint,
  cancelled_total bigint,
  attended_total bigint,
  no_show_total bigint,
  participants_reached bigint,
  attendance_rate numeric,
  no_show_rate numeric,
  drop_off_rate numeric,
  cancellation_rate numeric,
  capacity_total bigint,
  capacity_fill_rate numeric,
  new_participants bigint,
  returning_participants bigint,
  retention_rate numeric,
  certificates_issued bigint,
  course_completions bigint,
  points_awarded numeric,
  points_redeemed numeric,
  rewards_redeemed bigint
)
language sql stable security invoker
set search_path = analytics, public, pg_temp
as $$
  with ev as (
    select * from analytics.filtered_events(
      p_from, p_to, p_event_types, p_organisation_ids, p_venues, p_statuses
    )
  ),
  reg as (
    select r.participant_id, r.status
    from analytics.registrations_base r
    join ev on ev.id = r.event_id
    where analytics.norm(r.status) <> 'invited'
      and analytics.norm(r.status) <> 'ineligible'
  ),
  att as (
    select a.participant_id, a.event_id
    from analytics.attendance_base a
    join ev on ev.id = a.event_id
  ),
  lifetime as (
    select a.participant_id, count(*) as total_attendances
    from analytics.attendance_base a
    where a.participant_id in (select participant_id from att)
    group by a.participant_id
  ),
  counts as (
    select
      (select count(*) from ev)                                             as events_count,
      (select count(*) from reg)                                            as registrations_total,
      (select count(*) from reg where analytics.norm(status) = 'waitlisted') as waitlisted_total,
      (select count(*) from reg where analytics.norm(status) = 'cancelled')  as cancelled_total,
      (select count(*) from att)                                            as attended_total,
      (select count(distinct participant_id) from att)                      as participants_reached,
      (select coalesce(sum(capacity), 0)::bigint from ev)                   as capacity_total,
      (select count(*) from lifetime where total_attendances > 1)           as returning_participants,
      (select count(*) from lifetime where total_attendances <= 1)          as new_participants,
      (select count(*) from analytics.certificates_base c join ev on ev.id = c.event_id)
                                                                            as certificates_issued,
      (select count(distinct (a.participant_id, ec.course_id))
         from att a join analytics.event_courses_base ec on ec.event_id = a.event_id)
                                                                            as course_completions,
      (select coalesce(sum(p.amount) filter (where p.amount > 0), 0)::numeric
         from analytics.points_base p join ev on ev.id = p.event_id)        as points_awarded,
      (select coalesce(-sum(p.amount) filter (where p.amount < 0), 0)::numeric
         from analytics.points_base p join ev on ev.id = p.event_id)        as points_redeemed,
      (select count(*) from analytics.redemptions_base r
        where (p_from is null or r.created_at >= p_from)
          and (p_to is null or r.created_at < p_to)
          and analytics.norm(r.status) <> 'cancelled')                      as rewards_redeemed
  )
  select
    c.events_count,
    c.registrations_total,
    (c.registrations_total - c.waitlisted_total - c.cancelled_total)        as registrations_committed,
    c.waitlisted_total,
    c.cancelled_total,
    c.attended_total,
    greatest(
      c.registrations_total - c.waitlisted_total - c.cancelled_total - c.attended_total, 0
    )                                                                       as no_show_total,
    c.participants_reached,
    analytics.rate(c.attended_total,
      c.registrations_total - c.waitlisted_total - c.cancelled_total)       as attendance_rate,
    analytics.rate(
      greatest(c.registrations_total - c.waitlisted_total - c.cancelled_total - c.attended_total, 0),
      c.registrations_total - c.waitlisted_total - c.cancelled_total)       as no_show_rate,
    analytics.rate(
      c.cancelled_total
        + greatest(c.registrations_total - c.waitlisted_total - c.cancelled_total - c.attended_total, 0),
      c.registrations_total - c.waitlisted_total)                           as drop_off_rate,
    analytics.rate(c.cancelled_total, c.registrations_total - c.waitlisted_total)
                                                                            as cancellation_rate,
    c.capacity_total,
    analytics.rate(c.attended_total, c.capacity_total)                      as capacity_fill_rate,
    c.new_participants,
    c.returning_participants,
    analytics.rate(c.returning_participants, c.participants_reached)        as retention_rate,
    c.certificates_issued,
    c.course_completions,
    c.points_awarded,
    c.points_redeemed,
    c.rewards_redeemed
  from counts c;
$$;

-- =============================================================================
-- 4. Attendance and drop-off trend
-- =============================================================================

create or replace function public.analytics_attendance_trend(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_event_types text[] default null,
  p_organisation_ids uuid[] default null,
  p_venues text[] default null,
  p_statuses text[] default array['archived'],
  p_bucket text default 'month'
)
returns table (
  period_start timestamptz,
  events_count bigint,
  registrations_committed bigint,
  attended bigint,
  no_show bigint,
  cancelled bigint,
  attendance_rate numeric,
  drop_off_rate numeric
)
language sql stable security invoker
set search_path = analytics, public, pg_temp
as $$
  with ev as (
    select
      e.id,
      date_trunc(analytics.bucket_unit(p_bucket), e.starts_at) as period_start
    from analytics.filtered_events(
      p_from, p_to, p_event_types, p_organisation_ids, p_venues, p_statuses
    ) e
  ),
  per_event as (
    select
      ev.id,
      ev.period_start,
      count(r.event_id) filter (
        where analytics.norm(r.status) not in ('invited', 'ineligible', 'waitlisted', 'cancelled')
      ) as committed,
      count(r.event_id) filter (where analytics.norm(r.status) = 'cancelled') as cancelled,
      (select count(*) from analytics.attendance_base a where a.event_id = ev.id) as attended
    from ev
    left join analytics.registrations_base r on r.event_id = ev.id
    group by ev.id, ev.period_start
  )
  select
    period_start,
    count(*)::bigint                                  as events_count,
    sum(committed)::bigint                            as registrations_committed,
    sum(attended)::bigint                             as attended,
    sum(greatest(committed - attended, 0))::bigint    as no_show,
    sum(cancelled)::bigint                            as cancelled,
    analytics.rate(sum(attended), sum(committed))     as attendance_rate,
    analytics.rate(
      sum(cancelled) + sum(greatest(committed - attended, 0)),
      sum(committed) + sum(cancelled)
    )                                                 as drop_off_rate
  from per_event
  group by period_start
  order by period_start;
$$;

-- =============================================================================
-- 5. Volunteer and business participation
-- =============================================================================

create or replace function public.analytics_participation_summary(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_event_types text[] default null,
  p_organisation_ids uuid[] default null,
  p_venues text[] default null,
  p_statuses text[] default array['archived']
)
returns table (
  volunteer_target_total bigint,
  volunteers_assigned bigint,
  volunteers_confirmed bigint,
  volunteers_declined bigint,
  volunteers_awaiting bigint,
  volunteers_attended bigint,
  volunteers_no_show bigint,
  volunteer_fill_rate numeric,
  volunteer_show_rate numeric,
  businesses_selected bigint,
  businesses_contacted bigint,
  businesses_confirmed bigint,
  businesses_declined bigint,
  businesses_awaiting bigint,
  business_confirmation_rate numeric,
  business_response_rate numeric
)
language sql stable security invoker
set search_path = analytics, public, pg_temp
as $$
  with ev as (
    select * from analytics.filtered_events(
      p_from, p_to, p_event_types, p_organisation_ids, p_venues, p_statuses
    )
  ),
  vol as (
    select
      analytics.norm(v.assignment_status) as assignment_status,
      analytics.norm(v.attendance_status) as attendance_status
    from analytics.event_volunteers_base v
    join ev on ev.id = v.event_id
  ),
  biz as (
    select analytics.norm(b.outreach_status) as outreach_status
    from analytics.event_businesses_base b
    join ev on ev.id = b.event_id
  ),
  agg as (
    select
      (select coalesce(sum(volunteer_target), 0)::bigint from ev)             as target_total,
      (select count(*) from vol)                                             as assigned,
      (select count(*) from vol where assignment_status = 'confirmed')       as confirmed,
      (select count(*) from vol where assignment_status = 'declined')        as declined,
      (select count(*) from vol where assignment_status in ('contacted', 'awaiting_response'))
                                                                             as awaiting,
      (select count(*) from vol where attendance_status = 'attended')        as attended,
      (select count(*) from vol where attendance_status = 'no_show')         as no_show,
      (select count(*) from biz)                                             as biz_selected,
      (select count(*) from biz where outreach_status <> 'not_contacted')    as biz_contacted,
      (select count(*) from biz where outreach_status = 'confirmed')         as biz_confirmed,
      (select count(*) from biz where outreach_status = 'declined')          as biz_declined,
      (select count(*) from biz where outreach_status = 'awaiting_response') as biz_awaiting
  )
  select
    target_total,
    assigned,
    confirmed,
    declined,
    awaiting,
    attended,
    no_show,
    analytics.rate(confirmed, target_total)                as volunteer_fill_rate,
    analytics.rate(attended, confirmed)                    as volunteer_show_rate,
    biz_selected,
    biz_contacted,
    biz_confirmed,
    biz_declined,
    biz_awaiting,
    analytics.rate(biz_confirmed, biz_selected)            as business_confirmation_rate,
    analytics.rate(biz_confirmed + biz_declined, biz_contacted) as business_response_rate
  from agg;
$$;

create or replace function public.analytics_participation_by_event(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_event_types text[] default null,
  p_organisation_ids uuid[] default null,
  p_venues text[] default null,
  p_statuses text[] default array['archived'],
  p_limit integer default 24
)
returns table (
  event_id uuid,
  event_name text,
  starts_at timestamptz,
  volunteer_target integer,
  volunteers_confirmed bigint,
  volunteers_attended bigint,
  businesses_selected bigint,
  businesses_confirmed bigint
)
language sql stable security invoker
set search_path = analytics, public, pg_temp
as $$
  select
    e.id,
    e.name,
    e.starts_at,
    e.volunteer_target,
    (select count(*) from analytics.event_volunteers_base v
      where v.event_id = e.id and analytics.norm(v.assignment_status) = 'confirmed')  as volunteers_confirmed,
    (select count(*) from analytics.event_volunteers_base v
      where v.event_id = e.id and analytics.norm(v.attendance_status) = 'attended')   as volunteers_attended,
    (select count(*) from analytics.event_businesses_base b
      where b.event_id = e.id)                                                        as businesses_selected,
    (select count(*) from analytics.event_businesses_base b
      where b.event_id = e.id and analytics.norm(b.outreach_status) = 'confirmed')     as businesses_confirmed
  from analytics.filtered_events(
    p_from, p_to, p_event_types, p_organisation_ids, p_venues, p_statuses
  ) e
  order by e.starts_at desc
  limit greatest(coalesce(p_limit, 24), 1);
$$;

-- =============================================================================
-- 6. Beneficiary impact
-- =============================================================================

create or replace function public.analytics_beneficiary_impact(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_event_types text[] default null,
  p_organisation_ids uuid[] default null,
  p_venues text[] default null,
  p_statuses text[] default array['archived']
)
returns table (
  organisation_id uuid,
  organisation_name text,
  events_count bigint,
  participants_reached bigint,
  attended_total bigint,
  registrations_committed bigint,
  attendance_rate numeric,
  volunteers_engaged bigint,
  businesses_engaged bigint,
  certificates_issued bigint,
  course_completions bigint
)
language sql stable security invoker
set search_path = analytics, public, pg_temp
as $$
  with ev as (
    select
      e.id,
      coalesce(e.organisation_id, '00000000-0000-0000-0000-000000000000'::uuid) as org_key,
      e.organisation_id
    from analytics.filtered_events(
      p_from, p_to, p_event_types, p_organisation_ids, p_venues, p_statuses
    ) e
  ),
  base as (
    select org_key, min(organisation_id) as organisation_id, count(*)::bigint as events_count
    from ev
    group by org_key
  ),
  att as (
    select
      ev.org_key,
      count(*)::bigint                            as attended_total,
      count(distinct a.participant_id)::bigint    as participants_reached
    from analytics.attendance_base a
    join ev on ev.id = a.event_id
    group by ev.org_key
  ),
  reg as (
    select ev.org_key, count(*)::bigint as registrations_committed
    from analytics.registrations_base r
    join ev on ev.id = r.event_id
    where analytics.norm(r.status) not in ('invited', 'ineligible', 'waitlisted', 'cancelled')
    group by ev.org_key
  ),
  vol as (
    select ev.org_key, count(*)::bigint as volunteers_engaged
    from analytics.event_volunteers_base v
    join ev on ev.id = v.event_id
    where analytics.norm(v.assignment_status) = 'confirmed'
    group by ev.org_key
  ),
  biz as (
    select ev.org_key, count(*)::bigint as businesses_engaged
    from analytics.event_businesses_base b
    join ev on ev.id = b.event_id
    where analytics.norm(b.outreach_status) = 'confirmed'
    group by ev.org_key
  ),
  cert as (
    select ev.org_key, count(*)::bigint as certificates_issued
    from analytics.certificates_base c
    join ev on ev.id = c.event_id
    group by ev.org_key
  ),
  crs as (
    select ev.org_key, count(distinct (a.participant_id, ec.course_id))::bigint as course_completions
    from analytics.attendance_base a
    join ev on ev.id = a.event_id
    join analytics.event_courses_base ec on ec.event_id = a.event_id
    group by ev.org_key
  )
  select
    base.organisation_id,
    coalesce(o.name, 'Unassigned')                        as organisation_name,
    base.events_count,
    coalesce(att.participants_reached, 0)                 as participants_reached,
    coalesce(att.attended_total, 0)                       as attended_total,
    coalesce(reg.registrations_committed, 0)              as registrations_committed,
    analytics.rate(att.attended_total, reg.registrations_committed) as attendance_rate,
    coalesce(vol.volunteers_engaged, 0)                   as volunteers_engaged,
    coalesce(biz.businesses_engaged, 0)                   as businesses_engaged,
    coalesce(cert.certificates_issued, 0)                 as certificates_issued,
    coalesce(crs.course_completions, 0)                   as course_completions
  from base
  left join analytics.organisations_base o on o.id = base.organisation_id
  left join att  on att.org_key  = base.org_key
  left join reg  on reg.org_key  = base.org_key
  left join vol  on vol.org_key  = base.org_key
  left join biz  on biz.org_key  = base.org_key
  left join cert on cert.org_key = base.org_key
  left join crs  on crs.org_key  = base.org_key
  order by coalesce(att.participants_reached, 0) desc, organisation_name;
$$;

-- =============================================================================
-- 7. Social engagement
--    Metrics stay NULL when a platform does not report them — the UI shows
--    "Not available" rather than 0 (spec §17.5).
-- =============================================================================

create or replace function public.analytics_social_totals(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_event_types text[] default null,
  p_organisation_ids uuid[] default null,
  p_venues text[] default null,
  p_statuses text[] default array['archived']
)
returns table (
  integration text,
  posts_count bigint,
  likes numeric,
  shares numeric,
  comments numeric,
  impressions numeric,
  reach numeric
)
language sql stable security invoker
set search_path = analytics, public, pg_temp
as $$
  select
    m.integration,
    count(distinct m.post_id)::bigint                     as posts_count,
    sum(m.value) filter (where m.metric_key = 'likes')       as likes,
    sum(m.value) filter (where m.metric_key = 'shares')      as shares,
    sum(m.value) filter (where m.metric_key = 'comments')    as comments,
    sum(m.value) filter (where m.metric_key = 'impressions') as impressions,
    sum(m.value) filter (where m.metric_key = 'reach')       as reach
  from analytics.latest_social_metrics(
    p_from, p_to, p_event_types, p_organisation_ids, p_venues, p_statuses
  ) m
  group by m.integration
  order by m.integration;
$$;

create or replace function public.analytics_social_trend(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_event_types text[] default null,
  p_organisation_ids uuid[] default null,
  p_venues text[] default null,
  p_statuses text[] default array['archived'],
  p_bucket text default 'month'
)
returns table (
  period_start timestamptz,
  posts_count bigint,
  likes numeric,
  shares numeric,
  comments numeric,
  impressions numeric,
  reach numeric
)
language sql stable security invoker
set search_path = analytics, public, pg_temp
as $$
  select
    date_trunc(analytics.bucket_unit(p_bucket), m.published_at) as period_start,
    count(distinct m.post_id)::bigint                        as posts_count,
    sum(m.value) filter (where m.metric_key = 'likes')       as likes,
    sum(m.value) filter (where m.metric_key = 'shares')      as shares,
    sum(m.value) filter (where m.metric_key = 'comments')    as comments,
    sum(m.value) filter (where m.metric_key = 'impressions') as impressions,
    sum(m.value) filter (where m.metric_key = 'reach')       as reach
  from analytics.latest_social_metrics(
    p_from, p_to, p_event_types, p_organisation_ids, p_venues, p_statuses
  ) m
  where m.published_at is not null
  group by 1
  order by 1;
$$;

-- =============================================================================
-- 8. Event and course completion trends
-- =============================================================================

create or replace function public.analytics_completion_trends(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_event_types text[] default null,
  p_organisation_ids uuid[] default null,
  p_venues text[] default null,
  p_statuses text[] default array['archived'],
  p_bucket text default 'month'
)
returns table (
  period_start timestamptz,
  events_completed bigint,
  course_completions bigint,
  certificates_issued bigint,
  participants_completing bigint,
  completion_rate numeric
)
language sql stable security invoker
set search_path = analytics, public, pg_temp
as $$
  with ev as (
    select
      e.id,
      date_trunc(analytics.bucket_unit(p_bucket), coalesce(e.ends_at, e.starts_at)) as period_start
    from analytics.filtered_events(
      p_from, p_to, p_event_types, p_organisation_ids, p_venues, p_statuses
    ) e
  ),
  att as (
    select ev.period_start, a.participant_id, a.event_id
    from analytics.attendance_base a
    join ev on ev.id = a.event_id
  ),
  courses as (
    select att.period_start, att.participant_id, ec.course_id
    from att
    join analytics.event_courses_base ec on ec.event_id = att.event_id
  ),
  committed_reg as (
    select ev.period_start, count(*) as committed
    from analytics.registrations_base r
    join ev on ev.id = r.event_id
    where analytics.norm(r.status) not in ('invited', 'ineligible', 'waitlisted', 'cancelled')
    group by ev.period_start
  ),
  certs as (
    select ev.period_start, count(*) as certificates
    from analytics.certificates_base c
    join ev on ev.id = c.event_id
    group by ev.period_start
  )
  select
    ev.period_start,
    count(distinct ev.id)::bigint                                   as events_completed,
    (select count(distinct (participant_id, course_id)) from courses
      where courses.period_start = ev.period_start)::bigint         as course_completions,
    coalesce((select certificates from certs where certs.period_start = ev.period_start), 0)::bigint
                                                                    as certificates_issued,
    (select count(distinct participant_id) from att
      where att.period_start = ev.period_start)::bigint             as participants_completing,
    analytics.rate(
      (select count(*) from att where att.period_start = ev.period_start),
      (select cr.committed from committed_reg cr where cr.period_start = ev.period_start)
    )                                                               as completion_rate
  from ev
  group by ev.period_start
  order by ev.period_start;
$$;

-- =============================================================================
-- 9. Filter options (only values the caller is allowed to see)
-- =============================================================================

create or replace function public.analytics_filter_options()
returns table (kind text, value text, label text)
language sql stable security invoker
set search_path = analytics, public, pg_temp
as $$
  select 'event_type'::text, e.event_type, e.event_type
  from analytics.events_base e
  where e.event_type is not null
  group by e.event_type
  union all
  select 'venue'::text, e.venue, e.venue
  from analytics.events_base e
  where e.venue is not null
  group by e.venue
  union all
  select 'organisation'::text, o.id::text, o.name
  from analytics.organisations_base o
  where exists (select 1 from analytics.events_base e where e.organisation_id = o.id)
  order by 1, 3;
$$;

-- =============================================================================
-- 10. Grants and supporting indexes
-- =============================================================================

grant select on all tables in schema analytics to authenticated, service_role;

grant execute on function
  public.analytics_event_summary(timestamptz, timestamptz, text[], uuid[], text[], text[]),
  public.analytics_attendance_trend(timestamptz, timestamptz, text[], uuid[], text[], text[], text),
  public.analytics_participation_summary(timestamptz, timestamptz, text[], uuid[], text[], text[]),
  public.analytics_participation_by_event(timestamptz, timestamptz, text[], uuid[], text[], text[], integer),
  public.analytics_beneficiary_impact(timestamptz, timestamptz, text[], uuid[], text[], text[]),
  public.analytics_social_totals(timestamptz, timestamptz, text[], uuid[], text[], text[]),
  public.analytics_social_trend(timestamptz, timestamptz, text[], uuid[], text[], text[], text),
  public.analytics_completion_trends(timestamptz, timestamptz, text[], uuid[], text[], text[], text),
  public.analytics_filter_options()
to authenticated;

create index if not exists idx_events_status_starts_at on public.events (status, starts_at desc);
create index if not exists idx_registrations_event_status on public.registrations (event_id, status);
create index if not exists idx_attendance_event on public.attendance (event_id);
create index if not exists idx_attendance_participant on public.attendance (participant_id);
create index if not exists idx_event_volunteers_event on public.event_volunteers (event_id);
create index if not exists idx_event_businesses_event on public.event_businesses (event_id);
create index if not exists idx_certificates_event on public.certificates (event_id);
create index if not exists idx_social_posts_event on public.social_posts (event_id);
create index if not exists idx_social_metrics_post_measured on public.social_metrics (social_post_id, measured_at desc);
