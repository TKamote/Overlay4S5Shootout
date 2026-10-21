-- Third overlay logo slot (controller + OBS).

alter table public.matches
  add column if not exists logo3_url text not null default '';

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
    'logo2_url',
    'logo3_url',
    'is_standby',
    'ball_style',
    'tournament_title',
    'running_subtitle'
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
    logo3_url = case when clean ? 'logo3_url' then clean ->> 'logo3_url' else logo3_url end,
    is_standby = case
      when clean ? 'is_standby' then (clean ->> 'is_standby')::boolean
      else is_standby
    end,
    ball_style = coalesce(clean ->> 'ball_style', ball_style),
    tournament_title = coalesce(clean ->> 'tournament_title', tournament_title),
    running_subtitle = case
      when clean ? 'running_subtitle' then coalesce(clean ->> 'running_subtitle', '')
      else running_subtitle
    end,
    updated_at = now()
  where id = p_match_id;
end;
$$;

grant execute on function public.update_match_with_token(text, text, jsonb) to anon, authenticated;
