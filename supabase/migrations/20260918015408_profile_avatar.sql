-- Profile avatars: one column on profiles, a public-read `avatars` bucket, and
-- write policies that keep every nurse inside her own folder.
--
-- Photos personalize the app for beta, so a face shows where initials would
-- otherwise. Storage holds the bytes and profiles holds the PATH, never a URL:
-- a re-upload always writes a new path (`<uid>/avatar-<epoch>.jpg`), so the CDN
-- can never hand back the photo a nurse just replaced, and no cache-busting
-- query param is needed on render.
--
-- Reads are public, Jefle's call 2026-09-18. A public bucket is served from its
-- public URL without touching RLS, and these are faces, not PHI. Writes are the
-- part that needs locking down and they are: every write policy requires the
-- object's first folder segment to equal auth.uid(), so a nurse can only ever
-- write inside her own folder. No select policy exists because nothing in the
-- app lists this bucket, and a public bucket does not consult RLS for a GET.
--
-- `profiles` RLS is untouched. "users update own profile" and "nurses see
-- overlapping coworker profiles" already cover both halves of this feature.

alter table profiles
  add column if not exists avatar_url text;

comment on column profiles.avatar_url is
  'Storage path in the avatars bucket (<uid>/avatar-<epoch>.jpg), not a URL. Build the URL with avatarPublicUrl().';

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

drop policy if exists "avatar owner can insert" on storage.objects;
create policy "avatar owner can insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatar owner can update" on storage.objects;
create policy "avatar owner can update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatar owner can delete" on storage.objects;
create policy "avatar owner can delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
