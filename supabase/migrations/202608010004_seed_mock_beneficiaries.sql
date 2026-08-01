insert into public.beneficiary_organisations (id, name, contact_name, contact_email, active)
values
  ('10000000-0000-4000-8000-000000000001', 'Bright Horizons Senior Activity Centre', 'Grace Lim', 'grace@brighthorizons.example', true),
  ('10000000-0000-4000-8000-000000000002', 'New Hope Family Service Centre', 'Muhammad Firdaus', 'firdaus@newhope.example', true),
  ('10000000-0000-4000-8000-000000000003', 'Migrant Community Learning Hub', 'Anita Rao', 'anita@mclh.example', true),
  ('10000000-0000-4000-8000-000000000004', 'Youth Futures Singapore', 'Jason Ong', 'jason@youthfutures.example', true),
  ('10000000-0000-4000-8000-000000000005', 'Silver Connections Network', 'Nur Aisyah', 'aisyah@silverconnections.example', true)
on conflict (id) do update set
  name = excluded.name,
  contact_name = excluded.contact_name,
  contact_email = excluded.contact_email,
  active = excluded.active;
