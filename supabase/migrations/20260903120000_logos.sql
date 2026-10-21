-- Logos library per family + logo slots on match rows.
-- Safe to re-run (drops policies if they already exist).

create table if not exists public.logos (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null,
  logo_url text not null,
  created_at timestamptz not null default now()
);

alter table public.matches
  add column if not exists logo1_url text,
  add column if not exists logo2_url text;

alter table public.logos enable row level security;

drop policy if exists "logos_select_public" on public.logos;
create policy "logos_select_public"
  on public.logos for select using (true);

drop policy if exists "logos_write_member" on public.logos;
create policy "logos_write_member"
  on public.logos for all using (
    family_id in (select family_id from public.profiles where id = auth.uid())
  )
  with check (
    family_id in (select family_id from public.profiles where id = auth.uid())
  );

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

drop policy if exists "logos_storage_public_read" on storage.objects;
create policy "logos_storage_public_read"
  on storage.objects for select
  using (bucket_id = 'logos');

drop policy if exists "logos_storage_auth_write" on storage.objects;
create policy "logos_storage_auth_write"
  on storage.objects for insert
  with check (bucket_id = 'logos' and auth.role() = 'authenticated');

drop policy if exists "logos_storage_auth_update" on storage.objects;
create policy "logos_storage_auth_update"
  on storage.objects for update
  using (bucket_id = 'logos' and auth.role() = 'authenticated');

drop policy if exists "logos_storage_auth_delete" on storage.objects;
create policy "logos_storage_auth_delete"
  on storage.objects for delete
  using (bucket_id = 'logos' and auth.role() = 'authenticated');
