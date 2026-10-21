-- Pack isolation: one family per buyer; sold pairs are JhayR and Anthony.
-- Landscape + vertical of the same pack share that pack's roster and logos.

-- Ensure logos table + bucket exist (safe if 20260903120000_logos.sql was skipped).
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

insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

create table if not exists public.packs (
  id text primary key,
  name text not null
);

insert into public.packs (id, name) values
  ('jhayr', 'JhayR'),
  ('anthony', 'Anthony')
on conflict (id) do update set name = excluded.name;

-- Migrate old pack ids from earlier drafts if present.
insert into public.packs (id, name) values
  ('4s2', 'JhayR (legacy id)'),
  ('4s3', 'Anthony (legacy id)')
on conflict (id) do nothing;

create table if not exists public.family_packs (
  family_id uuid not null references public.families (id) on delete cascade,
  pack_id text not null references public.packs (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (family_id, pack_id)
);

alter table public.matches
  add column if not exists pack_id text references public.packs (id),
  add column if not exists orientation text;

alter table public.players
  add column if not exists pack_id text references public.packs (id);

alter table public.logos
  add column if not exists pack_id text references public.packs (id);

-- Existing Overlay4S2 (JhayR) rows → jhayr.
update public.matches
set
  pack_id = coalesce(pack_id, 'jhayr'),
  orientation = coalesce(
    orientation,
    case
      when id like '%vertical%' then 'vertical'
      else 'landscape'
    end
  )
where pack_id is null or orientation is null;

update public.matches set pack_id = 'jhayr' where pack_id = '4s2';
update public.matches set pack_id = 'anthony' where pack_id = '4s3';

update public.players set pack_id = 'jhayr' where pack_id is null;
update public.players set pack_id = 'jhayr' where pack_id = '4s2';
update public.players set pack_id = 'anthony' where pack_id = '4s3';

update public.logos set pack_id = 'jhayr' where pack_id is null;
update public.logos set pack_id = 'jhayr' where pack_id = '4s2';
update public.logos set pack_id = 'anthony' where pack_id = '4s3';

insert into public.family_packs (family_id, pack_id)
select distinct family_id, coalesce(pack_id, 'jhayr')
from public.matches
where family_id is not null
on conflict do nothing;

insert into public.family_packs (family_id, pack_id)
select distinct family_id, coalesce(pack_id, 'jhayr')
from public.players
where family_id is not null
on conflict do nothing;

-- Normalize family_packs legacy ids.
update public.family_packs set pack_id = 'jhayr' where pack_id = '4s2';
update public.family_packs set pack_id = 'anthony' where pack_id = '4s3';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'matches_family_pack_orientation_key'
  ) then
    alter table public.matches
      add constraint matches_family_pack_orientation_key
      unique (family_id, pack_id, orientation);
  end if;
end $$;

create or replace function public.my_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from public.profiles where id = auth.uid()
$$;

create or replace function public.buyer_has_pack(p_pack_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_packs fp
    where fp.family_id = public.my_family_id()
      and fp.pack_id = p_pack_id
  )
$$;

