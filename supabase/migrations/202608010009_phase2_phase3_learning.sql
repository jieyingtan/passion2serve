create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  event_type text not null,
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.course_prerequisites (
  course_id uuid not null references public.courses(id) on delete cascade,
  prerequisite_course_id uuid not null references public.courses(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (course_id, prerequisite_course_id),
  check (course_id <> prerequisite_course_id)
);

alter table public.events
add column if not exists course_id uuid references public.courses(id) on delete set null;

create index if not exists events_course_idx on public.events(course_id);
create index if not exists course_prerequisites_prerequisite_idx on public.course_prerequisites(prerequisite_course_id);

drop trigger if exists courses_set_updated_at on public.courses;
create trigger courses_set_updated_at before update on public.courses
for each row execute function public.set_updated_at();

create or replace function public.prevent_course_prerequisite_cycle()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.course_id = new.prerequisite_course_id then
    raise exception 'A course cannot require itself.';
  end if;

  if exists (
    with recursive dependency_tree(course_id) as (
      select prerequisite_course_id
      from public.course_prerequisites
      where course_id = new.prerequisite_course_id
      union
      select prerequisite.prerequisite_course_id
      from public.course_prerequisites prerequisite
      join dependency_tree tree on prerequisite.course_id = tree.course_id
    )
    select 1 from dependency_tree where course_id = new.course_id
  ) then
    raise exception 'This prerequisite would create a course dependency cycle.';
  end if;

  return new;
end;
$$;

drop trigger if exists course_prerequisites_prevent_cycle on public.course_prerequisites;
create trigger course_prerequisites_prevent_cycle
before insert or update on public.course_prerequisites
for each row execute function public.prevent_course_prerequisite_cycle();

alter table public.courses enable row level security;
alter table public.course_prerequisites enable row level security;

create policy "courses_authenticated_read" on public.courses
for select to authenticated using (active or public.is_coordinator());
create policy "course_prerequisites_authenticated_read" on public.course_prerequisites
for select to authenticated using (true);

insert into public.courses (id, code, name, description, event_type, display_order)
values
  ('40000000-0000-4000-8000-000000000001', 'ITS_FOUNDATIONS', 'Community Distribution Basics', 'Learn safe sorting, preparation, and distribution of pre-loved items.', 'Items to Serve', 10),
  ('40000000-0000-4000-8000-000000000002', 'KTS_DIGITAL_FOUNDATIONS', 'Digital Foundations', 'Build confidence using computers, mobile devices, and common digital tools.', 'Knowledge to Serve', 20),
  ('40000000-0000-4000-8000-000000000003', 'KTS_ONLINE_ESSENTIALS', 'Online Essentials', 'Use online services safely for communication and everyday tasks.', 'Knowledge to Serve', 30),
  ('40000000-0000-4000-8000-000000000004', 'KTS_DIGITAL_BANKING', 'Everyday Digital Banking', 'Practise safe, confident use of digital payments and banking services.', 'Knowledge to Serve', 40),
  ('40000000-0000-4000-8000-000000000005', 'PTS_WELLNESS_FOUNDATIONS', 'Wellness Foundations', 'Develop sustainable movement, breathing, and mindfulness practices.', 'Peace to Serve', 50)
on conflict (id) do update set
  code = excluded.code,
  name = excluded.name,
  description = excluded.description,
  event_type = excluded.event_type,
  display_order = excluded.display_order,
  active = true;

insert into public.course_prerequisites (course_id, prerequisite_course_id)
values
  ('40000000-0000-4000-8000-000000000003', '40000000-0000-4000-8000-000000000002'),
  ('40000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000003')
on conflict do nothing;

update public.events
set course_id = case event_type
  when 'Items to Serve' then '40000000-0000-4000-8000-000000000001'::uuid
  when 'Knowledge to Serve' then '40000000-0000-4000-8000-000000000002'::uuid
  when 'Peace to Serve' then '40000000-0000-4000-8000-000000000005'::uuid
  else null
end
where course_id is null;

create or replace function public.evaluate_event_eligibility(
  target_event_id uuid,
  target_participant_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare result jsonb;
begin
  if auth.uid() is null or not exists (
    select 1 from public.events event where event.id = target_event_id
      and (target_participant_id = auth.uid() or public.can_manage_organisation(event.organisation_id))
  ) then raise exception 'You are not authorised to evaluate this registration.'; end if;
  with target as (select course_id from public.events where id = target_event_id),
  unmet as (
    select prerequisite.id, prerequisite.code, prerequisite.name from target
    join public.course_prerequisites dependency on dependency.course_id = target.course_id
    join public.courses prerequisite on prerequisite.id = dependency.prerequisite_course_id
    where not exists (select 1 from public.attendance attendance join public.events completed_event on completed_event.id = attendance.event_id where attendance.participant_id = target_participant_id and completed_event.course_id = prerequisite.id)
  ) select jsonb_build_object('eligible',not exists(select 1 from unmet),'unmetPrerequisites',coalesce((select jsonb_agg(jsonb_build_object('id',id,'code',code,'name',name) order by name) from unmet),'[]'::jsonb)) into result;
  return result;
end;
$$;

create or replace function public.register_for_event(target_event_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_event public.events%rowtype;
  current_status public.registration_status;
  eligibility jsonb;
  active_registrations integer;
  next_status public.registration_status;
begin
  if auth.uid() is null or not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'participant'
  ) then raise exception 'Participant access required.'; end if;

  select * into target_event from public.events where id = target_event_id for update;
  if target_event.id is null or target_event.status not in ('ongoing', 'upcoming') then
    raise exception 'This event is not open for registration.';
  end if;

  eligibility := public.evaluate_event_eligibility(target_event_id, auth.uid());
  if not coalesce((eligibility ->> 'eligible')::boolean, false) then
    insert into public.registrations (event_id, participant_id, status, eligibility_result)
    values (target_event_id, auth.uid(), 'ineligible', eligibility)
    on conflict (event_id, participant_id) do update set status = 'ineligible', eligibility_result = excluded.eligibility_result, updated_at = now();
    return jsonb_build_object('status', 'ineligible', 'eligibility', eligibility);
  end if;

  select status into current_status from public.registrations
  where event_id = target_event_id and participant_id = auth.uid();
  select count(*) into active_registrations from public.registrations
  where event_id = target_event_id and participant_id <> auth.uid()
    and status in ('registered', 'confirmed', 'attended');

  next_status := case
    when target_event.participant_capacity is not null and active_registrations >= target_event.participant_capacity then 'waitlisted'::public.registration_status
    when current_status = 'invited' then 'confirmed'::public.registration_status
    else 'registered'::public.registration_status
  end;

  insert into public.registrations (event_id, participant_id, status, eligibility_result)
  values (target_event_id, auth.uid(), next_status, eligibility)
  on conflict (event_id, participant_id) do update set status = excluded.status, eligibility_result = excluded.eligibility_result, updated_at = now();

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, after_value)
  values (auth.uid(), 'registration.saved', 'event', target_event_id, jsonb_build_object('status', next_status));
  return jsonb_build_object('status', next_status, 'eligibility', eligibility);
end;
$$;

create or replace function public.cancel_event_registration(target_event_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.registrations set status = 'cancelled', updated_at = now()
  where event_id = target_event_id and participant_id = auth.uid()
    and status in ('invited', 'registered', 'waitlisted', 'confirmed');
  if not found then raise exception 'This registration cannot be cancelled.'; end if;
end;
$$;

revoke all on function public.evaluate_event_eligibility(uuid, uuid) from public;
revoke all on function public.register_for_event(uuid) from public;
revoke all on function public.cancel_event_registration(uuid) from public;
grant execute on function public.evaluate_event_eligibility(uuid, uuid) to authenticated;
grant execute on function public.register_for_event(uuid) to authenticated;
grant execute on function public.cancel_event_registration(uuid) to authenticated;

drop policy if exists "registrations_update_own" on public.registrations;
drop policy if exists "registrations_insert_own" on public.registrations;
