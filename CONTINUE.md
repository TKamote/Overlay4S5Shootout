# Continue here (Overlay4S5Shootout)

Open this folder in Cursor and tell the agent: **read `CONTINUE.md` and `SETUP.md`.**

This folder is a **standalone** copy of Overlay4S1’s shootout product. Overlay4S1 was not modified. Its `/shootout` is a separate alternative on the original Supabase.

## Already done

- Copied Overlay4S1 into this existing sibling folder (`OverlayForSale/Overlay4S5Shootout`)
- Own git repo (no Overlay4S1 history), `npm install`, package name `overlay4s5-shootout`
- Hub slimmed to Shootout overlay / vertical / controller + Manage players & logos
- Branding: Overlay4S5 Shootout
- `.env.example` only — Overlay4S1 secrets were not copied

## You do next

1. Create a **new** Supabase project (not Overlay4S1’s).
2. `cp .env.example .env.local` and paste **that** project’s URL + anon key.
3. Run the SQL in [SETUP.md](SETUP.md) **in order**.
4. Auth → URL configuration: `http://localhost:3000/auth/callback` (and the update-password variant).
5. `npm run dev` from this folder (use another port if Overlay4S1 already has 3000).

## Later (optional)

Leftover `/overlay` scoreboard routes were removed. This app is shootout-only.

## Do not

- Point `.env.local` at Overlay4S1’s Supabase
- Edit Overlay4S1 unless you mean to change that product