-- New Auth users get an empty profile. Admin links family_id after creating the user.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, family_id, display_name)
  values (
    new.id,
    null,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', new.email)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Admin: create family + pack grant + landscape/vertical matches.
create or replace function public.provision_buyer(p_family_name text, p_pack_id text)
returns table (family_id uuid, pack_id text, orientation text, match_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  fid uuid;
  land_id text;
  vert_id text;
begin
  if p_pack_id not in ('jhayr', 'anthony') then
    raise exception 'Unknown pack % (use jhayr or anthony)', p_pack_id;
  end if;

  insert into public.families (name) values (p_family_name) returning id into fid;
  insert into public.family_packs (family_id, pack_id) values (fid, p_pack_id);

  land_id := gen_random_uuid()::text;
  vert_id := gen_random_uuid()::text;

  insert into public.matches (id, family_id, pack_id, orientation)
  values
    (land_id, fid, p_pack_id, 'landscape'),
    (vert_id, fid, p_pack_id, 'vertical');

  return query
    select fid, p_pack_id, m.orientation, m.id
    from public.matches m
    where m.family_id = fid and m.pack_id = p_pack_id
    order by m.orientation;
end;
$$;

-- Admin: grant a second pack to an existing family (same login, isolated roster).
create or replace function public.grant_pack(p_family_id uuid, p_pack_id text)
returns table (family_id uuid, pack_id text, orientation text, match_id text)
language plpgsql
security definer
set search_path = public
as $$
declare
  land_id text;
  vert_id text;
begin
  if p_pack_id not in ('jhayr', 'anthony') then
    raise exception 'Unknown pack % (use jhayr or anthony)', p_pack_id;
  end if;

  insert into public.family_packs (family_id, pack_id)
  values (p_family_id, p_pack_id)
  on conflict do nothing;

  land_id := gen_random_uuid()::text;
  vert_id := gen_random_uuid()::text;

  insert into public.matches (id, family_id, pack_id, orientation)
  values
    (land_id, p_family_id, p_pack_id, 'landscape'),
    (vert_id, p_family_id, p_pack_id, 'vertical')
  on conflict (family_id, pack_id, orientation) do nothing;

  return query
    select p_family_id, p_pack_id, m.orientation, m.id
    from public.matches m
    where m.family_id = p_family_id and m.pack_id = p_pack_id
    order by m.orientation;
end;
$$;

-- Admin: attach an Auth user (created in the dashboard) to a family.
create or replace function public.link_buyer_email(p_email text, p_family_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  select id into uid from auth.users where lower(email) = lower(p_email) limit 1;
  if uid is null then
    raise exception 'No Auth user with email %', p_email;
  end if;

  insert into public.profiles (id, family_id, display_name)
  values (uid, p_family_id, p_email)
  on conflict (id) do update set family_id = excluded.family_id;
end;
$$;

revoke all on function public.provision_buyer(text, text) from public, anon, authenticated;
revoke all on function public.grant_pack(uuid, text) from public, anon, authenticated;
revoke all on function public.link_buyer_email(text, uuid) from public, anon, authenticated;

-- OBS bootstrap: one match + that pack's players and logos.
create or replace function public.get_overlay_bootstrap(p_match_id text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  m public.matches%rowtype;
begin
  select * into m from public.matches where id = p_match_id;
  if m.id is null then
    return null;
  end if;

  return jsonb_build_object(
    'match', to_jsonb(m),
    'players', coalesce((
      select jsonb_agg(to_jsonb(p) order by p.points desc, p.name)
      from public.players p
      where p.family_id = m.family_id and p.pack_id = m.pack_id
    ), '[]'::jsonb),
    'logos', coalesce((
      select jsonb_agg(to_jsonb(l) order by l.name)
      from public.logos l
      where l.family_id = m.family_id and l.pack_id = m.pack_id
    ), '[]'::jsonb)
  );
end;
$$;

grant execute on function public.get_overlay_bootstrap(text) to anon, authenticated;
grant execute on function public.my_family_id() to authenticated;
grant execute on function public.buyer_has_pack(text) to authenticated;

alter table public.family_packs enable row level security;
alter table public.packs enable row level security;

drop policy if exists "families_select_public" on public.families;
drop policy if exists "families_select_member" on public.families;
create policy "families_select_member" on public.families
  for select to authenticated
  using (id = public.my_family_id());

drop policy if exists "packs_select_auth" on public.packs;
create policy "packs_select_auth" on public.packs
  for select to authenticated
  using (true);

drop policy if exists "family_packs_select_member" on public.family_packs;
create policy "family_packs_select_member" on public.family_packs
  for select to authenticated
  using (family_id = public.my_family_id());

drop policy if exists "players_select_public" on public.players;
drop policy if exists "players_select_member" on public.players;
drop policy if exists "players_select_anon" on public.players;
create policy "players_select_member" on public.players
  for select to authenticated
  using (
    family_id = public.my_family_id()
    and public.buyer_has_pack(pack_id)
  );
create policy "players_select_anon" on public.players
  for select to anon
  using (true);

drop policy if exists "players_write_member" on public.players;
create policy "players_write_member" on public.players
  for all to authenticated
  using (
    family_id = public.my_family_id()
    and public.buyer_has_pack(pack_id)
  )
  with check (
    family_id = public.my_family_id()
    and public.buyer_has_pack(pack_id)
  );

drop policy if exists "matches_select_public" on public.matches;
drop policy if exists "matches_select_member" on public.matches;
drop policy if exists "matches_select_anon" on public.matches;
create policy "matches_select_member" on public.matches
  for select to authenticated
  using (
    family_id = public.my_family_id()
    and public.buyer_has_pack(pack_id)
  );
create policy "matches_select_anon" on public.matches
  for select to anon
  using (true);

drop policy if exists "matches_update_member" on public.matches;
create policy "matches_update_member" on public.matches
  for update to authenticated
  using (
    family_id = public.my_family_id()
    and public.buyer_has_pack(pack_id)
  )
  with check (
    family_id = public.my_family_id()
    and public.buyer_has_pack(pack_id)
  );

drop policy if exists "matches_insert_member" on public.matches;
create policy "matches_insert_member" on public.matches
  for insert to authenticated
  with check (
    family_id = public.my_family_id()
    and public.buyer_has_pack(pack_id)
  );

drop policy if exists "logos_select_public" on public.logos;
drop policy if exists "logos_select_member" on public.logos;
drop policy if exists "logos_select_anon" on public.logos;
create policy "logos_select_member" on public.logos
  for select to authenticated
  using (
    family_id = public.my_family_id()
    and public.buyer_has_pack(pack_id)
  );
create policy "logos_select_anon" on public.logos
  for select to anon
  using (true);

drop policy if exists "logos_write_member" on public.logos;
create policy "logos_write_member" on public.logos
  for all to authenticated
  using (
    family_id = public.my_family_id()
    and public.buyer_has_pack(pack_id)
  )
  with check (
    family_id = public.my_family_id()
    and public.buyer_has_pack(pack_id)
  );

drop policy if exists "player_photos_auth_write" on storage.objects;
drop policy if exists "player_photos_auth_update" on storage.objects;
drop policy if exists "overlay_logos_auth_write" on storage.objects;
drop policy if exists "overlay_logos_auth_update" on storage.objects;
drop policy if exists "overlay_logos_auth_delete" on storage.objects;

create policy "player_photos_auth_write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'player-photos'
    and (storage.foldername(name))[1] = public.my_family_id()::text
  );

create policy "player_photos_auth_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'player-photos'
    and (storage.foldername(name))[1] = public.my_family_id()::text
  );

create policy "overlay_logos_auth_write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = public.my_family_id()::text
  );

create policy "overlay_logos_auth_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = public.my_family_id()::text
  );

create policy "overlay_logos_auth_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'logos'
    and (storage.foldername(name))[1] = public.my_family_id()::text
  );
