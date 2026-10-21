# Overlay4S5Shootout setup

Standalone shootout product. **Do not** point this app at Overlay4S1’s Supabase project.

**Admin:** `profiles.is_admin = true` → `/admin`.

---

## 0. New Supabase project

1. Create a **new** project in the Supabase dashboard (not Overlay4S1).
2. `cp .env.example .env.local` and set:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   from **this** project only.
3. Enable Email auth (and GitHub if you want it).

---

## 1. SQL (this project’s SQL Editor)

Run **in order** (all files live in `supabase/migrations/`):

1. `20260901120000_init.sql`
2. `20260903120000_logos.sql`
3. `20260903180000_ensure_buyer_profile.sql` (optional if you only use Admin provision)
4. `20260921120000_packs.sql`
5. `20260921130000_admin.sql`
6. `20260921140000_match_edit_tokens.sql`
7. `20260921150000_short_edit_tokens.sql`
8. `20260921160000_trapezium_pack.sql`
9. `20260921170000_roundtop_pack.sql`
10. `20260922204500_shootout_mode.sql` — `shootout_matches` + Shootout RPCs
11. `20260922210000_fix_shootout_token_rpc.sql`
12. `20260924130000_shootout_history.sql`
13. `20261001120000_match_standby.sql`
14. `20261020120000_match_ball_style.sql`
15. `20261020130000_match_tournament_title.sql`
16. `20261020140000_match_logo3.sql`
17. `20261020150000_match_scoreboard_hidden.sql`

**If packs failed with `relation "public.logos" does not exist`:** run logos.sql, then re-run packs and later files.

**If promote fails with `column "is_admin" … does not exist`:** run `admin.sql` first, then:

```sql
insert into public.profiles (id, display_name)
select u.id, coalesce(u.raw_user_meta_data->>'full_name', u.email)
from auth.users u
on conflict (id) do nothing;

update public.profiles
set is_admin = true
where id = (
  select id from auth.users where email = 'YOUR_EMAIL@example.com'
);
```

---

## 2. Auth URLs

Supabase → Authentication → URL configuration **for this project**:

- **Site URL:** `http://localhost:3000` until you have a Vercel URL
- **Redirect URLs:**
  - `http://localhost:3000/auth/callback`
  - `http://localhost:3000/auth/callback?next=/auth/update-password`

When you deploy S5 to Vercel, add that origin too. Do not use Overlay4S1’s `overlay4-s1.vercel.app` URLs here.

---

## 2b. Local development

Run from `Overlay4S5Shootout/` (use another port if Overlay4S1 already has 3000):

```bash
npm run dev
```

| What you open | Auth needed? |
|---|---|
| `/` hub, `/players`, `/admin` | Yes — sign in |
| `/shootout`, `/shootout-vertical` (no `?edit=`) | No — OBS read-only |
| `/shootout-remote` | Sign in or edit token |

---

## 3. Admin → buyer

1. Sign in → open `/admin`
2. **Create** family + pack
3. **Link** buyer email to that family id
4. Buyer signs in → hub shows Shootout links + Manage players

---

## 4. OBS URLs

- Landscape: `/shootout`
- Vertical: `/shootout-vertical`
- Controller: `/shootout-remote`

Internal match id is still `overlay4s1` in **this** database only. Overlay4S1’s database is separate.

---

## 5. Vercel env (this app only)

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
