insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('event-images', 'event-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "Users upload event images to own folder" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'event-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users update own event images" on storage.objects
  for update to authenticated
  using (bucket_id = 'event-images' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'event-images' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "Users delete own event images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'event-images' and (storage.foldername(name))[1] = (select auth.uid())::text);
