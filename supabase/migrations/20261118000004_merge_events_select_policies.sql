drop policy "Anyone reads published events" on public.events;
drop policy "Organizers read own events" on public.events;

create policy "Anonymous reads published events" on public.events
  for select to anon using (status = 'published');

create policy "Signed-in users read published or own events" on public.events
  for select to authenticated
  using (status = 'published' or organizer_id = (select auth.uid()));
