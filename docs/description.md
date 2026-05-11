**STATEMENT OF WORK**

**Real Estate Seller Intake Platform**

_Dynamic Intake Form · Virtual Walkthrough · AI-Assisted Triage_

|     | **PREPARED BY** | **DATE**    | **DELIVERY** |
| --- | --------------- | ----------- | ------------ |
|     | Markhor Systems | May 5, 2026 | **4 Weeks**  |

# 1\. Project Overview

This document outlines the technical scope, deliverables, and timeline for building a real estate seller intake platform for client's existing website. The platform will allow homeowners to submit property details and conduct a virtual walkthrough through guided photo and video uploads, removing the need for an in-person visit in most cases.

The system will integrate with the existing website, fetch property data automatically from public sources, organize submissions in a private admin dashboard, and use AI in three targeted areas where it adds clear, reliable value.

# 2\. Objectives

- **Modern intake flow:** Replace the existing basic contact form with a guided, multi-step intake experience.
- **Dynamic logic:** Form fields and upload sections that adapt to seller inputs (e.g. 4 bedrooms = 4 bedroom upload sections).
- **Virtual walkthrough:** Mobile-first photo and video upload flow that any non-technical homeowner can complete.
- **Auto-fill from address:** Address autocomplete that fetches property details and an exterior image for confirmation before the seller continues.
- **Internal review tool:** Dashboard for the client and team to review submissions, view media, and manage seller pipeline.

# 3\. Functional Scope

The following modules are included in this engagement:

| **MODULE**                                    | **FUNCTIONAL DESCRIPTION**                                                                                                                                                                                                                                                                   |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dynamic Multi-Step Form**                   | Branching form logic that generates upload sections based on inputs (number of bedrooms, bathrooms, exterior areas). Local state persistence so the seller can resume an unfinished submission.                                                                                              |
| **Address Autocomplete + Property Auto-Fill** | Google Places API for typeahead address entry. On selection, the system queries public listing data sources for property image, square footage, year built, lot size, and bed/bath counts. Seller confirms accuracy before proceeding.                                                       |
| **Photo & Video Upload Engine**               | Room-by-room media upload with drag-and-drop on desktop and native picker on mobile. Client-side image compression, chunked video upload for large files, upload progress indicators, and resumable uploads on connection drop. Files stored in cloud object storage (AWS S3 or equivalent). |
| **Admin Dashboard**                           | Authenticated dashboard for the client team. Lists all submissions with filters (status, date, location). Detail view shows form data, full photo and video gallery, AI-generated summary, and a status workflow (New / Reviewing / Offer Made / Closed). Internal notes per submission.     |
| **Email + SMS Notifications**                 | Real-time alerts to the client team when a new submission arrives. Optional auto-reply email to the seller confirming receipt and outlining next steps.                                                                                                                                      |
| **Website Integration**                       | Intake platform integrated into the existing website with consistent branding. No rebuild of existing pages.                                                                                                                                                                                 |

# 4\. AI Scope

AI is used in three targeted areas where current vision and language models perform reliably. Each feature has a defined input, output, and fallback behavior:

| **AI FEATURE**                | **TECHNICAL DESCRIPTION**                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auto Room Detection**       | Vision model classifies each uploaded image (kitchen, bathroom, bedroom, living area, exterior, etc.). If a photo is uploaded under the wrong section (e.g. a bathroom photo placed in a kitchen slot), the system flags the mismatch and prompts the seller to confirm or recategorize. Reduces miscategorized submissions and improves dataset quality for the team.                                                                                  |
| **AI Property Summary**       | On submission, a language model generates a one-page written summary of the property for the internal team. Inputs: form data + AI-extracted observations from each photo. Output: structured summary covering property overview, observed condition signals per room, visible flags (visible damage, dated finishes, missing items), and a brief overall description. Used as a triage and prep tool - not as a substitute for in-person verification. |
| **Pre-Qualification Chatbot** | On-page chat assistant that helps sellers through the form and asks pre-qualification questions: ownership status, timeline to sell, motivation, mortgage status, liens or judgments, occupancy, and whether the seller is open to multiple offer types (cash, investor, listing). Captured answers are attached to the submission record.                                                                                                              |

# 5\. Technology Stack

- **Frontend:** Next.js (React) - server-rendered, mobile-first, SEO-friendly.
- **Backend:** Next.js (full-stack) with API routes (no separate Node.js service).
- **Data layer:** PostgreSQL for structured submission data; AWS S3 (or equivalent) for media storage.
- **AI services:** OpenAI / Anthropic models for room detection, summary generation, and chatbot.
- **External APIs:** Google Places API for address autocomplete; public listing data sources for property auto-fill.
- **Hosting:** VPS + AWS - SSL enabled, automated backups.
- **Security:** HTTPS, encrypted media storage, JWT-based admin authentication, role-based access control.

# 6\. Deliverables

- Production-ready intake platform integrated with the existing website.
- Dynamic multi-step form with conditional logic and resume support.
- Photo and video upload engine with cloud storage.
- Address autocomplete and property auto-fill flow.
- Three AI modules: auto room detection, property summary, pre-qualification chatbot.
- Admin dashboard with submission management, gallery, and status workflow.
- Email and SMS notification system.
- Source code, deployment configuration, and environment documentation.
- Admin walkthrough session and written usage documentation.

# 7\. Timeline (4 Weeks)

| **PHASE**    | **MILESTONE**       | **OUTPUT**                                                                                                                        |
| ------------ | ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Days 4-5** | **Live Preview**    | Live preview link goes up. Form skeleton, design direction, and address autocomplete available for testing. Feedback loop begins. |
| **Week 1**   | **Foundation**      | Brand-matched UI, dynamic form skeleton, address autocomplete, base integration with existing website.                            |
| **Week 2**   | **Uploads & Logic** | Room-by-room photo and video uploads, conditional form logic, property data auto-fetch, mobile QA.                                |
| **Week 3**   | **AI & Dashboard**  | Auto room detection, property summary generator, pre-qualification chatbot, admin dashboard, notifications.                       |
| **Week 4**   | **Polish & Launch** | End-to-end testing, security review, performance tuning, final feedback round, deployment, training, and handover.                |

**What's covered:**

- Full design, development, and deployment of all modules listed in Section 6.
- All AI integrations, API setup, and cloud configuration.
- Admin training session and written documentation.
- 60-day post-launch bug-fix support window.

**Not covered (available separately):**

- Third-party service costs (e.g. Google API quota beyond free tier, hosting, OpenAI usage). Estimated \$20-\$60/month at typical volume.
- CRM integrations, custom reporting, and ongoing feature additions after launch.

# 9\. Post-Launch Support

- **Bug-fix window:** 30-day window for any bug fixes or adjustments at no additional cost.
- **Training:** Live walkthrough session for the client team on dashboard usage.
- **Documentation:** Written usage guide and technical documentation handed over with source code.
- **Future work:** Optional retainer available for ongoing maintenance, new features, and AI tuning.

# 10\. Assumptions & Dependencies

- Client provides timely access to the existing website (admin / hosting credentials or developer access).
- Client provides brand assets (logo, color palette, any existing style guide).
- Client is available for weekly feedback during the build cycle.
- Third-party API accounts (Google Places, AI provider, email/SMS gateway) will be set up under client ownership so all data and credentials remain with the client.

Thank you for the conversation. This document captures everything we discussed and the additional refinements we believe will make the platform genuinely useful for your team. The Markhor Systems team is ready to begin as soon as you give the go-ahead.
