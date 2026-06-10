<div align="center">

<img src="public/logo.png" width="180" alt="Complete Home Logo" />

# Complete Home — Seller Intake Platform

**Private market property reviews. No listing. No open houses. No obligation.**

[![Next.js](https://img.shields.io/badge/Next.js_14-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel)](https://vercel.com)

</div>

---

## What it does

Home sellers visit the site, fill out a guided multi-step form with their property details and room photos, and receive a private market review — no public listing required. Admins manage all incoming submissions through a protected dashboard with AI-generated summaries.

---

## ✦ Features

| | Feature |
|---|---|
| 📋 | **Multi-step intake form** — address autocomplete, property details, pre-qual questions |
| 💾 | **Draft & resume** — auto-saves progress so sellers can return anytime |
| 📸 | **Room-by-room uploads** — resumable photo/video uploads via tus protocol |
| 🤖 | **AI room detection** — Groq vision verifies photos match their labeled room |
| 📝 | **AI property summary** — auto-generates a structured summary for admins |
| 🗺️ | **Address intelligence** — Geoapify autocomplete + Rentcast property data pre-fill |
| 📧 | **Email notifications** — admin alert + seller confirmation on submission |
| 🔐 | **Admin dashboard** — manage submissions, update status, add notes, view media |
| 🛡️ | **Security** — RLS on every table, server-side rate limiting per IP |

---

## ⚙️ Tech Stack

| Layer | Tech |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| AI | Groq SDK |
| Address | Geoapify API |
| Email | Nodemailer + Gmail SMTP |
| File Uploads | tus-js-client |
| Validation | Zod |
| Deployment | Vercel |

---

## 📁 Project Structure

```
app/
├── page.tsx                    # Marketing landing page
├── intake/page.tsx             # Multi-step seller intake form
├── privacy/page.tsx            # Privacy policy
├── admin/
│   ├── page.tsx                # Admin dashboard
│   ├── login/page.tsx          # Admin login
│   └── request/page.tsx        # Request admin access
└── api/
    ├── intake/                 # Draft save, submit, file upload
    ├── admin/                  # Submissions, auth, admin management
    ├── address/                # Autocomplete + property data
    └── ai/                     # Room detection, summarize

components/                     # Header, shared UI
lib/
├── supabase/                   # Client, server, admin Supabase instances
├── ai/                         # Groq integration
├── email/                      # Nodemailer templates
└── api/                        # Shared API utilities

supabase/
└── migrations/                 # Full DB schema — run on any new project
```

---

## 🔑 Environment Variables

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) → API Keys |
| `GEOAPIFY_API_KEY` | [myprojects.geoapify.com](https://myprojects.geoapify.com) |
| `GMAIL_USER` | Gmail address used to send emails |
| `GMAIL_APP_PASSWORD` | Google Account → Security → App Passwords |

---

## 🚀 Local Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🗄️ Database Setup (New Project)

Schema lives in `supabase/migrations/` — one command bootstraps everything.

```bash
npm install -g supabase     # install CLI
supabase login              # authenticate
supabase link --project-ref <your-project-ref>   # link to new project
supabase db push            # run migrations
```

Creates all tables, RLS policies, indexes, triggers, functions, and the `property-media` storage bucket automatically.

> **Project ref** = the ID in your Supabase dashboard URL:
> `https://supabase.com/dashboard/project/YOUR-REF-HERE`

---

## 👤 First Admin User

After migrations, create the first admin:

1. **Supabase → Authentication → Users** → create a user (email + password)
2. Copy their UUID
3. Run in **SQL Editor**:

```sql
INSERT INTO admin_users (id, email, role, status)
VALUES ('<uuid>', '<email>', 'admin', 'active');
```

Login at `/admin/login`.

---

## 🌐 Deploying to Vercel

1. Push repo to GitHub
2. Import in [Vercel](https://vercel.com) → add all env vars
3. Deploy

> Set your production domain in **Supabase → Authentication → URL Configuration** (Site URL + Redirect URLs).

---

## ✅ Client Launch Checklist

- [ ] Create new Supabase project
- [ ] `supabase link` + `supabase db push`
- [ ] Fill in all env vars with new project keys
- [ ] Set Supabase Site URL to production domain
- [ ] Create first admin user via SQL
- [ ] Deploy to Vercel

---

<div align="center">

Built for **Complete Home Solutions of Tennessee**

</div>
