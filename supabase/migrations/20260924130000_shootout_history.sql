-- Shootout append-only results history for PNG proof / playoffs.

alter table public.shootout_matches
  add column if not exists shoot_history jsonb not null default '[]'::jsonb;

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
    shoot_history = coalesce(p_patch->'shoot_history', shoot_history),
    updated_at = now()
  where id = p_match_id;
end;
$$;
