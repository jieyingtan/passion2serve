create or replace function public.ensure_default_beneficiary_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.beneficiary_organisation_members (
    organisation_id,
    full_name,
    email,
    phone,
    active
  ) values (
    new.id,
    'Jane Tan',
    'janejyextra@gmail.com',
    '+65 8457 8898',
    true
  )
  on conflict (organisation_id, lower(email)) do update set
    full_name = excluded.full_name,
    phone = excluded.phone,
    active = true;
  return new;
end;
$$;

drop trigger if exists beneficiary_organisations_add_default_member
on public.beneficiary_organisations;

create trigger beneficiary_organisations_add_default_member
after insert on public.beneficiary_organisations
for each row execute function public.ensure_default_beneficiary_member();

insert into public.beneficiary_organisation_members (
  organisation_id,
  full_name,
  email,
  phone,
  active
)
select
  organisation.id,
  'Jane Tan',
  'janejyextra@gmail.com',
  '+65 8457 8898',
  true
from public.beneficiary_organisations organisation
on conflict (organisation_id, lower(email)) do update set
  full_name = excluded.full_name,
  phone = excluded.phone,
  active = true;
