create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  certificate_number text not null unique,
  storage_path text not null,
  issued_at timestamptz not null default now(),
  email_status text not null default 'pending' check (email_status in ('pending','sent','failed','skipped')),
  email_message_id text,
  email_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, event_id)
);

create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid references public.profiles(id) on delete cascade,
  event_id uuid references public.events(id) on delete cascade,
  channel text not null check (channel in ('email','whatsapp')),
  notification_type text not null,
  idempotency_key text not null unique,
  recipient text not null,
  provider text not null,
  provider_message_id text,
  status text not null default 'pending' check (status in ('pending','sent','delivered','read','failed','skipped','manual')),
  error text,
  payload jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text not null,
  icon text not null default 'award',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.participant_badges (
  participant_id uuid not null references public.profiles(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  source_event_id uuid references public.events(id) on delete set null,
  primary key (participant_id, badge_id)
);

create table if not exists public.point_ledger (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid references public.events(id) on delete set null,
  points integer not null,
  reason text not null,
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.rewards (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  sponsor_name text not null,
  points_cost integer not null check (points_cost > 0),
  stock integer check (stock is null or stock >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.reward_redemptions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles(id) on delete cascade,
  reward_id uuid not null references public.rewards(id) on delete restrict,
  points_spent integer not null check (points_spent > 0),
  status text not null default 'requested' check (status in ('requested','approved','fulfilled','cancelled')),
  requested_at timestamptz not null default now(),
  fulfilled_at timestamptz
);

create table if not exists public.participant_feedback (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  feedback text not null,
  personal_story text,
  story_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (participant_id, event_id)
);

create index if not exists certificates_participant_idx on public.certificates(participant_id, issued_at desc);
create index if not exists notification_deliveries_event_idx on public.notification_deliveries(event_id, created_at desc);
create index if not exists point_ledger_participant_idx on public.point_ledger(participant_id, created_at desc);
create index if not exists reward_redemptions_participant_idx on public.reward_redemptions(participant_id, requested_at desc);

drop trigger if exists certificates_set_updated_at on public.certificates;
create trigger certificates_set_updated_at before update on public.certificates for each row execute function public.set_updated_at();
drop trigger if exists notification_deliveries_set_updated_at on public.notification_deliveries;
create trigger notification_deliveries_set_updated_at before update on public.notification_deliveries for each row execute function public.set_updated_at();
drop trigger if exists participant_feedback_set_updated_at on public.participant_feedback;
create trigger participant_feedback_set_updated_at before update on public.participant_feedback for each row execute function public.set_updated_at();

alter table public.certificates enable row level security;
alter table public.notification_deliveries enable row level security;
alter table public.badges enable row level security;
alter table public.participant_badges enable row level security;
alter table public.point_ledger enable row level security;
alter table public.rewards enable row level security;
alter table public.reward_redemptions enable row level security;
alter table public.participant_feedback enable row level security;

create policy "certificates_participant_read" on public.certificates for select to authenticated using (participant_id = auth.uid() or exists (select 1 from public.events e where e.id = event_id and public.can_manage_organisation(e.organisation_id)));
create policy "deliveries_participant_read" on public.notification_deliveries for select to authenticated using (participant_id = auth.uid() or (event_id is not null and exists (select 1 from public.events e where e.id = event_id and public.can_manage_organisation(e.organisation_id))));
create policy "badges_authenticated_read" on public.badges for select to authenticated using (active or public.is_coordinator());
create policy "participant_badges_read" on public.participant_badges for select to authenticated using (participant_id = auth.uid() or public.is_coordinator());
create policy "point_ledger_read" on public.point_ledger for select to authenticated using (participant_id = auth.uid() or public.is_coordinator());
create policy "rewards_authenticated_read" on public.rewards for select to authenticated using (active or public.is_coordinator());
create policy "reward_redemptions_read" on public.reward_redemptions for select to authenticated using (participant_id = auth.uid() or public.is_coordinator());
create policy "reward_redemptions_insert" on public.reward_redemptions for insert to authenticated with check (participant_id = auth.uid());
create policy "feedback_read" on public.participant_feedback for select to authenticated using (participant_id = auth.uid() or exists (select 1 from public.events e where e.id = event_id and public.can_manage_organisation(e.organisation_id)));
create policy "feedback_insert" on public.participant_feedback for insert to authenticated with check (participant_id = auth.uid() and exists (select 1 from public.attendance a where a.event_id = event_id and a.participant_id = auth.uid()));
create policy "feedback_update" on public.participant_feedback for update to authenticated using (participant_id = auth.uid()) with check (participant_id = auth.uid());

insert into public.badges (code,name,description,icon) values
  ('FIRST_STEP','First Step','Completed a first Passion2Serve event.','sparkles'),
  ('COMMUNITY_REGULAR','Community Regular','Completed three Passion2Serve events.','award'),
  ('LEARNING_CHAMPION','Learning Champion','Completed three distinct courses.','graduation-cap')
on conflict (code) do update set name=excluded.name,description=excluded.description,icon=excluded.icon,active=true;

insert into public.rewards (name,description,sponsor_name,points_cost,stock)
select 'Community Café Voucher','$10 refreshment voucher for active participants.','Passion2Serve Sponsor',300,100
where not exists (select 1 from public.rewards where name='Community Café Voucher');

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('certificates-private','certificates-private',false,5242880,array['application/pdf'])
on conflict (id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create or replace function public.redeem_reward(target_reward_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare target_reward public.rewards%rowtype; earned integer; spent integer; redemption_id uuid;
begin
  if auth.uid() is null or not exists (select 1 from public.profiles where id=auth.uid() and role='participant') then raise exception 'Participant access required.'; end if;
  select * into target_reward from public.rewards where id=target_reward_id and active for update;
  if target_reward.id is null then raise exception 'Reward not found.'; end if;
  if target_reward.stock is not null and target_reward.stock <= 0 then raise exception 'This reward is out of stock.'; end if;
  select coalesce(sum(points),0) into earned from public.point_ledger where participant_id=auth.uid();
  select coalesce(sum(points_spent),0) into spent from public.reward_redemptions where participant_id=auth.uid() and status <> 'cancelled';
  if earned-spent < target_reward.points_cost then raise exception 'You do not have enough points.'; end if;
  insert into public.reward_redemptions(participant_id,reward_id,points_spent) values(auth.uid(),target_reward.id,target_reward.points_cost) returning id into redemption_id;
  if target_reward.stock is not null then update public.rewards set stock=stock-1 where id=target_reward.id; end if;
  return redemption_id;
end;
$$;
revoke all on function public.redeem_reward(uuid) from public;
grant execute on function public.redeem_reward(uuid) to authenticated;
