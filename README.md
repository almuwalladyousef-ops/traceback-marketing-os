# Traceback Marketing OS

Internal marketing dashboard. Next.js 15 + Supabase + Tailwind.

## Setup

### 1. Supabase project

Create a free project at [supabase.com](https://supabase.com). Copy your project URL and keys.

### 2. Run the migration

Using the Supabase CLI:
```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

Or paste the contents of `supabase/migrations/0001_init.sql` into the Supabase SQL Editor and run it.

### 3. Enable Supabase Realtime

In the Supabase dashboard: **Database → Replication → Realtime**. Enable replication for all tables:
`companies`, `contacts`, `influencers`, `personal_leads`, `content_pieces`, `content_analysis`, `comment_logs`

### 4. Environment variables

```bash
cp .env.local.example .env.local
```

Fill in:
- `NEXT_PUBLIC_SUPABASE_URL` — Project URL (Settings → API)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anon/public key (Settings → API)
- `SUPABASE_SERVICE_ROLE_KEY` — Service role key (Settings → API)
- `APP_PASSWORD` — The shared login password
- `APP_SECRET` — A long random string for HMAC signing (e.g. `openssl rand -hex 32`)

### 5. Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` — redirects to `/login`.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import into [Vercel](https://vercel.com) — Next.js is auto-detected.
3. Add all 5 env vars in Vercel project settings.
4. Deploy. Share the URL.

## Architecture

| Concern | Approach |
|---|---|
| Auth | HMAC-signed `tb_auth` cookie; middleware checks every request |
| DB reads | Server components via service role key |
| DB writes | Server actions via service role key |
| Realtime | Supabase `postgres_changes` → `router.refresh()` |
| Access model | Single shared password (no user accounts) |
