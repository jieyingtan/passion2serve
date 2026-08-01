create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  contact_name text not null,
  phone text not null,
  capabilities text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_businesses (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  match_score integer not null check (match_score between 0 and 100),
  match_explanation text not null,
  status text not null default 'not_contacted'
    check (status in ('not_contacted', 'awaiting_response', 'confirmed', 'declined')),
  notes text,
  contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, business_id)
);

create table if not exists public.volunteers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null unique,
  phone text not null,
  interests text[] not null default '{}',
  skills text[] not null default '{}',
  source text not null default 'PTS registration form',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.event_volunteers (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  volunteer_id uuid not null references public.volunteers(id) on delete cascade,
  match_score integer not null check (match_score between 0 and 100),
  match_explanation text not null,
  status text not null default 'recommended'
    check (status in ('recommended', 'contacted', 'awaiting_response', 'confirmed', 'declined', 'attended', 'no_show')),
  notes text,
  contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, volunteer_id)
);

create index if not exists event_businesses_event_idx on public.event_businesses(event_id);
create index if not exists event_volunteers_event_idx on public.event_volunteers(event_id);

create trigger businesses_set_updated_at before update on public.businesses
for each row execute function public.set_updated_at();
create trigger event_businesses_set_updated_at before update on public.event_businesses
for each row execute function public.set_updated_at();
create trigger volunteers_set_updated_at before update on public.volunteers
for each row execute function public.set_updated_at();
create trigger event_volunteers_set_updated_at before update on public.event_volunteers
for each row execute function public.set_updated_at();

alter table public.businesses enable row level security;
alter table public.event_businesses enable row level security;
alter table public.volunteers enable row level security;
alter table public.event_volunteers enable row level security;

create policy "businesses_authenticated_read" on public.businesses
for select to authenticated using (active);
create policy "volunteers_coordinator_read" on public.volunteers
for select to authenticated using (public.is_coordinator() and active);
create policy "event_businesses_coordinator_read" on public.event_businesses
for select to authenticated using (
  exists (select 1 from public.events where events.id = event_businesses.event_id and public.can_manage_organisation(events.organisation_id))
);
create policy "event_volunteers_coordinator_read" on public.event_volunteers
for select to authenticated using (
  exists (select 1 from public.events where events.id = event_volunteers.event_id and public.can_manage_organisation(events.organisation_id))
);

insert into public.businesses (id, name, contact_name, phone, capabilities)
values
  ('20000000-0000-4000-8000-000000000001', 'Bayview Residences MCST', 'Elaine Goh', '+6591001001', array['Condominium management', 'Collection venue']),
  ('20000000-0000-4000-8000-000000000002', 'GreenCycle Logistics', 'Hafiz Rahman', '+6591001002', array['Transport', 'Warehouse']),
  ('20000000-0000-4000-8000-000000000003', 'Community Storage Hub', 'Joanne Lee', '+6591001003', array['Warehouse', 'Distribution operations']),
  ('20000000-0000-4000-8000-000000000004', 'TechForward Singapore', 'Melvin Koh', '+6591002001', array['Computer facilities', 'Digital trainers']),
  ('20000000-0000-4000-8000-000000000005', 'Skills Lab Academy', 'Sarah Lim', '+6591002002', array['Classroom facilities', 'Course administration']),
  ('20000000-0000-4000-8000-000000000006', 'LearnConnect SG', 'Imran Ali', '+6591002003', array['Course administration', 'Learning materials']),
  ('20000000-0000-4000-8000-000000000007', 'Calm Collective SG', 'Priya Menon', '+6591003001', array['Yoga teachers', 'Meditation teachers']),
  ('20000000-0000-4000-8000-000000000008', 'ActiveAge Studio', 'Farah Ong', '+6591003002', array['Zumba instructors', 'Wellness venue']),
  ('20000000-0000-4000-8000-000000000009', 'Harmony Community Club', 'Marcus Teo', '+6591003003', array['Accessible venue', 'Wellness facilities'])
on conflict (id) do update set name = excluded.name, contact_name = excluded.contact_name, phone = excluded.phone, capabilities = excluded.capabilities, active = true;

insert into public.volunteers (id, full_name, email, phone, interests, skills, source)
values
  ('30000000-0000-4000-8000-000000000001', 'Aisha Rahman', 'aisha.volunteer@example.org', '+6592001001', array['Pre-loved item sorting', 'Community distribution'], array['Sorting', 'Community outreach'], 'Giving.sg'),
  ('30000000-0000-4000-8000-000000000002', 'Daniel Tan', 'daniel.volunteer@example.org', '+6592001002', array['Logistics', 'Transport coordination'], array['Driving', 'Logistics'], 'PTS registration form'),
  ('30000000-0000-4000-8000-000000000003', 'Mei Lin', 'meilin.volunteer@example.org', '+6592001003', array['Sustainability', 'Inventory support'], array['Inventory', 'Operations'], 'Giving.sg'),
  ('30000000-0000-4000-8000-000000000004', 'Arjun Nair', 'arjun.volunteer@example.org', '+6592002001', array['Computer literacy', 'Teaching seniors'], array['Digital training', 'Facilitation'], 'PTS registration form'),
  ('30000000-0000-4000-8000-000000000005', 'Siti Nur', 'siti.volunteer@example.org', '+6592002002', array['Digital skills', 'Course facilitation'], array['Facilitation', 'Malay'], 'Giving.sg'),
  ('30000000-0000-4000-8000-000000000006', 'Rachel Wong', 'rachel.volunteer@example.org', '+6592002003', array['Training administration', 'Education'], array['Administration', 'Teaching'], 'PTS registration form'),
  ('30000000-0000-4000-8000-000000000007', 'Priya Kumar', 'priya.volunteer@example.org', '+6592003001', array['Yoga', 'Mindfulness'], array['Yoga instruction', 'Tamil'], 'Giving.sg'),
  ('30000000-0000-4000-8000-000000000008', 'Farah Lim', 'farah.volunteer@example.org', '+6592003002', array['Zumba', 'Active ageing'], array['Fitness instruction', 'Malay'], 'PTS registration form'),
  ('30000000-0000-4000-8000-000000000009', 'Marcus Lee', 'marcus.volunteer@example.org', '+6592003003', array['Meditation', 'Mental wellness'], array['Meditation', 'Peer support'], 'Giving.sg')
on conflict (id) do update set full_name = excluded.full_name, email = excluded.email, phone = excluded.phone, interests = excluded.interests, skills = excluded.skills, source = excluded.source, active = true;
