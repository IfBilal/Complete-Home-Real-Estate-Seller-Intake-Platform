# Frontend Implementation Plan (Dummy Data Only)

**Project:** Real Estate Seller Intake Platform (Frontend Only)

**Purpose:** Build a fully interactive, mobile‑first frontend prototype using **dummy data** only, so the client can experience the complete flow end‑to‑end with realistic UI, animations, and navigation. **All modules are frontend‑only mocks** (no backend, database, or AI integration in this phase).

**Stack Direction:** Frontend **and** backend will live in **Next.js** (full‑stack) when backend work begins. There will be **no separate Node.js backend service**.

---

## 0) Global Design System (Applied Everywhere)

### 0.0 Real‑Estate Aesthetic Guardrails (Non‑Negotiable)
- Visual tone is **professional, calm, and trustworthy**.
- **No neon colors**, no glowing effects, no glassmorphism, no futuristic UI patterns.
- **Minimal gradients** only for hero overlays; avoid high‑contrast or glossy treatments.
- **Photography‑first**: property imagery is the star; UI supports it quietly.
- **Soft depth**: use subtle shadows and light borders, never harsh contrast.

### 0.1 Color System (Exact Tokens)

**Primary Brand**
- `brand.navy-900`: `#0F1F3D` (primary header background, top bar)
- `brand.blue-600`: `#2563EB` (primary CTA, active step — use sparingly)
- `brand.blue-700`: `#1D4ED8` (primary hover / pressed)
- `brand.slate-600`: `#475569` (secondary accents, icon strokes)

**Neutrals**
- `neutral.ink-900`: `#111827` (headings)
- `neutral.ink-700`: `#374151` (body text)
- `neutral.ink-500`: `#6B7280` (secondary text)
- `neutral.ink-400`: `#9CA3AF` (helper text)
- `neutral.line-200`: `#E5E7EB` (borders)
- `neutral.line-100`: `#F3F4F6` (subtle background)
- `neutral.sand-50`: `#F5F2EE` (page base background)
- `neutral.white`: `#FFFFFF` (cards, modals)

**Status Colors**
- `status.success-600`: `#16A34A`
- `status.warning-500`: `#F59E0B`
- `status.error-600`: `#DC2626`
- `status.info-500`: `#0EA5E9`

**Gradients (Subtle, Optional)**
- `hero.gradient`: `linear-gradient(180deg, rgba(15,31,61,0.65) 0%, rgba(15,31,61,0.35) 60%, rgba(15,31,61,0.15) 100%)`

### 0.2 Typography
- **Font Family:** `Inter` (fallback: `system-ui, -apple-system, Segoe UI, Roboto, sans-serif`)
- **H1:** 32px (mobile), 44px (desktop), weight 700, letter‑spacing ‑0.02em
- **H2:** 24px / 32px, weight 700
- **H3:** 20px / 28px, weight 600
- **Body:** 16px / 24px, weight 400
- **Small / helper:** 13px / 18px, weight 400
- **Button text:** 15px / 20px, weight 600

### 0.3 Spacing & Layout
- **Spacing scale:** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64
- **Container width:** 1200px max, 24px side padding
- **Card radius:** 12px
- **Button radius:** 10px
- **Input radius:** 10px
- **Shadow:** `0 8px 24px rgba(15, 31, 61, 0.12)`

### 0.4 Interactions & Motion
- **Global animation timing:** 180–220ms for UI state changes
- **Easing:** `cubic-bezier(0.2, 0, 0, 1)`
- **Button hover:** slight lift + shadow (`translateY(-1px)` + shadow)
- **Card hover:** subtle shadow increase (no transform on mobile)
- **Section transitions:** fade + 6px vertical slide (reduced motion)
- **Stepper transitions:** smooth progress bar fill

### 0.5 Responsive Behavior
- **Mobile‑first** base styles.
- **Tablet breakpoints:** 768px
- **Desktop breakpoints:** 1024px, 1280px
- **Key rule:** content stays readable at 320px width; major CTAs remain within thumb zone.

---

## 1) Information Architecture (Pages & Routes)

**Public**
1. `/` Home (includes How‑it‑works + FAQ sections)
2. `/intake` Seller Intake (multi‑step flow, includes uploads and review)
3. `/privacy` Privacy & Terms (data + media + AI disclaimers even if AI not active yet)

