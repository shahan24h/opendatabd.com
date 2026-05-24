# OpenDataBD — Setup & Deployment Guide

## Stack

| Layer       | Service                      |
|-------------|------------------------------|
| Frontend    | Vanilla HTML + Tailwind CSS  |
| Auth        | Supabase Auth                |
| Database    | Supabase Postgres            |
| Email       | Resend                       |
| Deployment  | Vercel (GitHub integration)  |

---

## 1 · Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase/migrations/001_initial.sql`
3. Under **Settings → API**, copy:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

### Auth settings (Dashboard → Authentication → URL Configuration)

| Field              | Value                                      |
|--------------------|--------------------------------------------|
| Site URL           | `https://opendatabd.com`                   |
| Redirect URLs      | `https://opendatabd.com/*`                 |

---

## 2 · Resend

1. Create an account at [resend.com](https://resend.com)
2. Add and verify your domain (`opendatabd.com`)
3. Create an API key → `RESEND_API_KEY`
4. Set `RESEND_FROM` to a verified sender, e.g. `OpenDataBD <noreply@opendatabd.com>`

> **Optional:** Point Supabase's SMTP to Resend so auth emails (confirm email,
> magic link) also use Resend. Go to **Settings → Auth → SMTP** in Supabase.

---

## 3 · Local development

```bash
# Install Vercel CLI (once)
npm i -g vercel

# Install project deps
cd opendatabd.com
npm install

# Copy env template and fill in values
cp .env.example .env

# Start local dev server (API routes + static files)
npx vercel dev
```

Pages available at:
- `http://localhost:3000`           → `index.html`
- `http://localhost:3000/dark`      → `dark.html`
- `http://localhost:3000/api/datasets` → dataset API

---

## 4 · Deploy to Vercel

### First deployment

```bash
# From opendatabd.com/
npx vercel
# Follow prompts — link to your existing project / org
```

### Environment variables in Vercel

Go to **Vercel Dashboard → Project → Settings → Environment Variables** and add:

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
RESEND_FROM
APP_URL
```

Set each for **Production**, **Preview**, and **Development** environments.

### GitHub auto-deploy

1. Push the repo to GitHub
2. In Vercel Dashboard → **Import Git Repository** → select the repo
3. Set **Root Directory** to `opendatabd.com`
4. Every push to `main` triggers a production deploy automatically

---

## 5 · API reference

| Method | Endpoint                    | Auth | Description               |
|--------|-----------------------------|------|---------------------------|
| GET    | `/api/config`               | —    | Public Supabase config    |
| POST   | `/api/auth/signup-complete` | ✓    | Send welcome email        |
| POST   | `/api/auth/reset-password`  | —    | Trigger password reset    |
| GET    | `/api/datasets`             | —    | List datasets (paginated) |
| POST   | `/api/datasets`             | ✓    | Submit a dataset          |
| GET    | `/api/datasets/:id`         | —    | Get single dataset        |
| DELETE | `/api/datasets/:id`         | ✓    | Delete own dataset        |

---

## 6 · Project structure

```
opendatabd.com/
├── index.html                  Main portal (light theme)
├── dark.html                   Dark lifecycle portal
├── submit.html                 Dataset submission form
├── dataset.html                Dataset detail view
├── api-docs.html               API documentation
├── api/                        Vercel serverless functions
│   ├── config.js
│   ├── auth/
│   │   ├── signup-complete.js
│   │   └── reset-password.js
│   └── datasets/
│       ├── index.js
│       └── [id].js
├── lib/                        Server-side shared modules
│   ├── supabase.js             Admin client + auth verify
│   └── resend.js               Email client + HTML templates
├── js/
│   └── auth.js                 Browser auth module
├── supabase/
│   └── migrations/
│       └── 001_initial.sql     DB schema + RLS policies
├── package.json
├── vercel.json
├── .env.example
└── SETUP.md
```
