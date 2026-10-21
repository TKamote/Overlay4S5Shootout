-- One shootout library for the fixed Overlay4S1 match. Not an overlay buyer pack.

insert into public.packs (id, name)
values ('shootout', 'Shootout')
on conflict (id) do update set name = excluded.name;

do $$
declare
  fid uuid;
  uid uuid;
begin
  select family_id into fid
  from public.matches
  where id = 'overlay4s1';

  if fid is null then
    insert into public.families (name)
    values ('Shootout')
    returning id into fid;
  end if;

  insert into public.matches (id, family_id, pack_id, orientation)
  values ('overlay4s1', fid, 'shootout', 'landscape')
  on conflict (id) do update
    set family_id = coalesce(public.matches.family_id, excluded.family_id),
        pack_id = 'shootout',
        orientation = coalesce(public.matches.orientation, excluded.orientation);

  select family_id into fid
  from public.matches
  where id = 'overlay4s1';

  insert into public.family_packs (family_id, pack_id)
  values (fid, 'shootout')
  on conflict do nothing;

  update public.shootout_matches
  set family_id = fid,
      pack_id = 'shootout'
  where id = 'overlay4s1';

  update public.players
  set pack_id = 'shootout'
  where family_id = fid
    and pack_id is distinct from 'shootout';

  update public.logos
  set pack_id = 'shootout'
  where family_id = fid
    and pack_id is distinct from 'shootout';

  select id into uid
  from auth.users
  where lower(email) = lower('David.onquit2012@gmail.com')
  limit 1;

  if uid is not null then
    insert into public.profiles (id, family_id, display_name)
    values (uid, fid, 'David.onquit2012@gmail.com')
    on conflict (id) do update
      set family_id = excluded.family_id;
  end if;
end $$;

-- Admin create must accept this library. Overlay pack names are not used here.
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
  if auth.uid() is not null and not public.is_admin() then
    raise exception 'Not an admin';
  end if;
  if p_pack_id <> 'shootout' then
    raise exception 'Unknown pack % (use shootout)', p_pack_id;
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
  if p_pack_id <> 'shootout' then
    raise exception 'Unknown pack % (use shootout)', p_pack_id;
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

grant execute on function public.provision_buyer(text, text) to authenticated;
grant execute on function public.grant_pack(uuid, text) to authenticated;
revoke all on function public.provision_buyer(text, text) from public, anon;
revoke all on function public.grant_pack(uuid, text) from public, anon;