**Internal**
4. `/admin` Admin Dashboard (dummy data only; list + detail views)

---

## 2) UI Components Inventory (Used Across Pages)

### 2.1 Buttons
- **Primary:** background `brand.blue-600`, text `neutral.white`, hover `brand.blue-700`, shadow on hover, disabled `neutral.line-200` with text `neutral.ink-400`.
- **Secondary:** border `neutral.line-200`, text `neutral.ink-700`, hover bg `neutral.line-100`.
- **Ghost:** text `brand.blue-600`, hover bg `#EFF6FF`.
- **Icon button:** circle 36px, hover `neutral.line-100`.

### 2.2 Inputs
- **Text input:** border `neutral.line-200`, focus border `brand.blue-600`, background `neutral.white`, placeholder `neutral.ink-400`.
- **Select:** same as input; caret icon `neutral.ink-500`.
- **Textarea:** min height 120px; counter text right aligned.
- **Radio/Checkbox:** primary color `brand.blue-600`, 2px outline.

### 2.3 Cards
- **Standard card:** white background, 12px radius, 1px `neutral.line-200` border, padding 20–24.
- **Upload slot card:** dashed border `neutral.line-200`, hover `brand.blue-600` border.

### 2.4 Stepper
- **Top stepper bar:** background `neutral.line-200`, filled `brand.blue-600`.
- **Step labels:** active `neutral.ink-900`, inactive `neutral.ink-500`.

### 2.5 Toasts / Alerts
- **Success:** green border + icon.
- **Info:** blue border + icon.
- **Warning:** amber border + icon.
- **Error:** red border + icon.

---

## 3) Dummy Data Strategy (Frontend‑Only)

### 3.1 Fake Property Data
- Use a local JSON file to simulate property auto‑fill (address, sqft, year built, beds/baths, exterior image).
- For media uploads, simulate progress with a timer (0–100%) and fake filenames.

### 3.2 Fake Submission Objects
- Populate admin list with 10–20 mock submissions (name, address, status, date, thumbnail).
- Include a detailed mock submission with a complete gallery and AI summary placeholder text.

### 3.3 Zod Validation (Frontend‑Only)
- Use `zod` for **all** form schemas in the intake flow (address, property details, rooms, uploads, review).
- Each step has its own schema; a **combined schema** validates the entire intake on review.
- Validation errors map to inline helper text and red border (`status.error-600`).
- Use `safeParse` for step validation to avoid hard crashes and keep UI responsive.

### 3.4 Frontend‑Only Mock Modules
- **Notifications UI**: simulate “Email sent” and “SMS sent” states with banners and toast confirmations.
- **Chatbot UI**: a static chat panel with scripted Q&A for pre‑qualification.
- **AI Panels**: mock “Room detected” tags and “AI summary” cards using placeholder text.

### 3.5 Detailed UI Specs for Mock Modules

**A) Pre‑Qualification Chatbot (Frontend‑Only UI)**
- **Placement**: Right side drawer on desktop (320px width), bottom‑sheet on mobile (max height 70vh).
- **Trigger**: “Need help?” floating button at bottom right (56px circle, `brand.blue-600` background, white chat icon).
- **Chat container**: white card, radius 16px, border `neutral.line-200`, shadow `0 12px 28px rgba(15,31,61,0.16)`.
- **Header**: 56px height, background `brand.navy-900`, title in `neutral.white`, close icon in `neutral.line-100`.
- **Message bubbles**:
	- Bot: background `neutral.line-100`, text `neutral.ink-700`, 12px radius, max width 85%.
	- User: background `brand.blue-600`, text `neutral.white`, 12px radius, max width 85%, right aligned.
- **Typing indicator**: three dots in `neutral.ink-400`, 1.2s looping.
- **Input bar**: 56px height, input with `neutral.line-200` border, send button `brand.blue-600`.
- **Scripted flow** (dummy): ownership → timeline → motivation → mortgage → liens → occupancy → offer preference.
- **Animation**: drawer slides in 220ms; bottom‑sheet slides up 200ms.

**B) Email/SMS Notification Confirmation (Frontend‑Only UI)**
- **Locations**:
	- After submission: success screen includes “Notifications queued” card.
	- Admin detail: “Notifications Sent” timeline card.
