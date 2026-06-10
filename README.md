# Complete Home — Real Estate Seller Intake Platform

A private-market seller intake platform for **Complete Home Solutions of Tennessee**. Home sellers submit their property details, photos, and videos for a guided review — no listing, no open houses, no obligation.

---

## Features

- **Multi-step intake form** — address autocomplete, property details, room-by-room photo/video uploads, pre-qualification questions
- **Draft & resume** — submissions auto-save as drafts; sellers can return and pick up where they left off
- **Resumable file uploads** — tus protocol handles large photo/video uploads with retry support
- **AI room detection** — Groq vision verifies uploaded photos match their labeled room
- **AI property summary** — auto-generates a structured property summary for the admin panel
- **Address intelligence** — Geoapify autocomplete + Rentcast property data pre-fill
- **Email notifications** — admin alert and seller confirmation sent on submission via Gmail SMTP
- **Admin dashboard** — view, filter, and manage submissions; update status; add internal notes; view uploaded media
- **Rate limiting & RLS** — row-level security on all tables; server-side rate limiting per IP

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (`property-media` bucket) |
| AI | Groq SDK |
| Address | Geoapify API |
| Email | Nodemailer + Gmail SMTP |
| File uploads | tus-js-client |
| Validation | Zod |
| Deployment | Vercel |

---

## Project Structure

```
app/
  page.tsx                  # Marketing landing page
  intake/page.tsx           # Multi-step seller intake form
  privacy/page.tsx          # Privacy policy
  admin/
    page.tsx                # Admin dashboard
    login/page.tsx          # Admin login
    request/page.tsx        # Request admin access
  api/
    intake/                 # Draft save, submit, file upload
    admin/                  # Submissions, auth, admin management
    address/                # Autocomplete, property data
    ai/                     # Room detection, summarize
components/                 # Header, shared UI
lib/
  supabase/                 # Client, server, admin Supabase clients
  ai/                       # Groq integration
  email/                    # Nodemailer email templates
  api/                      # Shared API utilities
supabase/
  migrations/               # Database schema (run on new projects)
```

---

## Environment Variables

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

| Variable | Where to get it |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API |
| `GROQ_API_KEY` | console.groq.com → API Keys |
| `GEOAPIFY_API_KEY` | myprojects.geoapify.com |
| `GMAIL_USER` | Gmail address used for sending emails |
| `GMAIL_APP_PASSWORD` | Google Account → Security → App Passwords |

---

## Local Development

```bash
npm install
npm run dev
```

App runs at `http://localhost:3000`.

---

## Database Setup (New Project)

The full schema is in `supabase/migrations/`. To bootstrap a new Supabase project:

```bash
# 1. Install Supabase CLI (if not already)
npm install -g supabase

# 2. Log in
supabase login

# 3. Link to the new project (ref is the ID in the Supabase dashboard URL)
supabase link --project-ref <project-ref>

# 4. Push schema — creates all tables, policies, storage bucket, indexes, grants
supabase db push
```

This creates:
- `submissions`, `submission_files`, `admin_users`, `email_log`, `address_cache`, `rate_limits`
- All RLS policies, indexes, triggers, and functions
- `property-media` storage bucket with correct mime type restrictions

---

## First Admin User

After running migrations, add the first admin manually in Supabase:

1. Go to **Authentication → Users** → create a user with email + password
2. Copy the user's UUID
3. Run in **Supabase SQL Editor**:

```sql
INSERT INTO admin_users (id, email, role, status)
VALUES ('<user-uuid>', '<email>', 'admin', 'active');
```

That user can now log in at `/admin/login`.

---

## Deployment (Vercel)

1. Push repo to GitHub
2. Import repo in Vercel
3. Add all environment variables in **Vercel → Project → Settings → Environment Variables**
4. Deploy

> After deploying, update the Supabase project's **Site URL** and **Redirect URLs** to the production domain under **Supabase → Authentication → URL Configuration**.

---

## Client Launch Checklist

- [ ] Create new Supabase project
- [ ] Run `supabase db push` with new project ref
- [ ] Update all env vars (Supabase URL + keys, Groq, Geoapify, Gmail)
- [ ] Set Supabase Site URL to production domain
- [ ] Create first admin user via SQL
- [ ] Deploy to Vercel
