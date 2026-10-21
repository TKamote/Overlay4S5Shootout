# Overlay4S5 Shootout

Standalone shootout overlay (landscape, vertical, controller). Independent of Overlay4S1 — own git, own `.env.local`, own Supabase.

## Routes

| URL | Use |
|-----|-----|
| `/` | Signed-in hub |
| `/login` | Buyer / admin sign in |
| `/admin` | Provision packs, link emails (admins) |
| `/players` | Roster and logos |
| `/shootout` | Landscape OBS |
| `/shootout-vertical` | Portrait 1080×1920 |
| `/shootout-remote` | Phone controller |

## Setup

See [SETUP.md](SETUP.md). You must create a **new** Supabase project (do not reuse Overlay4S1).

```bash
npm install
cp .env.example .env.local
# fill THIS project's Supabase URL + anon key
npm run dev
```
