alter table public.profiles
add column if not exists organisation_id uuid references public.beneficiary_organisations(id) on delete set null;

create table if not exists public.beneficiary_organisation_members (
  id uuid primary key default gen_random_uuid(),
  organisation_id uuid not null references public.beneficiary_organisations(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists beneficiary_members_org_email_idx
on public.beneficiary_organisation_members (organisation_id, lower(email));

create index if not exists beneficiary_members_organisation_idx
on public.beneficiary_organisation_members (organisation_id);

drop trigger if exists beneficiary_organisation_members_set_updated_at on public.beneficiary_organisation_members;
create trigger beneficiary_organisation_members_set_updated_at
before update on public.beneficiary_organisation_members
for each row execute function public.set_updated_at();

alter table public.beneficiary_organisation_members enable row level security;

create policy "beneficiary_members_coordinator_read" on public.beneficiary_organisation_members
for select to authenticated using (
  public.is_coordinator() and public.can_manage_organisation(organisation_id)
);

alter table public.participant_invitations
add column if not exists invitation_source text not null default 'individual'
  check (invitation_source in ('individual', 'organisation_mailing_list')),
add column if not exists email_delivery_status text not null default 'pending'
  check (email_delivery_status in ('pending', 'sent', 'failed')),
add column if not exists email_delivery_error text;

create policy "registrations_update_own" on public.registrations
for update to authenticated
using (participant_id = auth.uid())
with check (participant_id = auth.uid());

-- Safe mock mailing-list records. Replace these example addresses with imported
-- beneficiary membership data before enabling real bulk email delivery.
insert into public.beneficiary_organisation_members (organisation_id, full_name, email, phone)
values
  ('10000000-0000-4000-8000-000000000001', 'Alice Tan', 'alice.tan@members.example', '+65 9000 1001'),
  ('10000000-0000-4000-8000-000000000001', 'Kumar Ravi', 'kumar.ravi@members.example', '+65 9000 1002'),
  ('10000000-0000-4000-8000-000000000002', 'Nur Hidayah', 'nur.hidayah@members.example', '+65 9000 2001'),
  ('10000000-0000-4000-8000-000000000003', 'Chen Wei', 'chen.wei@members.example', '+65 9000 3001'),
  ('10000000-0000-4000-8000-000000000004', 'Amirah Lee', 'amirah.lee@members.example', '+65 9000 4001'),
  ('10000000-0000-4000-8000-000000000005', 'David Lim', 'david.lim@members.example', '+65 9000 5001')
on conflict (organisation_id, lower(email)) do update set
  full_name = excluded.full_name,
  phone = excluded.phone,
  active = true;
