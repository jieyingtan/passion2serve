-- Beneficiary organisations are selected per event. A coordinator does not need
-- a pre-existing assignment before choosing an active beneficiary. Creating the
-- event establishes the assignment used by the rest of the coordinator workflow.

insert into public.beneficiary_organisations (id, name, contact_name, contact_email, active)
values
  ('10000000-0000-4000-8000-000000000001', 'Bright Horizons Senior Activity Centre', 'Grace Lim', 'grace@brighthorizons.example', true),
  ('10000000-0000-4000-8000-000000000002', 'New Hope Family Service Centre', 'Muhammad Firdaus', 'firdaus@newhope.example', true),
  ('10000000-0000-4000-8000-000000000003', 'Migrant Community Learning Hub', 'Anita Rao', 'anita@mclh.example', true),
  ('10000000-0000-4000-8000-000000000004', 'Youth Futures Singapore', 'Jason Ong', 'jason@youthfutures.example', true),
  ('10000000-0000-4000-8000-000000000005', 'Silver Connections Network', 'Nur Aisyah', 'aisyah@silverconnections.example', true)
on conflict (id) do update set
  name = excluded.name,
  contact_name = excluded.contact_name,
  contact_email = excluded.contact_email,
  active = excluded.active;

create or replace function public.create_event(
  target_organisation_id uuid,
  event_name text,
  target_event_type text,
  event_description text,
  event_starts_at timestamptz,
  event_venue text,
  target_volunteer_count integer,
  target_business_count integer,
  target_participant_capacity integer,
  initial_status public.event_status
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  created_event_id uuid;
begin
  if auth.uid() is null or not public.is_coordinator() then
    raise exception 'Only coordinators may create events.';
  end if;

  if not exists (
    select 1
    from public.beneficiary_organisations organisation
    where organisation.id = target_organisation_id
      and organisation.active
  ) then
    raise exception 'Select an active beneficiary organisation.';
  end if;

  if initial_status not in ('create', 'ongoing') then
    raise exception 'An event must begin in Create or Ongoing.';
  end if;

  insert into public.coordinator_assignments (coordinator_id, organisation_id)
  values (auth.uid(), target_organisation_id)
  on conflict (coordinator_id, organisation_id) do nothing;

  insert into public.events (
    organisation_id,
    name,
    event_type,
    description,
    starts_at,
    venue,
    volunteer_target,
    business_target,
    participant_capacity,
    status,
    created_by
  )
  values (
    target_organisation_id,
    event_name,
    target_event_type,
    event_description,
    event_starts_at,
    event_venue,
    target_volunteer_count,
    target_business_count,
    target_participant_capacity,
    initial_status,
    auth.uid()
  )
  returning id into created_event_id;

  insert into public.event_status_history (event_id, new_status, reason, changed_by)
  values (
    created_event_id,
    initial_status,
    case when initial_status = 'create' then 'Draft created' else 'Event created and outreach started' end,
    auth.uid()
  );

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, after_value)
  values (
    auth.uid(),
    'event.created',
    'event',
    created_event_id,
    jsonb_build_object(
      'status', initial_status,
      'name', event_name,
      'beneficiary_organisation_id', target_organisation_id
    )
  );

  return created_event_id;
end;
$$;
