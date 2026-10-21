# Overlay4S1 Supabase

1. Delete the old **Spotify-Clone** project (dashboard).
2. Create a new project named **Overlay4S1**.
3. Copy Project URL + anon key into `.env.local`.
4. Run these in the SQL editor, in order (see SETUP.md for the full list):
   - existing init / logos / ensure_buyer_profile if not already applied
   - `migrations/20260921120000_packs.sql` through `20260921170000_roundtop_pack.sql`
5. Authentication → Providers: enable GitHub (optional) and/or email.
6. Authentication → URL configuration:
   - Site URL: `https://overlay4-s1.vercel.app`
   - Redirect URLs: `http://localhost:3000/auth/callback`, `http://localhost:3000/auth/callback?next=/auth/update-password`, `https://overlay4-s1.vercel.app/auth/callback`, `https://overlay4-s1.vercel.app/auth/callback?next=/auth/update-password`.
