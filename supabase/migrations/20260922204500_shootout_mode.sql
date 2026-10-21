create table if not exists public.shootout_matches (
  id text primary key,
  family_id uuid references public.families (id) on delete set null,
  pack_id text,
  
  title text not null default 'SHOOTOUT TOURNAMENT',
  ticker_1 text not null default 'Welcome to the Live Stream',
  ticker_2 text not null default 'Follow us on social media',
  
  logo_1_url text,
  logo_2_url text,
  logo_3_url text,
  
  sponsor_image_url text,
  show_sponsor boolean not null default false,
  
  is_standby boolean not null default true,
  
  players jsonb not null default '[]'::jsonb,
  
  updated_at timestamptz not null default now()
);

alter table public.shootout_matches enable row level security;

-- OBS browser sources are anonymous: public read.
create policy "shootout_matches_select_public" on public.shootout_matches for select using (true);

-- Only the signed-in buyer can write.
create policy "shootout_matches_update_member" on public.shootout_matches
  for update using (
    family_id in (select family_id from public.profiles where id = auth.uid())
  )
  with check (
    family_id in (select family_id from public.profiles where id = auth.uid())
  );

create policy "shootout_matches_insert_member" on public.shootout_matches
  for insert with check (
    family_id in (select family_id from public.profiles where id = auth.uid())
  );

alter publication supabase_realtime add table public.shootout_matches;

-- Add a function to update shootout matches using the short edit token
create or replace function public.update_shootout_match_with_token(
  p_match_id text,
  p_token text,
  p_patch jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family_id uuid;
  v_match_family_id uuid;
  v_pack_id text;
begin
  -- 1. Find the family that owns this edit token (same tokens as race-to overlays).
  select m.family_id, m.pack_id
  into v_family_id, v_pack_id
  from public.match_edit_tokens t
  join public.matches m on m.id = t.match_id
  where t.token = p_token
    and t.match_id = p_match_id
  limit 1;

  if v_family_id is null then
    raise exception 'Invalid or missing edit token.';
  end if;

  -- 2. Check if the match exists and get its family_id
  select family_id
  into v_match_family_id
  from public.shootout_matches
  where id = p_match_id;

  if v_match_family_id is null then
    insert into public.shootout_matches (id, family_id, pack_id)
    values (p_match_id, v_family_id, v_pack_id);
    v_match_family_id := v_family_id;
  end if;

  if v_match_family_id != v_family_id then
    raise exception 'Token does not have permission for this match.';
  end if;

  -- 3. Apply the JSONB patch
  update public.shootout_matches
  set 
    title = coalesce((p_patch->>'title'), title),
    ticker_1 = coalesce((p_patch->>'ticker_1'), ticker_1),
    ticker_2 = coalesce((p_patch->>'ticker_2'), ticker_2),
    logo_1_url = coalesce((p_patch->>'logo_1_url'), logo_1_url),
    logo_2_url = coalesce((p_patch->>'logo_2_url'), logo_2_url),
    logo_3_url = coalesce((p_patch->>'logo_3_url'), logo_3_url),
    sponsor_image_url = coalesce((p_patch->>'sponsor_image_url'), sponsor_image_url),
    show_sponsor = coalesce((p_patch->>'show_sponsor')::boolean, show_sponsor),
    is_standby = coalesce((p_patch->>'is_standby')::boolean, is_standby),
    players = coalesce(p_patch->'players', players),
    updated_at = now()
  where id = p_match_id;
end;
$$;
