alter table public.profiles
add column if not exists onboarding_completed_at timestamptz;

-- Supabase Auth requires the UUID primary key for secure relationships. Email is
-- the case-insensitive, user-facing unique identifier.
create unique index if not exists profiles_email_unique_idx
on public.profiles (lower(email))
where email is not null;

create table if not exists public.participant_invitations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  email text not null,
  full_name text not null,
  auth_user_id uuid references auth.users(id) on delete set null,
  invited_by uuid not null references public.profiles(id),
  status text not null default 'sent' check (status in ('sent', 'existing_user', 'accepted', 'failed')),
  wallet_delivery_status text not null default 'not_ready'
    check (wallet_delivery_status in ('not_ready', 'pending', 'sent', 'failed')),
  wallet_delivery_error text,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  updated_at timestamptz not null default now()
);

create unique index if not exists participant_invitations_event_email_idx
on public.participant_invitations (event_id, email);

create index if not exists participant_invitations_auth_user_idx
on public.participant_invitations (auth_user_id);

create trigger participant_invitations_set_updated_at
before update on public.participant_invitations
for each row execute function public.set_updated_at();

alter table public.participant_invitations enable row level security;

create policy "participant_invitations_coordinator_read" on public.participant_invitations
for select to authenticated using (
  exists (
    select 1 from public.events
    where events.id = participant_invitations.event_id
      and public.can_manage_organisation(events.organisation_id)
  )
);

create policy "participant_invitations_participant_read" on public.participant_invitations
for select to authenticated using (auth_user_id = auth.uid());

-- Invited Auth users exist before this migration's profile trigger can run. Backfill
-- them, including trusted backend-created Coordinators such as local test users.
insert into public.profiles (id, role, full_name, email, phone)
select
  auth_user.id,
  case
    when auth_user.raw_app_meta_data ->> 'app_role' = 'coordinator'
      then 'coordinator'::public.app_role
    else 'participant'::public.app_role
  end,
  coalesce(
    nullif(auth_user.raw_user_meta_data ->> 'full_name', ''),
    nullif(split_part(coalesce(auth_user.email, ''), '@', 1), ''),
    'Participant'
  ),
  auth_user.email,
  auth_user.phone
from auth.users auth_user
on conflict (id) do update set
  role = excluded.role,
  full_name = excluded.full_name,
  email = excluded.email,
  phone = excluded.phone;

alter table public.profiles
alter column email set not null;

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
    case
      when new.raw_app_meta_data ->> 'app_role' = 'coordinator'
        then 'coordinator'::public.app_role
      else 'participant'::public.app_role
    end,
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
