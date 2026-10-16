create table if not exists public.photos (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  client_id text not null unique,
  storage_path text not null unique,
  latitude double precision,
  longitude double precision,
  note text,
  favorite boolean not null default false,
  source text not null check (source in ('camera', 'gallery')),
  taken_at timestamptz not null,
  updated_at timestamptz not null,
  created_at timestamptz not null default now()
);

alter table public.photos enable row level security;
drop policy if exists "photos_select_own" on public.photos;
create policy "photos_select_own" on public.photos for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists "photos_insert_own" on public.photos;
create policy "photos_insert_own" on public.photos for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists "photos_update_own" on public.photos;
create policy "photos_update_own" on public.photos for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
drop policy if exists "photos_delete_own" on public.photos;
create policy "photos_delete_own" on public.photos for delete to authenticated using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public)
values ('geocam', 'geocam', false)
on conflict (id) do update set public = false;

drop policy if exists "geocam_insert_own" on storage.objects;
create policy "geocam_insert_own" on storage.objects for insert to authenticated
with check (bucket_id = 'geocam' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "geocam_select_own" on storage.objects;
create policy "geocam_select_own" on storage.objects for select to authenticated
using (bucket_id = 'geocam' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "geocam_update_own" on storage.objects;
create policy "geocam_update_own" on storage.objects for update to authenticated
using (bucket_id = 'geocam' and (storage.foldername(name))[1] = (select auth.uid()::text))
with check (bucket_id = 'geocam' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "geocam_delete_own" on storage.objects;
create policy "geocam_delete_own" on storage.objects for delete to authenticated
using (bucket_id = 'geocam' and (storage.foldername(name))[1] = (select auth.uid()::text));

do $$ begin
  alter publication supabase_realtime add table public.photos;
exception when duplicate_object then null;
end $$;
