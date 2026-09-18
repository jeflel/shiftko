-- Avatars: a nurse has to be able to READ her own folder for a delete to work.
--
-- The first migration (20260918015408) shipped insert/update/delete policies and
-- no select, on the reasoning that a public bucket serves GETs through the public
-- URL without consulting RLS. That is true for a public GET, and it is NOT true
-- for a DELETE: the storage API resolves the objects it is about to remove
-- through the SELECT policy first, so with none in place the delete matched
-- nothing, returned 200 with an empty list, and the file stayed in the bucket.
--
-- Symptom this caused, found by driving the real UI and not by reading the code:
-- Remove photo nulled profiles.avatar_url, the fallback initials came back, and
-- the JPEG was still sitting in storage. Re-uploading had the same leak, since
-- the "delete the previous file" step used the same call.
--
-- Scope is the owner's own folder, matching every other policy on this bucket.
-- It is deliberately not "any authenticated user": nothing in the app reads
-- another nurse's avatar through the API, they are fetched from the public URL.
create policy "avatar owner can read"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
