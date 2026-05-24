# OpenDataBD

Bangladesh's open data portal — explore, submit, and build with public datasets across health, education, economy, and more.

**Live:** [opendatabd.com](https://opendatabd.com)

## Stack

| Layer    | Service                     |
|----------|-----------------------------|
| Frontend | Vanilla HTML + Tailwind CSS |
| Auth     | Supabase Auth               |
| Database | Supabase Postgres           |
| Email    | Resend                      |
| Hosting  | Vercel                      |

## Setup

See **[SETUP.md](./SETUP.md)** for full instructions covering Supabase, Resend, local dev with `vercel dev`, and Vercel deployment.

## Project structure

```
├── index.html                  Main portal (light theme)
├── dark.html                   Dark lifecycle portal
├── submit.html                 Dataset submission form
├── dataset.html                Dataset detail view
├── api-docs.html               API documentation
├── api/                        Vercel serverless functions
│   ├── config.js               Public Supabase config
│   ├── auth/
│   │   ├── signup-complete.js  Post-signup welcome email
│   │   └── reset-password.js  Password reset trigger
│   └── datasets/
│       ├── index.js            List + create datasets
│       └── [id].js             Get + delete single dataset
├── lib/                        Server-side shared modules
│   ├── supabase.js             Admin client + JWT verify
│   └── resend.js               Email client + HTML templates
├── js/
│   └── auth.js                 Browser Supabase client + UI
├── supabase/
│   └── migrations/
│       └── 001_initial.sql     Schema, RLS policies, triggers
├── vercel.json                 Security headers, clean URLs
├── .env.example                Required environment variables
└── SETUP.md                    Deployment guide
```

## Environment variables

Copy `.env.example` to `.env` and fill in your values. Add the same variables in **Vercel → Project → Settings → Environment Variables**.

```
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
RESEND_FROM
APP_URL
```
