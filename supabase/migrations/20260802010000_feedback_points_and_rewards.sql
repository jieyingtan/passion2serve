create or replace function public.submit_participant_feedback(
  target_event_id uuid,
  target_rating integer,
  target_feedback text,
  target_personal_story text default null,
  target_story_consent boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare participant uuid := auth.uid(); was_new boolean;
begin
  if participant is null or not exists (select 1 from public.profiles where id=participant and role='participant') then raise exception 'Participant access required.'; end if;
  if target_rating not between 1 and 5 or length(trim(target_feedback)) < 3 then raise exception 'Add a rating and feedback before submitting.'; end if;
  if not exists (select 1 from public.attendance where event_id=target_event_id and participant_id=participant) then raise exception 'Feedback is available after attendance is recorded.'; end if;
  select not exists (select 1 from public.participant_feedback where participant_id=participant and event_id=target_event_id) into was_new;
  insert into public.participant_feedback(participant_id,event_id,rating,feedback,personal_story,story_consent)
  values(participant,target_event_id,target_rating,trim(target_feedback),nullif(trim(target_personal_story),''),target_story_consent)
  on conflict(participant_id,event_id) do update set rating=excluded.rating,feedback=excluded.feedback,personal_story=excluded.personal_story,story_consent=excluded.story_consent,updated_at=now();
  if was_new then
    insert into public.point_ledger(participant_id,event_id,points,reason,idempotency_key)
    values(participant,target_event_id,10,'Feedback submitted','feedback:'||target_event_id::text||':'||participant::text)
    on conflict(idempotency_key) do nothing;
  end if;
  return was_new;
end;
$$;
revoke all on function public.submit_participant_feedback(uuid,integer,text,text,boolean) from public;
grant execute on function public.submit_participant_feedback(uuid,integer,text,text,boolean) to authenticated;

insert into public.rewards(name,description,sponsor_name,points_cost,stock)
select v.name,v.description,v.sponsor_name,v.points_cost,v.stock from (values
  ('Healthy Meal Voucher','$8 meal voucher at participating community cafés.','Community Food Partners',200,150),
  ('Wellness Class Pass','One complimentary yoga, Zumba, or meditation class.','Calm Collective SG',400,80),
  ('Learning Essentials Kit','Notebook, stationery, and reusable learning pouch.','Skills Lab Academy',500,60),
  ('Grocery Voucher','$20 grocery voucher for household essentials.','Passion2Serve Sponsors',800,40),
  ('Family Experience Pass','Admission for two to a participating community attraction.','Community Experience Partners',1200,20)
) as v(name,description,sponsor_name,points_cost,stock)
where not exists(select 1 from public.rewards r where r.name=v.name);
