# Real Estate Seller Intake — Premium Frontend Refactor Plan (Extended)

**Goal:** Deliver a visibly premium, locked‑in frontend that matches the reference style (E&E Medicals‑level polish). This plan is intentionally detailed so an engineer can execute without ambiguity and avoid a “mid” or “low‑effort” look.

---

## 1) Target Visual Benchmark (From Reference Images)

**Non‑negotiable patterns from the reference:**
- **Top utility bar** with phone/email + iconography and thin divider line.
- **Navy hero** with subtle gradient texture and large headline.
- **Above‑the‑fold trust:** star rating, badges, and “trusted by” cues.
- **Stat cards** in a row, slightly translucent with soft borders.
- **Layered depth**: cards, panels, and CTAs feel stacked and refined.
- **Clear section rhythm**: headline → subtext → card grid → CTA.

---

## 2) Current Gaps (What Makes It Feel “Mid”)

1. **No premium utility bar** and header lacks enterprise polish.
2. **Hero is visually flat** compared to reference (needs depth + trust row).
3. **Stats and badges** appear later or inconsistently styled.
4. **Cards look generic** (missing texture, border nuance, and hierarchy).
5. **Typography scale** doesn’t signal “enterprise.”
6. **Section density** leaves gaps that feel unfinished.

---

## 3) Premium Design System (Concrete Tokens)

### 3.1 Typography
- **Display font:** `Playfair Display` (preferred) or `Merriweather` for H1/H2.
- **Body font:** `Inter` for UI, buttons, and form labels.
- **Scale & weights:**
	- H1: 40–48px desktop / 30–34px mobile, weight 700.
	- H2: 28–32px desktop / 22–26px mobile, weight 700.
	- H3: 20–22px, weight 600.
	- Body: 16px, line‑height 1.6.
	- Small: 13–14px, weight 500 for labels/badges.

### 3.2 Color System
- **Hero Navy:** `#0B1C2C` (hero, top bar, CTA band)
- **Primary Blue:** `#2563EB` (primary CTAs, active states)
- **Steel Blue:** `#1F2E44` (secondary dark surfaces)
- **Warm White:** `#F8FAFC` (page background)
- **Card White:** `#FFFFFF`
- **Muted Text:** `#94A3B8` + `#64748B`
- **Soft Border:** `#E2E8F0`

### 3.3 Shadows, Borders, Radius
- **Soft shadow:** `0 12px 30px rgba(11, 28, 44, 0.18)`
- **Elevated shadow:** `0 18px 40px rgba(11, 28, 44, 0.22)`
- **Card radius:** 14–16px
- **Pill radius:** 999px
- **Card border:** 1px solid `#E2E8F0` with subtle overlay highlight

### 3.4 Motion
- **Standard transitions:** 180–220ms, `cubic-bezier(0.16, 1, 0.3, 1)`
- **Hover lift:** `translateY(-2px)` with shadow bump
- **Panels:** 240ms fade + slide

---

## 4) Global Layout & Structure

### 4.1 Utility Top Bar (New)
- Height: 36–40px.
- Background: `Hero Navy`.
- Left: phone + email + icons.
- Right: “Share your project” link or CTA.
- Thin bottom divider `#0F2A45`.

### 4.2 Header
- Sticky, slightly translucent with blur.
- Logo left, nav center, CTA right.
- Nav font 13–14px, uppercase or semi‑bold.

### 4.3 Section Rhythm
- Alternating backgrounds (light vs slightly tinted).
- Every section has:
	- Title
	- 1‑line subtext
	- Card grid or media block
	- CTA or next section anchor

---

## 5) Page‑By‑Page Premium Refactor

### 5.1 Home (`/`)

**Hero Block (Top Priority)**
- Full‑bleed navy gradient background with subtle texture.
- Badge pill above headline (“Private Seller Intake · Concierge Guided”).
- Headline split in 2 lines with 1 word in accent blue.
- Subtext: 1–2 lines max, confident and calm.
- CTAs:
	- Primary: solid blue + arrow icon.
	- Secondary: outline + icon.
- Trust row below CTAs:
	- 5‑star icon row
	- “Trusted by 200+ sellers” copy
- Floating stat cards at hero bottom (desktop):
	- “Avg review time: 48 hrs”
	- “Private, secure uploads”
	- “No obligation”

**Metrics Section**
- 4‑card row with icons + number + label.
- Card style: frosted white background, subtle border, inner shadow.
- Example metrics: “470+ reviews”, “63 advisors”, “266+ submissions”, “213+ offers”.

**Expertise Section**
- Left: large image card (property or interior).
- Right: text block + bullet list with check icons.
- Add a small badge on the image (“266+ successful reviews”).

**Standards / Badges Strip**
- Pill chip row: “Secure Uploads”, “ISO‑Ready”, “Private Review”, etc.
- Use soft border + small caps.

**How It Works**
- 3‑step cards with icons + short copy.
- Ensure equal height cards and hover lift.

**CTA Band**
- Dark navy band with headline + CTA.
- This acts as conversion anchor before footer.

### 5.2 Intake (`/intake`)

**Stepper**
- Dark strip with progress bar underneath.
- Labels in small caps + spaced out.

**Step Layout**
- Each step in a card panel with title, helper text, and icon.
- Forms in 2‑column grid on desktop, stacked on mobile.

**Uploads**
- Room cards: name + progress badge + required count.
- Upload tile: dashed border + hover glow + “Add photo/video” label.
- Progress chip right‑aligned, consistent color coding.

**Review**
- Two‑column: left summary, right gallery.
- Summary includes AI preview + warning pills.

### 5.3 Admin (`/admin`)

**Left List**
- Each record as a card row (not table rows).
- Selected record has subtle border highlight + background.

**Right Detail Panel**
- Header: address + seller + ID + status chip.
- Gallery grid with room labels.
- AI summary card with header chip and bullet list.

### 5.4 Admin Login (`/admin/login`)

- Centered card, dark background with subtle texture.
- Strong headline, helper copy, form fields, 2 CTAs.

### 5.5 Privacy (`/privacy`)

- Convert to a premium policy layout with sections + bullet points.
- Use card blocks with clear heading hierarchy.

---

## 6) Component Inventory (Exact Adds/Upgrades)

- Utility top bar component.
- Hero badge pill.
- Trust rating row.
- Metric card component.
- Expertise split section.
- Badge strip (pill chips).
- CTA band.
- Intake step panel card.
- Upload tile component.
- Admin record card.
- AI summary card.

---

## 7) Visual QA Acceptance Criteria

The frontend is accepted when:
- Hero feels “enterprise‑grade” without scrolling.
- Trust + stats appear in first scroll.
- Cards look layered (no flat panels).
- Typography hierarchy feels premium.
- Admin dashboard reads like a SaaS tool.
- Mobile is dense but not cramped.

---

## 8) Implementation Phases (Order of Work)

1. **Tokens + typography refresh** (fonts, colors, spacing).
2. **Top bar + header + footer**.
3. **Hero + metrics + trust** (highest impact).
4. **Intake stepper + cards + uploads**.
5. **Admin dashboard refactor**.
6. **Motion + microinteractions**.
7. **Content polish + spacing QA**.

---

## 9) Testing & QA Rules

- Run `npm run lint` after each phase.
- Check responsive layouts at 375px, 768px, 1280px.
- Verify CTA contrast across backgrounds.
- Ensure no section feels empty or placeholder.

---

## 10) Scope Boundaries

- Frontend‑only refactor with dummy data.
- No backend integration in this phase.
- Focus is visual polish + premium perception.
