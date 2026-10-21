-- Overlay4S1 Phase 2 schema: families, profiles, players, matches, photo storage.

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Overlay4S1',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  family_id uuid references public.families (id) on delete set null,
  display_name text,
  created_at timestamptz not null default now()
);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  name text not null,
  photo_url text,
  points int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.matches (
  id text primary key,
  family_id uuid references public.families (id) on delete set null,
  player1_id uuid references public.players (id) on delete set null,
  player2_id uuid references public.players (id) on delete set null,
  player1_score int not null default 0,
  player2_score int not null default 0,
  race_to int not null default 10,
  pocketed_balls int[] not null default '{}',
  game_mode text not null default '9-ball',
  updated_at timestamptz not null default now()
);

alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.players enable row level security;
alter table public.matches enable row level security;

-- OBS browser sources are anonymous: public read.
create policy "families_select_public" on public.families for select using (true);
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "players_select_public" on public.players for select using (true);
create policy "matches_select_public" on public.matches for select using (true);

-- Only the signed-in buyer can write.
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

create policy "players_write_member" on public.players
  for all using (
    family_id in (select family_id from public.profiles where id = auth.uid())
  )
  with check (
    family_id in (select family_id from public.profiles where id = auth.uid())
  );

create policy "matches_update_member" on public.matches
  for update using (
    family_id in (select family_id from public.profiles where id = auth.uid())
  )
  with check (
    family_id in (select family_id from public.profiles where id = auth.uid())
  );

create policy "matches_insert_member" on public.matches
  for insert with check (
    family_id in (select family_id from public.profiles where id = auth.uid())
  );

insert into storage.buckets (id, name, public)
values ('player-photos', 'player-photos', true)
on conflict (id) do nothing;

create policy "player_photos_public_read"
  on storage.objects for select
  using (bucket_id = 'player-photos');

create policy "player_photos_auth_write"
  on storage.objects for insert
  with check (bucket_id = 'player-photos' and auth.role() = 'authenticated');

create policy "player_photos_auth_update"
  on storage.objects for update
  using (bucket_id = 'player-photos' and auth.role() = 'authenticated');

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fid uuid;
begin
  select family_id into fid from public.profiles where family_id is not null limit 1;

  if fid is null then
    insert into public.families (name) values ('Overlay4S1') returning id into fid;

    insert into public.matches (id, family_id)
    values ('overlay4s1', fid), ('overlay4s1-vertical', fid)
    on conflict (id) do update set family_id = excluded.family_id;

    insert into public.players (family_id, name, points) values
      (fid, 'Alex Rivera', 120),
      (fid, 'Jordan Lee', 105),
      (fid, 'Sam Torres', 98),
      (fid, 'Chris Park', 87);
  end if;

  insert into public.profiles (id, family_id, display_name)
  values (
    new.id,
    fid,
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

alter publication supabase_realtime add table public.matches;
alter publication supabase_realtime add table public.players;
