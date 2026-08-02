-- Keep the approved volunteer directory when transient event test data is cleared.
alter table public.volunteers
  add column if not exists is_persistent boolean not null default false;

comment on column public.volunteers.is_persistent is
  'True for approved directory volunteers that must be retained between event test runs.';

insert into public.volunteers (
  id,
  full_name,
  email,
  phone,
  interests,
  skills,
  source,
  active,
  is_persistent
)
values
  (
    '30000000-0000-4000-8000-000000000001',
    'Aisha Rahman',
    'aisha.volunteer@example.com',
    '+65 8123 1001',
    array['Pre-loved item sorting', 'Community distribution'],
    array['Inventory', 'Packing', 'Beneficiary engagement'],
    'Giving.sg',
    true,
    true
  ),
  (
    '30000000-0000-4000-8000-000000000002',
    'Daniel Tan',
    'daniel.volunteer@example.com',
    '+65 8123 1002',
    array['Logistics', 'Transport coordination'],
    array['Route planning', 'Driving', 'Event operations'],
    'PTS Registration',
    true,
    true
  ),
  (
    '30000000-0000-4000-8000-000000000003',
    'Mei Lin',
    'meilin.volunteer@example.com',
    '+65 8123 1003',
    array['Sustainability', 'Donation drives'],
    array['Warehouse operations', 'Stock counting'],
    'Giving.sg',
    true,
    true
  ),
  (
    '30000000-0000-4000-8000-000000000004',
    'Arjun Nair',
    'arjun.volunteer@example.com',
    '+65 8123 1004',
    array['Computer literacy', 'Teaching seniors'],
    array['Microsoft Office', 'Coaching', 'Troubleshooting'],
    'PTS Registration',
    true,
    true
  ),
  (
    '30000000-0000-4000-8000-000000000005',
    'Siti Nur',
    'siti.volunteer@example.com',
    '+65 8123 1005',
    array['Digital skills', 'Course facilitation'],
    array['Classroom support', 'Mobile apps', 'Translation'],
    'Giving.sg',
    true,
    true
  ),
  (
    '30000000-0000-4000-8000-000000000006',
    'Rachel Wong',
    'rachel.volunteer@example.com',
    '+65 8123 1006',
    array['Education', 'Training administration'],
    array['Registration', 'Curriculum support', 'Facilitation'],
    'PTS Registration',
    true,
    true
  ),
  (
    '30000000-0000-4000-8000-000000000007',
    'Priya Kumar',
    'priya.volunteer@example.com',
    '+65 8123 1007',
    array['Yoga', 'Mindfulness'],
    array['Beginner yoga', 'Breathing exercises'],
    'Giving.sg',
    true,
    true
  ),
  (
    '30000000-0000-4000-8000-000000000008',
    'Farah Lim',
    'farah.volunteer@example.com',
    '+65 8123 1008',
    array['Zumba', 'Active ageing'],
    array['Group exercise', 'Music coordination'],
    'PTS Registration',
    true,
    true
  ),
  (
    '30000000-0000-4000-8000-000000000009',
    'Marcus Lee',
    'marcus.volunteer@example.com',
    '+65 8123 1009',
    array['Meditation', 'Mental wellness'],
    array['Guided meditation', 'Participant care'],
    'Giving.sg',
    true,
    true
  )
on conflict (id) do update set
  full_name = excluded.full_name,
  email = excluded.email,
  phone = excluded.phone,
  interests = excluded.interests,
  skills = excluded.skills,
  source = excluded.source,
  active = true,
  is_persistent = true;

create index if not exists volunteers_persistent_idx
  on public.volunteers (is_persistent)
  where is_persistent;