- **Banner style**: 48px height, background `#ECFDF3`, border `status.success-600`, text `neutral.ink-700`.
- **Toast style**: 320px width, 52px height, left border `status.success-600`, icon + short text.
- **Timeline card**: white card with left vertical line `neutral.line-200` and dots `status.info-500`.
- **Dummy copy**:
	- “Email sent to seller@example.com — 2 min ago”
	- “SMS sent to (555) 018‑7234 — 2 min ago”
- **Animation**: toast fade‑in 160ms, auto‑dismiss 4s.

**C) AI Room Detection Tags (Frontend‑Only UI)**
- **Placement**: on each uploaded photo thumbnail in review + admin detail.
- **Tag style**: pill 24px height, background `#EFF6FF`, text `brand.blue-700`, border `#DBEAFE`.
- **States**:
	- “Detected: Kitchen” (default)
	- “Mismatch” (amber background `#FEF3C7`, text `#92400E`)
- **Interaction**: clicking tag shows a small tooltip (200ms fade) with “Suggested category: Kitchen”.

**D) AI Summary Preview Panel (Frontend‑Only UI)**
- **Placement**: Review step and Admin detail left column.
- **Card**: white, 16px radius, border `neutral.line-200`, padding 20px.
- **Header**: “AI Summary (Preview)” + badge “Generated” (background `#E0F2FE`, text `#0369A1`).
- **Sections**:
	- Property Overview (3–4 lines)
	- Condition Signals (bulleted)
	- Visible Flags (pill chips in `status.warning-500`)
- **Typography**: H3 `neutral.ink-900`, body `neutral.ink-700`.
- **Skeleton** (optional): shimmer placeholder blocks in `neutral.line-100`.

---

## 4) Phase‑Based Implementation Plan (Detailed)

### **Phase 1 — Design Foundation & App Skeleton**
**Goal:** Establish core design tokens, layout scaffolding, and routing.

**Deliverables**
- Create base layout with header, footer, and responsive container.
- Define full color palette, typography, shadows, and spacing in a single theme file.
- Implement global styles and a component library folder structure.

**UI / Styling Details**
- Header: 64px height (mobile), 72px (desktop), background `brand.navy-900`, logo left, CTA button right (text: “Start Intake”).
- Footer: background `neutral.ink-900`, text `neutral.line-100`, links `neutral.line-200` with hover `neutral.white`.
- Main content background: `neutral.sand-50`.
- Section spacing: 48px between sections on mobile, 80px on desktop.

**Interactivity**
- Sticky header on scroll with subtle shadow.
- Mobile menu: slide‑down panel, 200ms ease, semi‑transparent background.

---

### **Phase 2 — Home Page (Marketing + Entry Point)**
**Goal:** Build the public landing page with complete visual hierarchy.

**Hero Section**
- Full‑width background property image with **soft** `hero.gradient` overlay (avoid high contrast).
- H1 in `neutral.white`, subtext in `neutral.line-100`.
- Primary CTA button centered (mobile) / left aligned (desktop).
- Trust badges: rounded pills with border `neutral.line-200`, background `rgba(255,255,255,0.12)`.

**How‑It‑Works Section**
- 3 cards in a row on desktop, stacked on mobile.
- Card header icon in `brand.blue-600` circle background `#EFF6FF`.
- Each card: title `neutral.ink-900`, description `neutral.ink-500`.

**Benefits Section**
- Two‑column split on desktop, stacked on mobile.
- Left side bullet list with icons `status.success-600`.
- Right side image placeholder in a 16:9 ratio card with drop shadow.

**FAQ Section**
- Accordion list (5–7 items) with smooth expand (height + fade).
- Question text `neutral.ink-900`, answer `neutral.ink-500`.

---

### **Phase 3 — Intake Flow Shell (Stepper + Navigation)**
**Goal:** Build the multi‑step shell and navigation logic.

**Stepper**
- Top progress bar with 6 steps: Address → Property → Rooms → Uploads → Review → Done.
- Active step highlight in `brand.blue-600`, inactive in `neutral.ink-400`.
- Step indicators: 28px circles, filled for completed steps.

**Navigation Controls**
- Sticky bottom bar on mobile (height 68px) with Back / Continue buttons.
- Back button (secondary), Continue button (primary).
- On desktop, buttons aligned right under form card.

