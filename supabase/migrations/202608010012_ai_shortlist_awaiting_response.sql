-- AI-generated shortlist entries represent outreach ready to be sent and
-- therefore begin in the awaiting-response state.
update public.event_businesses
set status = 'awaiting_response',
    contacted_at = coalesce(contacted_at, now())
where status = 'not_contacted';

update public.event_volunteers
set status = 'awaiting_response',
    contacted_at = coalesce(contacted_at, now())
where status = 'recommended';
