create table public.event_translations (
  event_id uuid not null references public.events(id) on delete cascade,
  language text not null check (language in ('en', 'zh', 'ms', 'ta')),
  name text not null,
  description text,
  venue text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, language)
);

create index event_translations_event_idx on public.event_translations(event_id);

create trigger event_translations_set_updated_at before update on public.event_translations
  for each row execute function public.set_updated_at();

alter table public.event_translations enable row level security;

create policy "translations_read_authenticated" on public.event_translations
  for select to authenticated using (true);

grant select, insert, update, delete on public.event_translations to authenticated;
grant select on public.event_translations to anon;
grant select, insert, update, delete on public.event_translations to service_role;
