-- Shorten OBS Interact tokens to 16 hex chars (URLs stay manageable).

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

  generated := substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
  insert into public.match_edit_tokens (match_id, token)
  values (p_match_id, generated)
  on conflict (match_id) do update set token = excluded.token
  returning token into generated;
  return generated;
end;
$$;

-- Regenerate every existing token to 16 characters (invalidates old long ?edit= URLs).
update public.match_edit_tokens
set token = substr(replace(gen_random_uuid()::text, '-', ''), 1, 16);
