alter table public.events
add column if not exists participant_reviewed_at timestamptz;

create table if not exists public.event_closure_reports (
  event_id uuid primary key references public.events(id) on delete cascade,
  participant_attendance integer not null default 0 check (participant_attendance >= 0),
  volunteer_attendance integer not null default 0 check (volunteer_attendance >= 0),
  business_participation integer not null default 0 check (business_participation >= 0),
  beneficiary_reach integer not null default 0 check (beneficiary_reach >= 0),
  outcomes text,
  feedback_summary text,
  impact_summary text,
  publicity_links text,
  submitted_by uuid references public.profiles(id),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger event_closure_reports_set_updated_at before update on public.event_closure_reports
for each row execute function public.set_updated_at();

alter table public.event_closure_reports enable row level security;

create policy "closure_reports_coordinator_read" on public.event_closure_reports
for select to authenticated using (
  exists (
    select 1 from public.events
    where events.id = event_closure_reports.event_id
      and public.can_manage_organisation(events.organisation_id)
  )
);

create or replace function public.transition_event(
  target_event_id uuid,
  target_status public.event_status,
  transition_reason text default null,
  override_requirements boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_event public.events%rowtype;
  expected_status public.event_status;
  confirmed_businesses integer;
  confirmed_volunteers integer;
  registration_total integer;
  attendance_total integer;
  closure_complete boolean;
begin
  select * into current_event from public.events where id = target_event_id for update;
  if current_event.id is null then raise exception 'Event not found.'; end if;
  if auth.uid() is null or not public.can_manage_organisation(current_event.organisation_id) then
    raise exception 'You are not authorised to progress this event.';
  end if;

  expected_status := case current_event.status
    when 'create' then 'ongoing'::public.event_status
    when 'ongoing' then 'upcoming'::public.event_status
    when 'upcoming' then 'awaiting_closure'::public.event_status
    when 'awaiting_closure' then 'archived'::public.event_status
    else null
  end;
  if expected_status is null or target_status <> expected_status then
    raise exception 'Invalid event stage transition.';
  end if;
  if override_requirements and length(trim(coalesce(transition_reason, ''))) < 5 then
    raise exception 'Enter an override reason of at least 5 characters.';
  end if;

  if current_event.status = 'ongoing' and not override_requirements then
    select count(*) into confirmed_businesses from public.event_businesses where event_id = target_event_id and status = 'confirmed';
    select count(*) into confirmed_volunteers from public.event_volunteers where event_id = target_event_id and status = 'confirmed';
    if confirmed_businesses < current_event.business_target then raise exception 'The business target has not been met.'; end if;
    if confirmed_volunteers < current_event.volunteer_target then raise exception 'The volunteer target has not been met.'; end if;
    if current_event.participant_reviewed_at is null then raise exception 'Review the participant list before progressing.'; end if;
  end if;

  if current_event.status = 'upcoming' and not override_requirements then
    if coalesce(current_event.ends_at, current_event.starts_at) > now() then raise exception 'The event has not ended yet.'; end if;
    select count(*) into registration_total from public.registrations where event_id = target_event_id and status not in ('cancelled', 'ineligible');
    select count(*) into attendance_total from public.attendance where event_id = target_event_id;
    if registration_total > 0 and attendance_total = 0 then raise exception 'Record attendance before completing the event.'; end if;
  end if;

  if current_event.status = 'awaiting_closure' and not override_requirements then
    select outcomes is not null and length(trim(outcomes)) > 0
      and feedback_summary is not null and length(trim(feedback_summary)) > 0
      and impact_summary is not null and length(trim(impact_summary)) > 0
    into closure_complete from public.event_closure_reports where event_id = target_event_id;
    if coalesce(closure_complete, false) is false then raise exception 'Complete the closure report before archiving.'; end if;
  end if;

  update public.events set status = target_status where id = target_event_id;
  insert into public.event_status_history (event_id, previous_status, new_status, reason, changed_by)
  values (target_event_id, current_event.status, target_status,
    coalesce(nullif(trim(transition_reason), ''), 'Lifecycle requirements completed'), auth.uid());
  insert into public.audit_logs (actor_id, action, entity_type, entity_id, before_value, after_value)
  values (auth.uid(), 'event.status_changed', 'event', target_event_id,
    jsonb_build_object('status', current_event.status),
    jsonb_build_object('status', target_status, 'override', override_requirements));
  return jsonb_build_object('eventId', target_event_id, 'previousStatus', current_event.status, 'status', target_status);
end;
$$;

revoke all on function public.transition_event(uuid, public.event_status, text, boolean) from public;
grant execute on function public.transition_event(uuid, public.event_status, text, boolean) to authenticated;
