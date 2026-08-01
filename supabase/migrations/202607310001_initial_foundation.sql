create extension if not exists pgcrypto;

create type public.app_role as enum ('coordinator', 'participant');
create type public.event_status as enum ('create', 'ongoing', 'upcoming', 'awaiting_closure', 'archived');
create type public.registration_status as enum ('invited', 'registered', 'waitlisted', 'confirmed', 'ineligible', 'cancelled', 'attended', 'no_show');
create type public.pass_status as enum ('active', 'revoked', 'expired');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.app_role not null default 'participant',
  full_name text not null,
  email text,
  phone text,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'zh', 'ms', 'ta')),
  email_consent boolean not null default false,
  whatsapp_consent boolean not null default false,
  publicity_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.beneficiary_organisations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  contact_email text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.coordinator_assignments (
  id uuid primary key default gen_random_uuid(),
  coordinator_id uuid not null references public.profiles(id) on delete cascade,
  organisation_id uuid not null references public.beneficiary_organisations(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (coordinator_id, organisation_id)
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.beneficiary_organisations(id),
  name text not null,
  event_type text not null,
  description text,
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text not null,
  volunteer_target integer not null default 0 check (volunteer_target >= 0),
  business_target integer not null default 0 check (business_target >= 0),
  participant_capacity integer check (participant_capacity is null or participant_capacity > 0),
  status public.event_status not null default 'create',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_status_history (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  previous_status public.event_status,
  new_status public.event_status not null,
  reason text,
  changed_by uuid not null references public.profiles(id),
  changed_at timestamptz not null default now()
);

create table public.registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  status public.registration_status not null default 'registered',
  eligibility_result jsonb,
  override_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, participant_id)
);

create table public.membership_passes (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references public.profiles(id) on delete cascade,
  walletwallet_serial text unique,
  google_save_url text,
  share_url text,
  apple_storage_path text,
  token_version integer not null default 1 check (token_version > 0),
  status public.pass_status not null default 'active',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  scanned_by uuid not null references public.profiles(id),
  scanned_at timestamptz not null default now(),
  source text not null default 'qr',
  correction_reason text,
  unique (event_id, participant_id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_value jsonb,
  after_value jsonb,
  request_id text,
  created_at timestamptz not null default now()
);

create index events_status_starts_at_idx on public.events(status, starts_at);
create index registrations_participant_idx on public.registrations(participant_id);
create index attendance_participant_idx on public.attendance(participant_id);
create index event_status_history_event_idx on public.event_status_history(event_id, changed_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
for each row execute function public.set_updated_at();
create trigger organisations_set_updated_at before update on public.beneficiary_organisations
for each row execute function public.set_updated_at();
create trigger events_set_updated_at before update on public.events
for each row execute function public.set_updated_at();
create trigger registrations_set_updated_at before update on public.registrations
for each row execute function public.set_updated_at();
create trigger passes_set_updated_at before update on public.membership_passes
for each row execute function public.set_updated_at();

create or replace function public.is_coordinator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'coordinator'
  );
$$;

create or replace function public.can_manage_organisation(target_organisation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.coordinator_assignments
    where coordinator_id = auth.uid()
      and organisation_id = target_organisation_id
  );
$$;

alter table public.profiles enable row level security;
alter table public.beneficiary_organisations enable row level security;
alter table public.coordinator_assignments enable row level security;
alter table public.events enable row level security;
alter table public.event_status_history enable row level security;
alter table public.registrations enable row level security;
alter table public.membership_passes enable row level security;
alter table public.attendance enable row level security;
alter table public.audit_logs enable row level security;

create policy "profiles_read_own" on public.profiles
for select using (id = auth.uid());
create policy "profiles_update_own" on public.profiles
for update using (id = auth.uid()) with check (id = auth.uid());

create policy "organisations_read_authenticated" on public.beneficiary_organisations
for select to authenticated using (active or public.can_manage_organisation(id));

create policy "assignments_read_own" on public.coordinator_assignments
for select using (coordinator_id = auth.uid());

create policy "events_read_authenticated" on public.events
for select to authenticated using (true);
create policy "events_insert_coordinator" on public.events
for insert to authenticated with check (public.can_manage_organisation(organisation_id) and created_by = auth.uid());
create policy "events_update_coordinator" on public.events
for update to authenticated using (public.can_manage_organisation(organisation_id))
with check (public.can_manage_organisation(organisation_id));

create policy "status_history_read_scoped" on public.event_status_history
for select to authenticated using (
  exists (
    select 1 from public.events
    where events.id = event_status_history.event_id
      and (public.can_manage_organisation(events.organisation_id) or exists (
        select 1 from public.registrations
        where registrations.event_id = events.id and registrations.participant_id = auth.uid()
      ))
  )
);

create policy "registrations_read_own_or_coordinator" on public.registrations
for select to authenticated using (
  participant_id = auth.uid() or exists (
    select 1 from public.events
    where events.id = registrations.event_id
      and public.can_manage_organisation(events.organisation_id)
  )
);
create policy "registrations_insert_own" on public.registrations
for insert to authenticated with check (participant_id = auth.uid());

create policy "passes_read_own" on public.membership_passes
for select to authenticated using (participant_id = auth.uid());

create policy "attendance_read_own_or_coordinator" on public.attendance
for select to authenticated using (
  participant_id = auth.uid() or exists (
    select 1 from public.events
    where events.id = attendance.event_id
      and public.can_manage_organisation(events.organisation_id)
  )
);

revoke all on function public.is_coordinator() from public;
revoke all on function public.can_manage_organisation(uuid) from public;
grant execute on function public.is_coordinator() to authenticated;
grant execute on function public.can_manage_organisation(uuid) to authenticated;
