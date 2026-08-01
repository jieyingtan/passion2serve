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
    raise exception 'The participant is not on this event participant list.';
  end if;

  -- Scanning is the attendance confirmation. Invited participants do not need
  -- to complete a separate confirmation action before presenting their pass.
  if current_registration_status not in ('invited', 'registered', 'confirmed', 'attended') then
    raise exception 'This participant cannot be checked in because their registration is %.', replace(current_registration_status::text, '_', ' ');
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
      jsonb_build_object(
        'eventId', target_event_id,
        'participantId', target_participant_id,
        'source', attendance_source,
        'previousRegistrationStatus', current_registration_status
      )
    );
  end if;

  return jsonb_build_object(
    'attendanceId', attendance_id,
    'participantId', target_participant_id,
    'participantName', participant_name,
    'previousRegistrationStatus', current_registration_status,
    'registrationStatus', 'attended',
    'recordedAt', attendance_time,
    'duplicate', is_duplicate
  );
end;
$$;

revoke all on function public.record_attendance(uuid, uuid, text) from public;
grant execute on function public.record_attendance(uuid, uuid, text) to authenticated;
