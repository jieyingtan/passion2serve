-- Allow anonymous (unauthenticated) users to read feedback that has story_consent = true
-- so that the homepage testimonials section can load without login.
create policy "feedback_public_testimonials"
  on public.participant_feedback
  for select
  to anon
  using (story_consent = true);
