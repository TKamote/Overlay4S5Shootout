-- OBS Interact: edit tokens live outside matches so Realtime never leaks them.

create table if not exists public.match_edit_tokens (
  match_id text primary key references public.matches (id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now()
);

alter table public.match_edit_tokens enable row level security;

drop policy if exists "match_edit_tokens_select_member" on public.match_edit_tokens;
create policy "match_edit_tokens_select_member" on public.match_edit_tokens
  for select to authenticated
  using (
    exists (
      select 1
      from public.matches m
      where m.id = match_id
        and (
          public.is_admin()
          or (
            m.family_id = public.my_family_id()
            and m.pack_id is not null
            and public.buyer_has_pack(m.pack_id)
          )
        )
    )
  );

create or replace function public.ensure_match_edit_token(p_match_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  existing text;
  generated text;
begin
  select token into existing from public.match_edit_tokens where match_id = p_match_id;
  if existing is not null then
    return existing;
  end if;

  generated := replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '');
  insert into public.match_edit_tokens (match_id, token)
  values (p_match_id, generated)
  on conflict (match_id) do update set token = excluded.token
  returning token into generated;
  return generated;
end;
$$;

-- Backfill tokens for every existing match.
insert into public.match_edit_tokens (match_id, token)
select m.id, replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', '')
from public.matches m
on conflict (match_id) do nothing;

-- Auto-create token whenever a match is inserted.
create or replace function public.matches_ensure_edit_token()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ensure_match_edit_token(new.id);
  return new;
end;
$$;

drop trigger if exists matches_ensure_edit_token on public.matches;
create trigger matches_ensure_edit_token
  after insert on public.matches
  for each row execute procedure public.matches_ensure_edit_token();

create or replace function public.verify_match_edit_token(p_match_id text, p_token text)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_match_id is null or p_token is null or length(trim(p_token)) = 0 then
    return false;
  end if;
  return exists (
    select 1
    from public.match_edit_tokens t
    where t.match_id = p_match_id and t.token = p_token
  );
end;
$$;

create or replace function public.update_match_with_token(
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
  clean jsonb := '{}'::jsonb;
  key text;
  allowed text[] := array[
    'player1_score',
    'player2_score',
    'race_to',
    'pocketed_balls',
    'game_mode',
    'player1_id',
    'player2_id',
    'logo1_url',
    'logo2_url'
  ];
begin
  if not public.verify_match_edit_token(p_match_id, p_token) then
    raise exception 'Invalid edit token';
  end if;

  if p_patch is null or jsonb_typeof(p_patch) <> 'object' then
    return;
  end if;

  foreach key in array allowed loop
    if p_patch ? key then
      clean := clean || jsonb_build_object(key, p_patch -> key);
    end if;
  end loop;

  if clean = '{}'::jsonb then
    return;
  end if;

  clean := clean || jsonb_build_object('updated_at', to_jsonb(now()));

  update public.matches
  set
    player1_score = coalesce((clean ->> 'player1_score')::int, player1_score),
    player2_score = coalesce((clean ->> 'player2_score')::int, player2_score),
    race_to = coalesce((clean ->> 'race_to')::int, race_to),
    pocketed_balls = case
      when clean ? 'pocketed_balls' then (
        select coalesce(array_agg((elem #>> '{}')::int), '{}'::int[])
        from jsonb_array_elements(coalesce(clean -> 'pocketed_balls', '[]'::jsonb)) as t(elem)
      )
      else pocketed_balls
    end,
    game_mode = coalesce(clean ->> 'game_mode', game_mode),
    player1_id = case when clean ? 'player1_id' then clean ->> 'player1_id' else player1_id end,
    player2_id = case when clean ? 'player2_id' then clean ->> 'player2_id' else player2_id end,
    logo1_url = case when clean ? 'logo1_url' then clean ->> 'logo1_url' else logo1_url end,
    logo2_url = case when clean ? 'logo2_url' then clean ->> 'logo2_url' else logo2_url end,
    updated_at = now()
  where id = p_match_id;
end;
$$;

grant execute on function public.verify_match_edit_token(text, text) to anon, authenticated;
grant execute on function public.update_match_with_token(text, text, jsonb) to anon, authenticated;
grant execute on function public.ensure_match_edit_token(text) to authenticated;
grant select on public.match_edit_tokens to authenticated;

revoke all on function public.ensure_match_edit_token(text) from anon;
revoke all on table public.match_edit_tokens from anon;
