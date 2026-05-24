# Tech Stack — Real Estate Seller Intake Platform

## Stack Overview

| Layer | Choice |
|---|---|
| **Framework** | Next.js 14 (App Router, TypeScript) |
| **Database** | Supabase (Postgres) |
| **File Storage** | Supabase Storage |
| **Auth** | Supabase Auth |
| **AI** | Groq API |
| **Address Autocomplete** | Google Places API |
| **Property Auto-fill** | RentCast API |
| **Email Notifications** | Resend |
| **Hosting** | Vercel |

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI
GROQ_API_KEY=

# External APIs
GOOGLE_PLACES_API_KEY=
RENTCAST_API_KEY=

# Email
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=
```

---

## Service Cost Breakdown

| Service | Free Tier | Notes |
|---|---|---|
| **Supabase** | 500MB DB, 1GB storage, 50k auth users | Free forever |
| **Groq API** | Generous free tier | Pay-as-you-go after |
| **Google Places API** | $200 credit/month | Won't hit at normal volume |
| **RentCast API** | 50 calls/month free | Covers development |
| **Resend** | 3,000 emails/month free | No credit card required |
| **Vercel** | Free hobby tier | Free for this project |

**During development: $0**
**In production at normal volume: ~$0**

---

## AI Models (Groq)

| Feature | Model |
|---|---|
| **Room detection** (vision) | `llama-3.2-90b-vision-preview` |
| **Property summary** | `llama-3.3-70b-versatile` |
| **Chatbot** | `llama-3.1-8b-instant` |

---

## Why These Choices

- **Supabase** — handles database, file storage, and auth in one dashboard. No AWS, no separate services.
- **Groq** — ultra-low latency AI inference. Room detection and summaries feel near-instant.
- **Resend** — 3,000 free emails/month covers admin alerts and seller auto-replies at any realistic volume.
- **RentCast** — replaces ATTOM Data (which starts at $150-300/month) with a free tier that covers dev and cheap paid plans after.
- **No Prisma** — Supabase JS client talks directly to Postgres. No ORM needed.
- **No Twilio** — Resend email covers all notification needs. SMS can be added later if needed.
