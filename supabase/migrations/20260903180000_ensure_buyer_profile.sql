-- Link existing Auth users to a family. handle_new_user only runs on INSERT,
-- so accounts created before the init SQL have a session but no profiles row.
-- Client cannot insert into profiles (no INSERT policy); this RPC is security definer.

create or replace function public.ensure_buyer_profile()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  fid uuid;
  display text;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  select p.family_id into fid
  from public.profiles p
  where p.id = uid;

  if fid is not null then
    return fid;
  end if;

  select p.family_id into fid
  from public.profiles p
  where p.family_id is not null
  limit 1;

  if fid is null then
    select f.id into fid from public.families f limit 1;
  end if;

  if fid is null then
    insert into public.families (name) values ('Overlay4S1') returning id into fid;
  end if;

  insert into public.matches (id, family_id)
  values ('overlay4s1', fid), ('overlay4s1-vertical', fid)
  on conflict (id) do update
    set family_id = coalesce(public.matches.family_id, excluded.family_id);

  select coalesce(
    u.raw_user_meta_data->>'full_name',
    u.raw_user_meta_data->>'name',
    u.email
  )
  into display
  from auth.users u
  where u.id = uid;

  insert into public.profiles (id, family_id, display_name)
  values (uid, fid, display)
  on conflict (id) do update
    set family_id = coalesce(public.profiles.family_id, excluded.family_id),
        display_name = coalesce(public.profiles.display_name, excluded.display_name);

  return fid;
end;
$$;

revoke all on function public.ensure_buyer_profile() from public;
grant execute on function public.ensure_buyer_profile() to authenticated;
