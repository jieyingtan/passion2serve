-- Keep one event selection per displayed person or organisation, preferring
-- the selection that has progressed furthest through outreach.
with ranked as (
  select ev.id,
    row_number() over (
      partition by ev.event_id, lower(trim(v.full_name))
      order by case ev.status
        when 'attended' then 7 when 'confirmed' then 6 when 'awaiting_response' then 5
        when 'contacted' then 4 when 'recommended' then 3 when 'declined' then 2
        when 'no_show' then 1 else 0 end desc,
        ev.match_score desc, ev.updated_at desc
    ) as duplicate_number
  from public.event_volunteers ev
  join public.volunteers v on v.id = ev.volunteer_id
)
delete from public.event_volunteers ev
using ranked
where ev.id = ranked.id and ranked.duplicate_number > 1;

with ranked as (
  select eb.id,
    row_number() over (
      partition by eb.event_id, lower(trim(b.name))
      order by case eb.status
        when 'confirmed' then 4 when 'awaiting_response' then 3
        when 'not_contacted' then 2 when 'declined' then 1 else 0 end desc,
        eb.match_score desc, eb.updated_at desc
    ) as duplicate_number
  from public.event_businesses eb
  join public.businesses b on b.id = eb.business_id
)
delete from public.event_businesses eb
using ranked
where eb.id = ranked.id and ranked.duplicate_number > 1;

-- Remove old generated recommendations without evidence for the event type.
-- Contacted, confirmed, declined and attendance records are preserved.
delete from public.event_volunteers ev
using public.volunteers v, public.events e
where ev.volunteer_id = v.id
  and ev.event_id = e.id
  and ev.status = 'recommended'
  and not case e.event_type
    when 'Items to Serve' then lower(array_to_string(v.interests || v.skills, ' ')) ~ '(pre.?loved|sort|pack|donat|collection|distribution|outreach|logistic|transport|driv|deliver|warehouse|storage|inventory|stock|sustainab|recycl|reuse)'
    when 'Knowledge to Serve' then lower(array_to_string(v.interests || v.skills, ' ')) ~ '(computer|digital|technology|it support|mobile app|teach|train|facilitat|coach|education|course administration|learning material|classroom)'
    when 'Peace to Serve' then lower(array_to_string(v.interests || v.skills, ' ')) ~ '(yoga|zumba|fitness instruction|exercise instructor|meditat|mindful|breathing|mental wellness|wellbeing|wellness|peer support|active ageing|senior fitness)'
    else false
  end;

delete from public.event_businesses eb
using public.businesses b, public.events e
where eb.business_id = b.id
  and eb.event_id = e.id
  and eb.status = 'not_contacted'
  and not case e.event_type
    when 'Items to Serve' then lower(array_to_string(b.capabilities, ' ')) ~ '(pre.?loved|sort|pack|donat|collection|distribution|outreach|logistic|transport|driv|deliver|warehouse|storage|inventory|stock|sustainab|recycl|reuse|condominium|event venue)'
    when 'Knowledge to Serve' then lower(array_to_string(b.capabilities, ' ')) ~ '(computer|digital|technology|it support|mobile app|teach|train|facilitat|coach|education|course administration|learning material|classroom)'
    when 'Peace to Serve' then lower(array_to_string(b.capabilities, ' ')) ~ '(yoga|zumba|fitness instruction|exercise instructor|meditat|mindful|breathing|mental wellness|wellbeing|wellness|peer support|active ageing|senior fitness|studio space)'
    else false
  end;
