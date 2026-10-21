-- Admin role: list all buyer overlays; call provision/link from the app.
-- Buyers stay Option B (one family, one pack). Admins bypass family RLS.

alter table public.profiles
  add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select is_admin from public.profiles where id = auth.uid()),
    false
  )
$$;

grant execute on function public.is_admin() to authenticated;

-- All sold pairs + match ids for the admin console.
create or replace function public.admin_list_overlays()
returns table (
  family_id uuid,
  family_name text,
  pack_id text,
  orientation text,
  match_id text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Not an admin';
  end if;

  return query
    select
      f.id,
      f.name,
      m.pack_id,
      m.orientation,
      m.id
    from public.families f
    join public.matches m on m.family_id = f.id
    where m.pack_id is not null
    order by f.name, m.pack_id, m.orientation;
end;
$$;

grant execute on function public.admin_list_overlays() to authenticated;
revoke all on function public.admin_list_overlays() from public, anon;

-- Re-define provision/link/grant so only admins can call from the client.
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
  -- SQL Editor has no auth.uid(); browser clients must be admin.
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Not an admin';
  end if;
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
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Not an admin';
  end if;
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

create or replace function public.link_buyer_email(p_email text, p_family_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid;
begin
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Not an admin';
  end if;

  select id into uid from auth.users where lower(email) = lower(p_email) limit 1;
  if uid is null then
    raise exception 'No Auth user with email %', p_email;
  end if;

  insert into public.profiles (id, family_id, display_name)
  values (uid, p_family_id, p_email)
  on conflict (id) do update set family_id = excluded.family_id;
end;
$$;

-- App admins may call these; functions still enforce is_admin().
-- SQL Editor (postgres role) can still run them via security definer regardless.
grant execute on function public.provision_buyer(text, text) to authenticated;
grant execute on function public.grant_pack(uuid, text) to authenticated;
grant execute on function public.link_buyer_email(text, uuid) to authenticated;
revoke all on function public.provision_buyer(text, text) from public, anon;
revoke all on function public.grant_pack(uuid, text) from public, anon;
revoke all on function public.link_buyer_email(text, uuid) from public, anon;

-- RLS: admins can read/write every family / pack / roster / logo / match.
drop policy if exists "families_select_member" on public.families;
create policy "families_select_member" on public.families
  for select to authenticated
  using (id = public.my_family_id() or public.is_admin());

drop policy if exists "family_packs_select_member" on public.family_packs;
create policy "family_packs_select_member" on public.family_packs
  for select to authenticated
  using (family_id = public.my_family_id() or public.is_admin());

drop policy if exists "players_select_member" on public.players;
create policy "players_select_member" on public.players
  for select to authenticated
  using (
    public.is_admin()
    or (
      family_id = public.my_family_id()
      and public.buyer_has_pack(pack_id)
    )
  );

drop policy if exists "players_write_member" on public.players;
create policy "players_write_member" on public.players
  for all to authenticated
  using (
    public.is_admin()
    or (
      family_id = public.my_family_id()
      and public.buyer_has_pack(pack_id)
    )
  )
  with check (
    public.is_admin()
    or (
      family_id = public.my_family_id()
      and public.buyer_has_pack(pack_id)
    )
  );

drop policy if exists "matches_select_member" on public.matches;
create policy "matches_select_member" on public.matches
  for select to authenticated
  using (
    public.is_admin()
    or (
      family_id = public.my_family_id()
      and public.buyer_has_pack(pack_id)
    )
  );

drop policy if exists "matches_update_member" on public.matches;
create policy "matches_update_member" on public.matches
  for update to authenticated
  using (
    public.is_admin()
    or (
      family_id = public.my_family_id()
      and public.buyer_has_pack(pack_id)
    )
  )
  with check (
    public.is_admin()
    or (
      family_id = public.my_family_id()
      and public.buyer_has_pack(pack_id)
    )
  );

drop policy if exists "matches_insert_member" on public.matches;
create policy "matches_insert_member" on public.matches
  for insert to authenticated
  with check (
    public.is_admin()
    or (
      family_id = public.my_family_id()
      and public.buyer_has_pack(pack_id)
    )
  );

drop policy if exists "logos_select_member" on public.logos;
create policy "logos_select_member" on public.logos
  for select to authenticated
  using (
    public.is_admin()
    or (
      family_id = public.my_family_id()
      and public.buyer_has_pack(pack_id)
    )
  );

drop policy if exists "logos_write_member" on public.logos;
create policy "logos_write_member" on public.logos
  for all to authenticated
  using (
    public.is_admin()
    or (
      family_id = public.my_family_id()
      and public.buyer_has_pack(pack_id)
    )
  )
  with check (
    public.is_admin()
    or (
      family_id = public.my_family_id()
      and public.buyer_has_pack(pack_id)
    )
  );

-- Storage: admins may upload under any family folder.
drop policy if exists "player_photos_auth_write" on storage.objects;
drop policy if exists "player_photos_auth_update" on storage.objects;
drop policy if exists "overlay_logos_auth_write" on storage.objects;
drop policy if exists "overlay_logos_auth_update" on storage.objects;
drop policy if exists "overlay_logos_auth_delete" on storage.objects;

create policy "player_photos_auth_write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'player-photos'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = public.my_family_id()::text
    )
  );

create policy "player_photos_auth_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'player-photos'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = public.my_family_id()::text
    )
  );

create policy "overlay_logos_auth_write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'logos'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = public.my_family_id()::text
    )
  );

create policy "overlay_logos_auth_update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'logos'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = public.my_family_id()::text
    )
  );

create policy "overlay_logos_auth_delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'logos'
    and (
      public.is_admin()
      or (storage.foldername(name))[1] = public.my_family_id()::text
    )
  );

-- After this migration, promote yourself (SQL Editor):
-- update public.profiles set is_admin = true
-- where id = (select id from auth.users where email = 'davidonquit@yahoo.com');

-- Block buyers from setting is_admin on their own profile row.
create or replace function public.profiles_block_admin_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'UPDATE'
    and old.is_admin is distinct from new.is_admin
    and auth.uid() is not null
    and not coalesce(old.is_admin, false)
  then
    raise exception 'Cannot change is_admin';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_block_admin_escalation on public.profiles;
create trigger profiles_block_admin_escalation
  before update on public.profiles
  for each row execute procedure public.profiles_block_admin_escalation();