**Interactivity**
- Transition between steps: 8px slide + fade.
- Validation: inline helper text in `status.error-600` with 12px font, driven by Zod errors.

---

### **Phase 4 — Address + Auto‑Fill (Dummy)**
**Goal:** Create the address search experience and property confirmation.

**Address Entry Card**
- Search input with icon on left in `neutral.ink-400`.
- Typeahead dropdown with 6 mock suggestions.
- Selected address triggers a mock auto‑fill card.

**Auto‑Fill Confirmation**
- Card with property image (dummy thumbnail), address, sqft, beds/baths.
- “Is this correct?” prompt with Yes/No buttons.
- If No: show editable fields with pencil icon.

**Colors**
- Card borders `neutral.line-200`, highlight active card border `brand.blue-600`.

---

### **Phase 5 — Property Details Step**
**Goal:** Collect core property attributes with a clean, guided layout.

**Inputs**
- Bedrooms, Bathrooms (number selectors), Year Built, Lot Size, Condition (select).
- Use segmented controls for Bedrooms/Bathrooms (chips with `brand.blue-600` when active).

**Layout**
- 2 columns on desktop, 1 column on mobile.
- Helper text below each field in `neutral.ink-400`.

**Animation**
- On selection, chips scale from 0.98 to 1.0 with 150ms.

---

### **Phase 6 — Rooms & Areas Selection**
**Goal:** Select which rooms and exterior areas will be uploaded.

**UI**
- Grid of room cards with icons (Kitchen, Living, Bed 1..N, Bath 1..N, Exterior, Garage, Backyard).
- Each card has a toggle state with `brand.blue-600` border when active.

**Logic (Dummy)**
- If Bedrooms = 4 → show 4 bedroom cards with labels.

---

### **Phase 7 — Photo & Video Upload UI (Dummy)**
**Goal:** Build the upload experience with simulated progress.

**Room Upload Panels**
- Each room has a collapsible panel.
- Inside: 3 photo slots + 1 video slot.
- Empty slot: dashed border, icon, text “Add photo”.

**Simulated Upload**
- Clicking a slot adds a dummy file and a progress bar (animated 0–100% in 2.5s).
- When complete, show thumbnail preview, filename, and remove icon.

**Colors**
- Progress bar: background `neutral.line-200`, fill `brand.blue-600`.
- Completed badge: `status.success-600`.

---

### **Phase 8 — Review & Submit (Frontend Dummy)**
**Goal:** Show a comprehensive review screen.

**UI Layout**
- Left: summary card (address, key details).
- Right: photo gallery grid.
- Below: pre‑qualification answers (dummy) in a bordered card.
- AI summary panel (dummy) with structured sections and “Generated” badge.

**Submit Interaction**
- On submit, show full‑screen success modal with check icon.
- Confetti animation (subtle, 2 seconds).

---

### **Phase 9 — Admin Dashboard (Dummy Data)**
**Goal:** Demonstrate internal workflow.

**List View**
- Table with status pills (New, Reviewing, Offer Made, Closed).
- Status colors: New `status.info-500`, Reviewing `status.warning-500`, Offer `brand.blue-600`, Closed `status.success-600`.

**Detail View**
- Split layout: left (submission details), right (gallery).
- Notes panel with text area and “Save Note” (dummy button).
- Mock AI summary card and “Room detection flags” list with badges.
- “Notifications Sent” timeline card (Email/SMS) with dummy timestamps.

---

### **Phase 10 — Polishing & Responsive QA**
**Goal:** Ensure consistent quality across devices.

**Mobile**
- Keep CTAs within thumb reach.
- Ensure accordion and stepper legible.

**Tablet**
- Maintain 2‑column layout where possible.

**Desktop**
- Max width 1200px, avoid overly wide text blocks.

**Animations**
- Check transitions are smooth and not excessive.

---

## 5) Expected Outcome
- A fully interactive, **client‑ready prototype** that demonstrates every key flow.
- No backend required in this phase; all data simulated with local JSON and mock UI states.
- When backend starts later, it will be implemented in **Next.js** (full‑stack) without a separate Node service.
- Complete UI polish with detailed colors, spacing, and interactions.

---

## 6) Next Optional Enhancements (Still Frontend‑Only)
- Light / dark mode toggle.
- Skeleton loaders for data‑fetch simulation.
- Storybook for components.
- Onboarding tour overlay for first‑time users.
