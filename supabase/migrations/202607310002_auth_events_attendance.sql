create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, role, full_name, email, phone)
  values (
    new.id,
    'participant',
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Participant'
    ),
    new.email,
    new.phone
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- A participant may update profile preferences, but never their own application role.
revoke update on public.profiles from authenticated;
grant update (
  full_name,
  phone,
  preferred_language,
  email_consent,
  whatsapp_consent,
  publicity_consent,
  updated_at
) on public.profiles to authenticated;

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
  if auth.uid() is null or not public.can_manage_organisation(target_organisation_id) then
    raise exception 'You are not authorised to create an event for this organisation.';
  end if;

  if initial_status not in ('create', 'ongoing') then
    raise exception 'An event must begin in Create or Ongoing.';
  end if;

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
    jsonb_build_object('status', initial_status, 'name', event_name)
  );

  return created_event_id;
end;
$$;

create or replace function public.record_attendance(
  target_event_id uuid,
  target_participant_id uuid,
  attendance_source text default 'qr'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  attendance_id uuid;
  attendance_time timestamptz;
  is_duplicate boolean := false;
  participant_name text;
  current_registration_status public.registration_status;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.events event
    where event.id = target_event_id
      and public.can_manage_organisation(event.organisation_id)
  ) then
    raise exception 'You are not authorised to record attendance for this event.';
  end if;

  select registration.status
  into current_registration_status
  from public.registrations registration
  where registration.event_id = target_event_id
    and registration.participant_id = target_participant_id;

  if current_registration_status is null then
    raise exception 'The participant is not registered for this event.';
  end if;

  if current_registration_status not in ('registered', 'confirmed', 'attended') then
    raise exception 'The participant registration is not eligible for attendance.';
  end if;

  select profile.full_name
  into participant_name
  from public.profiles profile
  where profile.id = target_participant_id
    and profile.role = 'participant';

  if participant_name is null then
    raise exception 'Participant profile not found.';
  end if;

  insert into public.attendance (event_id, participant_id, scanned_by, source)
  values (target_event_id, target_participant_id, auth.uid(), attendance_source)
  on conflict (event_id, participant_id) do nothing
  returning id, scanned_at into attendance_id, attendance_time;

  if attendance_id is null then
    is_duplicate := true;
    select attendance.id, attendance.scanned_at
    into attendance_id, attendance_time
    from public.attendance attendance
    where attendance.event_id = target_event_id
      and attendance.participant_id = target_participant_id;
  else
    update public.registrations
    set status = 'attended', updated_at = now()
    where event_id = target_event_id
      and participant_id = target_participant_id;

    insert into public.audit_logs (actor_id, action, entity_type, entity_id, after_value)
    values (
      auth.uid(),
      'attendance.recorded',
      'attendance',
      attendance_id,
      jsonb_build_object('eventId', target_event_id, 'participantId', target_participant_id, 'source', attendance_source)
    );
  end if;

  return jsonb_build_object(
    'attendanceId', attendance_id,
    'participantId', target_participant_id,
    'participantName', participant_name,
    'recordedAt', attendance_time,
    'duplicate', is_duplicate
  );
end;
$$;

revoke all on function public.create_event(uuid, text, text, text, timestamptz, text, integer, integer, integer, public.event_status) from public;
revoke all on function public.record_attendance(uuid, uuid, text) from public;
grant execute on function public.create_event(uuid, text, text, text, timestamptz, text, integer, integer, integer, public.event_status) to authenticated;
grant execute on function public.record_attendance(uuid, uuid, text) to authenticated;
