# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development

```bash
# Install deps (once)
npm install

# Local dev server — runs API routes + static files together
npx vercel dev          # http://localhost:3000
```

There is no build step, test suite, or linter. The frontend is plain HTML served as static files by Vercel.

## Environment

Copy `.env.example` → `.env` and fill in all six variables before running locally:

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
RESEND_FROM
APP_URL
```

## Architecture

**Two distinct JS contexts — never mix them:**

| Context | Entry point | Supabase client |
|---|---|---|
| Browser | `js/auth.js` | Anon key, fetched at runtime from `/api/config` |
| Serverless (Node) | `api/**`, `lib/**` | Service role key via `lib/supabase.js` |

`lib/supabase.js` exports `supabaseAdmin` and `verifyAuth()`. Import it only in `api/` files — it uses `SUPABASE_SERVICE_ROLE_KEY` which must never reach the browser.

**Auth flow:** `js/auth.js` initialises a Supabase JS v2 client by fetching `/api/config` (which returns the public anon key). All auth state is stored in `_session`. Protected API calls attach `Authorization: Bearer <token>` and the server-side `verifyAuth()` validates the JWT against Supabase.

**Dataset lifecycle:** Submitted datasets land with `status: 'pending'`. Only rows with `status: 'active'` are returned by `GET /api/datasets`. Approval happens via the admin panel (`admin.html`).

**Routing:** `vercel.json` sets `cleanUrls: true` so `about.html` is served at `/about`. No routing config needed when adding new `.html` pages.

## Pages

| File | Route | Purpose |
|---|---|---|
| `index.html` | `/` | Main portal — hero, categories, featured datasets |
| `about.html` | `/about` | Mission, team, partners |
| `news.html` | `/news` | Filterable news/announcements grid |
| `impact.html` | `/impact` | Stats, case studies, SDG alignment |
| `api-docs.html` | `/api-docs` | REST API reference |
| `submit.html` | `/submit` | Dataset submission form |
| `datasets.html` | `/datasets` | Browse/search catalog |
| `dataset-view.html` | `/dataset-view` | Single dataset detail |
| `admin.html` | `/admin` | Dataset moderation (role-gated) |

## Design system

Tailwind config is inlined in each HTML file's `<script id="tailwind-config">` block. Key tokens:

- **Colors:** `secondary` (`#ba0035`) is the primary action colour. `primary-container` (`#131b2e`) is the dark navy used for hero/CTA backgrounds.
- **Spacing:** `margin-mobile` (20px) / `margin-desktop` (64px) for horizontal page padding — always use `px-margin-mobile md:px-margin-desktop` together, never one alone.
- **Typography:** `font-display-lg` / `text-display-lg` (48px) for hero headings — scale down on mobile with `text-[1.75rem] sm:text-[2.25rem] md:text-display-lg`.
- **Animations:** Hero texts use `heroFloat` keyframes (defined in `index.html` `<style>`). Scroll-reveal uses `.reveal` + IntersectionObserver pattern.

When adding a new page, copy the Tailwind config block and nav from an existing page (e.g. `about.html`) — the condensed single-line colour map there is the canonical version.

## Database schema

Two tables in `supabase/migrations/001_initial.sql`:

- `profiles` — mirrors `auth.users`, stores `role` (`contributor` | `admin`). Auto-created by trigger on signup.
- `datasets` — core table. Key columns: `status` (`pending`/`active`/`rejected`), `submitted_by` (UUID FK to auth.users), `format` (text array), `file_url` (hosted file) vs `source_url` (external link).

RLS is enabled on both tables. The service role key in `lib/supabase.js` bypasses RLS intentionally for server-side operations.
