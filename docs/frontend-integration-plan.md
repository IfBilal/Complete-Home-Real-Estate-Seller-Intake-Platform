# Frontend ↔ Backend Integration Plan
## Complete Home — Real Estate Seller Intake Platform
### v1 — Full Integration (Frontend Dummy Data → Real API)

> **Goal:** Replace every piece of mock/dummy data and localStorage-only logic in the frontend with real API calls to the backend. After this plan is fully implemented, the intake form submits real data to Supabase, the admin dashboard shows real submissions, and no dummy data remains anywhere.
>
> **Read this before starting:** The backend is 100% complete and audited. All routes, types, and DB schema are stable. This plan is purely about wiring the existing frontend UI to those existing backend routes. You will NOT add new backend routes or change backend files unless specifically instructed. The frontend UI (CSS, layout, animations) stays exactly as-is — only data sources change.

---

## Stack Reference

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 App Router · TypeScript strict · React hooks |
| Backend | Next.js API Routes (fully complete) |
| Database | Supabase Postgres |
| Storage | Supabase Storage (bucket: `property-media`) |
| Auth | Supabase Auth (session via cookies) |
| AI | Groq (called server-side only) |

---

## Current State — What Is Dummy and What Is Real

### `app/intake/page.tsx` — Currently Dummy
| Area | Current (Dummy) | Target (Real) |
|---|---|---|
| Address suggestions | `mockProperties[]` hardcoded array | `GET /api/address/autocomplete?q=&session=` |
| Address details | `mockProperties` fields | `GET /api/address/details?placeId=` |
| Property prefill | `selectedProperty.sqft/beds/baths` from mock | `GET /api/address/property?address=` (RentCast + Street View) |
| Draft creation | Nothing — no submission ID | `POST /api/intake/draft` on address confirm |
| File uploads | `setTimeout` fake progress, 20% random mismatch | `uploadFile()` from `lib/client/upload.ts` (real S3 PUT + AI) |
| Form submit | Writes to `localStorage["ch_submissions"]` | `POST /api/intake/submit` |
| AI Summary on Review | `lib/aiSummary.ts` local mock functions | Real `ai_summary` field from submission data |
| Session resume | Only stores UI state in `localStorage` | Also stores `submissionId`, `humanId`, `placeId` |

### `app/admin/page.tsx` — Currently Dummy
| Area | Current (Dummy) | Target (Real) |
|---|---|---|
| Auth gate | `isLoggedIn` boolean, `Enter Demo Dashboard` button | Real Supabase session check via `requireAdmin()` |
| Submission list | `MOCK_SUBMISSIONS[]` + `localStorage["ch_submissions"]` | `GET /api/admin/submissions` with filters |
| Submission detail | Local state from `records[]` | `GET /api/admin/submissions/[id]` |
| Status update | Updates local React state only | `PATCH /api/admin/submissions/[id]` |
| Internal notes | Textarea with fake "Saved" button, no persistence | `PATCH /api/admin/submissions/[id]` with `noteText` |
| Gallery | Colored CSS gradient boxes per room | `GET /api/admin/submissions/[id]/files` → signed URLs |
| AI Summary | `lib/aiSummary.ts` local mock | Real `ai_summary` JSON from submission |
| Regenerate Summary | No button | `POST /api/admin/submissions/[id]/summarize` |
| Sign out | `setIsLoggedIn(false)` only | `POST /api/admin/auth/logout` + `router.push("/admin/login")` |
| City dropdown | Parses `address` string with `.split(",")` | Uses `address_city` field from API |
| Pagination | None (all records in memory) | `page` + `limit` params on list API |

---

## File Map — What Gets Created or Changed

### New Files
```
lib/client/apiClient.ts          — typed fetch() wrapper, unwraps ok() envelope
lib/client/intakeSession.ts      — localStorage session shape + helpers
hooks/useAdminSubmissions.ts     — fetches + manages submission list state
hooks/useAdminSubmission.ts      — fetches single submission detail + files
app/admin/page.tsx               — full rewrite (real data)
app/intake/page.tsx              — surgical changes per-section (no layout change)
```

### Modified Files
```
app/intake/page.tsx              — wire all 6 steps to real APIs
app/admin/page.tsx               — full rewrite, same visual layout, real data
components/HeroResumeCard.tsx    — UPDATE REQUIRED: reads session.selectedProperty.address
                                   which does not exist in the new IntakeSession shape;
                                   must be updated to read session.selectedAddress instead
lib/aiSummary.ts                 — keep file, but intake page no longer calls it
                                   (admin still won't use it after integration)
```

### Files That Stay Unchanged
```
All app/api/**                   — backend complete, do not touch
lib/types.ts                     — types already exported, import from here
lib/client/compress.ts           — complete
lib/client/upload.ts             — complete
middleware.ts                    — complete
next.config.js                   — complete
vercel.json                      — complete
All lib/ai/*, lib/email/*, lib/supabase/*, lib/api/*   — backend, do not touch
```

---

## Phase 1 — Shared API Client Utility

**File:** `lib/client/apiClient.ts`

**Purpose:** The backend's `ok()` helper wraps all success responses as `{ success: true, data: T }`. Every frontend `fetch()` call must unwrap this envelope. Rather than repeat `const { data } = await res.json()` in 15 places, create one typed helper that does it once and throws on HTTP errors.

**What to implement:**
```typescript
// Generic typed fetch that unwraps { success: true, data: T }
export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<T>
// Throws ApiError with { message, status } on non-ok responses
// Returns T (the unwrapped data) on success

export class ApiError extends Error {
  constructor(public message: string, public status: number) {}
}
```

**Exact behavior:**
1. Call `fetch(url, options)`
2. Parse JSON — if parse fails, throw `ApiError("Unexpected response", res.status)`
3. If `!res.ok` → read `json.error` → throw `ApiError(json.error ?? "Request failed", res.status)`
4. If `res.ok` → return `json.data as T`
5. Mark file `"use client"` — it's browser-only

**Why:** Every intake step and admin hook will import `apiFetch`. It eliminates the `.data` unwrapping bug class entirely.

---

## Phase 2 — Intake Session State Shape

**File:** `lib/client/intakeSession.ts`

**Purpose:** The current `localStorage` session only stores UI state. After integration, it must also store the backend `submissionId` and `humanId` (needed for upload and submit calls), the Google Places `sessionToken` (needed for Places API billing), and the `placeId` of the selected property (needed to call details endpoint).

**What to implement:**

```typescript
export const SESSION_KEY = "ch_intake_session";

export interface IntakeSession {
  // Step 0 — Address
  currentStep:      number;
  addressQuery:     string;
  placeId:          string | null;      // Google Places placeId
  sessionToken:     string | null;      // Google Places session token
  selectedAddress:  string | null;      // full formatted address string
  addressCity:      string | null;
  addressState:     string | null;
  addressZip:       string | null;
  addressLat:       number | null;
  addressLng:       number | null;
  isConfirmed:      boolean;
  // Backend draft
  submissionId:     string | null;      // UUID from POST /api/intake/draft
  humanId:          string | null;      // e.g. "CH-0042"
  // Step 1 — Property
  sqft:             string | null;
  beds:             number | null;
  baths:            number | null;
  yearBuilt:        string;
  lotSize:          string;
  condition:        string;
  exteriorImageUrl: string | null;      // Street View URL from property API
  // Step 2 — Rooms
  selectedRooms:    string[];
  // Step 4 — Contact
  firstName:        string;
  lastName:         string;
  email:            string;
  phone:            string;
  savedAt:          string;
}

export const DEFAULT_SESSION: IntakeSession = { ... all null/empty ... }

export function loadSession(): IntakeSession | null
export function saveSession(s: IntakeSession): void
export function clearSession(): void
```

**Why:** Centralizing session shape eliminates scattered `localStorage.getItem` calls across the component. The `submissionId` is the critical new field — without it, upload and submit calls have no target.

---

## Phase 2.A — HeroResumeCard: Session Shape Update

**File:** `components/HeroResumeCard.tsx`

**What is currently wrong:**
`HeroResumeCard` reads the intake session from `localStorage[SESSION_KEY]` using its own local interface. That local interface likely has a `selectedProperty` object with a `.address` field — but the new `IntakeSession` shape (Phase 2) replaces `selectedProperty` with flat fields (`selectedAddress`, `addressCity`, etc.).

**What to change:**

Update `HeroResumeCard`'s local session read to match the new shape. Find the local `Session` or equivalent type definition inside the component and change:

```typescript
// Old local interface (whatever shape the component currently uses):
interface LocalSession { selectedProperty?: { address?: string }; ... }
const addr = session.selectedProperty?.address ?? "";

// New:
interface LocalSession { selectedAddress?: string | null; ... }
const addr = session.selectedAddress ?? "";
```

Also update the display of beds/baths/sqft if the card shows them — use `session.beds`, `session.baths`, `session.sqft` directly (flat fields, not from a nested `selectedProperty` object).

**Why this matters:** After Phase 2 is implemented, `selectedProperty` will no longer exist in `localStorage`. If `HeroResumeCard` still reads `session.selectedProperty?.address`, the resume banner will show a blank address, breaking the resume UX.

---

## Phase 3 — Address Step: Real Autocomplete

**File:** `app/intake/page.tsx` — Step 0 changes

**What is currently wrong:**
- `filteredSuggestions` filters against hardcoded `mockProperties[]` (line 265–273)
- `showDropdown` shows after 2 chars but searches mock data
- `handleSelectProperty` sets a mock property object as state

**What to change:**

### 3.1 — New state variables to add
```typescript
const [suggestions, setSuggestions] = useState<PlacesAutocompleteResult[]>([]);
const [sessionToken] = useState(() => crypto.randomUUID());   // generate once on mount
const [autocompleteLoading, setAutocompleteLoading] = useState(false);
const [propertyData, setPropertyData] = useState<PropertyDetails | null>(null);
const [exteriorImageUrl, setExteriorImageUrl] = useState<string | null>(null);
```

Where `PlacesAutocompleteResult` and `PropertyDetails` are imported from `lib/types.ts`.

### 3.2 — Replace `filteredSuggestions` memo with debounced API call

Remove the `filteredSuggestions` useMemo entirely. Replace with a `useEffect` that fires when `addressQuery` changes:

```typescript
useEffect(() => {
  if (addressQuery.length < 2) { setSuggestions([]); return; }
  const timer = setTimeout(async () => {
    setAutocompleteLoading(true);
    try {
      const results = await apiFetch<PlacesAutocompleteResult[]>(
        `/api/address/autocomplete?q=${encodeURIComponent(addressQuery)}&session=${sessionToken}`
      );
      setSuggestions(results);
    } catch {
      setSuggestions([]);
    } finally {
      setAutocompleteLoading(false);
    }
  }, 300); // 300ms debounce
  return () => clearTimeout(timer);
}, [addressQuery, sessionToken]);
```

**Important:** The Google Places API (New) session token must be the SAME value for all autocomplete requests in one user session, then sent with the details call to combine billing. The `sessionToken` state (initialized once on mount with `crypto.randomUUID()`) serves this purpose.

### 3.3 — Replace dropdown render

Replace `filteredSuggestions.map(p => ...)` with `suggestions.map(s => ...)` where `s` is of type `PlacesAutocompleteResult`:
```typescript
// PlacesAutocompleteResult shape (from lib/types.ts):
// { placeId: string; description: string; mainText: string; secondaryText: string }
```

Replace the dropdown item content:
```tsx
<span className="dropdown-address-line">{s.mainText}</span>
<span className="dropdown-meta-line">{s.secondaryText}</span>
```

Remove the mock `dropdown-meta-line` that showed `sqft · beds · baths · Built year` — those come from the property API, not autocomplete.

### 3.4 — Replace `handleSelectProperty`

The current function accepts a mock property object. Replace it to accept a `PlacesAutocompleteResult`:

```typescript
const handleSelectProperty = useCallback(async (suggestion: PlacesAutocompleteResult) => {
  setAddressQuery(suggestion.description);
  setIsConfirmed(false);
  setHighlightedIndex(-1);
  setSuggestions([]);
  // Store placeId in session for Details call at confirm time
  updateSession({ placeId: suggestion.placeId, selectedAddress: suggestion.description });
}, []);
```

### 3.5 — Replace keyboard navigation

Update `highlightedIndex` logic: remove the mock `filteredSuggestions.length + 1` total (for manual entry), replace with `suggestions.length + 1`.

### 3.6 — Remove `mockProperties` entirely

Delete lines 112–137 (`const mockProperties = [...]`). This is the core of the dummy data removal for the address step.

**Migration note for `showDropdown`:**
```typescript
// Old: addressQuery.length >= 2 && !isConfirmed && !selectedProperty
// New: addressQuery.length >= 2 && !isConfirmed && suggestions.length > 0
const showDropdown = addressQuery.length >= 2 && !isConfirmed && suggestions.length > 0;
```

---

## Phase 4 — Address Step: Place Details + Property Data

**File:** `app/intake/page.tsx` — Step 0, `handleConfirm` rewrite

**What is currently wrong:**
- `handleConfirm` (line 486–492) just sets a timeout and sets `isConfirmed = true`
- It never calls any API
- No `submissionId` is created

**What to change:**

### 4.1 — Rewrite `handleConfirm`

```typescript
const handleConfirm = useCallback(async () => {
  setIsConfirming(true);
  try {
    // 1. Get structured place details (city, state, zip, lat, lng)
    const placeId = session.placeId; // from session state
    let city = "", state = "", zip = "", lat = 0, lng = 0;
    let fullAddress = addressQuery;

    if (placeId) {
      const details = await apiFetch<PlaceDetails>(
        `/api/address/details?placeId=${encodeURIComponent(placeId)}`
      );
      // PlaceDetails uses addressCity/addressState/addressZip (NOT city/state/zip)
      city = details.addressCity ?? "";
      state = details.addressState ?? "";
      zip = details.addressZip ?? "";
      lat = details.lat ?? 0;
      lng = details.lng ?? 0;
      fullAddress = details.formattedAddress ?? addressQuery;
    }

    // 2. Get property data (RentCast + Street View)
    const propData = await apiFetch<PropertyDetails>(
      `/api/address/property?address=${encodeURIComponent(fullAddress)}`
    ).catch(() => null); // non-blocking — proceed even if RentCast fails

    // 3. Pre-fill property step fields from RentCast (user can edit on Step 1)
    // PropertyDetails fields: beds/baths (NOT bedrooms/bathrooms); sqft is already a string
    if (propData) {
      setPropertyData(propData);
      setExteriorImageUrl(propData.exteriorImageUrl ?? null);
      if (propData.beds) setBeds(propData.beds);
      if (propData.baths) setBaths(propData.baths);
      if (propData.yearBuilt) setYearBuilt(propData.yearBuilt);
      if (propData.lotSize) setLotSize(propData.lotSize);
      if (propData.sqft) setSqft(propData.sqft);   // sqft is string | undefined in PropertyDetails
    }

    // 4. Create draft submission in DB — get real submissionId
    const existingId = session.submissionId ?? undefined;
    const draft = await apiFetch<{ submissionId: string; humanId: string }>(
      "/api/intake/draft",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address:      fullAddress,
          addressCity:  city,
          addressState: state,
          addressZip:   zip,
          addressLat:   lat,
          addressLng:   lng,
          sqft:         propData?.sqft ?? undefined,          // already string in PropertyDetails
          beds:         propData?.beds ?? undefined,           // beds NOT bedrooms
          baths:        propData?.baths ?? undefined,          // baths NOT bathrooms
          yearBuilt:    propData?.yearBuilt ?? undefined,      // already string in PropertyDetails
          lotSize:      propData?.lotSize ?? undefined,
          existingDraftId: existingId,
        }),
      }
    );

    // 5. Store submissionId + humanId in session
    updateSession({
      submissionId:     draft.submissionId,
      humanId:          draft.humanId,
      selectedAddress:  fullAddress,
      addressCity:      city,
      addressState:     state,
      addressZip:       zip,
      addressLat:       lat,
      addressLng:       lng,
      exteriorImageUrl: propData?.exteriorImageUrl ?? null,
      sqft:             propData?.sqft ?? null,   // already string in PropertyDetails
    });

    setIsConfirmed(true);
  } catch (e) {
    setErrors({ address: "Could not confirm address. Please try again." });
    console.error(e);
  } finally {
    setIsConfirming(false);
  }
}, [addressQuery, session, ...]);
```

### 4.2 — Add `sqft` state variable

The intake page currently does not have a `sqft` state variable (beds, baths, yearBuilt, lotSize exist but not sqft). Add:
```typescript
const [sqft, setSqft] = useState<string | null>(null);
```

This is needed because the submit body sends `sqft` to the backend (it's in the `submitSchema`).

### 4.3 — Show Street View image in property card

The property card currently shows a blank `<div className="property-image">`. Replace with:
```tsx
{exteriorImageUrl ? (
  <img
    src={exteriorImageUrl}
    alt="Street view"
    className="property-image"
    style={{ objectFit: "cover", width: "100%", height: "100%" }}
  />
) : (
  <div className="property-image">
    <span className="property-image-label">Exterior · Auto-fetched</span>
  </div>
)}
```

**Note:** `exteriorImageUrl` is a Google Street View Static API URL, which is not served through Next.js `<Image>` — use a regular `<img>` tag. If you want to use `<Image>`, the `maps.googleapis.com` domain is already in `next.config.js` remotePatterns.

### 4.4 — Show `sqft` in property card meta line

```tsx
// Old:
`${selectedProperty.sqft} sqft · ${selectedProperty.beds} bed · ${selectedProperty.baths} bath`

// New:
`${sqft ?? "—"} sqft · ${beds ?? "—"} bed · ${baths ?? "—"} bath`
```

### 4.5 — Google Places session token reset after selection

After calling the details endpoint, the session token must be reset so the next address search starts a fresh billing session. After the `handleConfirm` resolves:
```typescript
// Reset session token for next address search — M4 fix from backend plan
// The simplest way: regenerate it in local component state
// But since sessionToken is from useState (initialized once), we need a ref:
const sessionTokenRef = useRef(crypto.randomUUID());
// Replace the useState-based sessionToken with this ref value
```

Alternatively — and simpler — since `handleConfirm` consumes the placeId (the details call uses it), simply clear `placeId` from session after confirm:
```typescript
updateSession({ placeId: null }); // consumed, session token resets naturally on next mount
```

---

## Phase 5 — Property Step: Pre-fill from RentCast

**File:** `app/intake/page.tsx` — Step 1

**What is currently wrong:**
- Step 1 shows empty fields by default (bedrooms/bathrooms/yearBuilt/lotSize start as null/"")
- When user arrives via mock property selection, fields were pre-populated from mock data
- After real API integration, fields are pre-populated from RentCast data in `handleConfirm`

**What needs to change:** Phase 4 already sets `setBeds`, `setBaths`, `setYearBuilt`, `setLotSize`, `setSqft` from RentCast data in `handleConfirm`. Step 1 already renders those state variables as controlled inputs — so Step 1 visually "just works" with the Phase 4 changes.

**Additional changes for Step 1:**

### 5.1 — Add sqft field to Step 1 form

The current Step 1 form (Property step) does not include a sqft input. The backend `submitSchema` includes `sqft`. Add it:

```tsx
<div>
  <label className="input-label">Square Footage</label>
  <input
    className="text-input"
    type="number"
    placeholder="2140"
    value={sqft ?? ""}
    onChange={e => setSqft(e.target.value)}
  />
  <p className="helper-text">From public records — edit if incorrect.</p>
</div>
```

Place it as the first field in the `form-grid` div, before Bedrooms.

### 5.2 — Add "Pre-filled from records" banner

When `propertyData` is not null (RentCast returned data), show a subtle info banner at the top of the property step:

```tsx
{propertyData && (
  <div className="prefill-notice">
    <span>✓</span>
    Property details pre-filled from public records. Edit any field if needed.
  </div>
)}
```

No CSS change needed — use existing `intake-error` class with a different color, or add `prefill-notice` as a new CSS class in globals.css with a green-tinted background.

### 5.3 — Property validation — add sqft

The existing `propertySchema` validates beds/baths/yearBuilt/lotSize/condition. Add sqft as optional (user may not have it):
```typescript
const propertySchema = z.object({
  sqft:       z.string().optional(),
  bedrooms:   z.number().min(1),
  bathrooms:  z.number().min(1),
  yearBuilt:  z.string().min(4),
  lotSize:    z.string().min(1),
  condition:  z.string().min(1)
});
```

---

## Phase 6 — Upload Step: Real File Upload Pipeline

**File:** `app/intake/page.tsx` — Step 3, `addUpload` function rewrite

This is the most significant change in the intake flow. The current `addUpload` function simulates uploads with `setTimeout`. Replace it with real calls through `lib/client/upload.ts`.

### 6.1 — Update `UploadItem` interface

```typescript
interface UploadItem {
  localId:     string;        // frontend-only ID (room-timestamp), replaces former `id` field
  fileId:      string | null; // backend UUID from upload/init (null until confirmed)
  storagePath: string | null;
  name:        string;
  type:        "photo" | "video";
  preview:     string | null;
  progress:    number;
  status:      "compressing" | "requesting" | "uploading" | "confirming" | "analyzing" | "ok" | "mismatch" | "error";
  errorMsg?:   string;
  originalFile: File;         // kept for retry
}
```

**Key additions:**
- `localId` — renamed from `id` to avoid confusion with the backend `fileId` UUID. All component internals that reference `item.id` must be updated to `item.localId` (see Phase 6.5).
- `fileId` — the UUID returned by the backend, needed for status polling and any future delete
- `storagePath` — from the backend, for reference
- `"requesting"` — new stage emitted by `lib/client/upload.ts` while the init request is in flight (between `compressing` and `uploading`). Map it to `"uploading"` in the progress callback if you don't want a separate badge, or add a dedicated badge `"⟳ Requesting"`.
- `"confirming"` and `"analyzing"` stages — match `UploadStage` from `lib/client/upload.ts`
- `"error"` status — allows retry UI
- `errorMsg` — human-readable error for display
- `originalFile` — required for retry (Phase 6.4)

### 6.2 — Update `UploadSlot` status badge rendering

```tsx
{item.status === "compressing" && "⏳ Compressing"}
{item.status === "requesting"  && "⟳ Requesting"}
{item.status === "uploading"   && `↑ ${item.progress}%`}
{item.status === "confirming"  && "⟳ Saving"}
{item.status === "analyzing"   && "🔍 Analyzing"}
{item.status === "ok"          && "✓ Matched"}
{item.status === "mismatch"    && "⚠ Wrong room?"}
{item.status === "error"       && "✕ Failed"}
```

Also add a retry button when status is `"error"`:
```tsx
{item.status === "error" && (
  <button type="button" className="upload-retry-btn" onClick={() => onRetry(item.id)}>
    Retry
  </button>
)}
```

Add `onRetry: (id: string) => void` to `UploadSlotProps`.

### 6.3 — Rewrite `addUpload`

```typescript
const addUpload = useCallback(async (room: string, file: File) => {
  const isVideo = file.type.startsWith("video/");
  const localId = `${room}-${Date.now()}`;
  const preview = !isVideo ? URL.createObjectURL(file) : null;

  // Guard — submissionId must exist before any upload
  if (!session.submissionId) {
    setErrors({ uploads: "Session expired. Please go back to Step 1 and re-confirm your address." });
    return;
  }

  // Optimistically add item in "compressing" state
  // Note: session.submissionId is string | null — the guard above ensures it is non-null here
  const submissionId = session.submissionId; // non-null guaranteed by guard above
  setUploads(prev => ({
    ...prev,
    [room]: [...(prev[room] ?? []), {
      localId, fileId: null, storagePath: null,
      name: file.name, type: isVideo ? "video" : "photo",
      preview, progress: 0, status: "compressing",
      originalFile: file,
    }]
  }));

  try {
    const result = await uploadFile(
      file,
      submissionId,   // local const (non-null string) assigned above
      room,
      (p) => {
        setUploads(prev => ({
          ...prev,
          [room]: (prev[room] ?? []).map(u =>
            u.localId === localId
              ? { ...u, status: p.stage as UploadItem["status"], progress: p.percent }
              : u
          )
        }));
      }
    );

    // Upload complete — update with real fileId and AI result
    setUploads(prev => ({
      ...prev,
      [room]: (prev[room] ?? []).map(u =>
        u.localId === localId
          ? {
              ...u,
              fileId:      result.fileId,
              storagePath: result.storagePath,
              status:      result.isMismatch ? "mismatch" : "ok",
              progress:    100,
            }
          : u
      )
    }));
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Upload failed";
    setUploads(prev => ({
      ...prev,
      [room]: (prev[room] ?? []).map(u =>
        u.localId === localId
          ? { ...u, status: "error", errorMsg: msg, progress: 0 }
          : u
      )
    }));
  }
}, [session.submissionId]);
```

### 6.4 — Add `retryUpload` handler

```typescript
const retryUpload = useCallback((room: string, localId: string, file: File) => {
  // Remove the failed item and re-add with the original file
  setUploads(prev => ({
    ...prev,
    [room]: (prev[room] ?? []).filter(u => u.localId !== localId)
  }));
  addUpload(room, file);
}, [addUpload]);
```

**Note:** To enable retry, `UploadItem` needs to store the original `File` reference. Add `originalFile: File` to the interface, set it in `addUpload`, and pass `item.originalFile` to `onRetry`.

### 6.5 — Update `removeUpload` and `UploadSlot` internals

Currently removes by `id`. Update to remove by `localId` since that's what the UploadItem uses:
```typescript
const removeUpload = (room: string, localId: string) => {
  setUploads(prev => {
    const item = (prev[room] ?? []).find(u => u.localId === localId);
    if (item?.preview) URL.revokeObjectURL(item.preview);
    return { ...prev, [room]: (prev[room] ?? []).filter(u => u.localId !== localId) };
  });
};
```

All `onRemove` and `onMove` calls in JSX must pass `item.localId` instead of `item.id`.

**Inside `UploadSlot` component** — the component itself likely uses `item.id` as the React `key` and in callbacks. Update:
- `key={item.id}` → `key={item.localId}`
- Any `onRemove(item.id)` call → `onRemove(item.localId)`
- Any `onMove(item.id, ...)` call → `onMove(item.localId, ...)`
- Any `onRetry(item.id)` call → `onRetry(item.localId)`

Search for `item.id` inside `components/UploadSlot.tsx` (or wherever the slot component lives) and replace all occurrences with `item.localId`.

### 6.6 — Update mismatch detection

Currently: `status === "mismatch"` is randomly assigned by a 20% chance.
After integration: AI sets it based on `result.isMismatch` from `uploadFile()`.

The mismatch panel JSX stays exactly as-is. Only the data source changes (Phase 6.3 handles it).

### 6.7 — Guard "Continue" on Step 3

Currently `uploadsSchema` checks `totalUploads >= 1`. Add additional guard: no item in `"uploading"`, `"compressing"`, `"confirming"`, or `"analyzing"` state (uploads still in progress):

```typescript
if (step === 3) {
  const inProgress = Object.values(uploads).flat()
    .some(u => ["compressing", "uploading", "confirming", "analyzing"].includes(u.status));
  if (inProgress) {
    setErrors({ uploads: "Please wait for all uploads to finish before continuing." });
    return false;
  }
  // ... existing checks
}
```

---

## Phase 7 — Submit Step: Real Submission

**File:** `app/intake/page.tsx` — Step 5 submit button handler

**What is currently wrong:**
- Submit button (line 1286–1326) creates a fake `MS-{timestamp}` ID
- Saves to `localStorage["ch_submissions"]`
- Never calls the backend

**What to change:**

### 7.1 — Add `submitting` and `submitError` state

```typescript
const [submitting, setSubmitting]     = useState(false);
const [submitError, setSubmitError]   = useState<string | null>(null);
```

### 7.2 — Rewrite submit button handler

```typescript
onClick={async () => {
  if (!session.submissionId) {
    setSubmitError("Session error. Please start over.");
    return;
  }
  setSubmitting(true);
  setSubmitError(null);
  // session.submissionId is string | null — the early-return guard above ensures non-null here
  const submissionId = session.submissionId!; // non-null: guarded by check at top of handler
  try {
    await apiFetch<{ submissionId: string; humanId: string }>(
      "/api/intake/submit",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId:   submissionId,
          firstName,
          lastName,
          email,
          phone,
          sqft:           sqft ?? undefined,
          beds:           beds ?? undefined,
          baths:          baths ?? undefined,
          yearBuilt:      yearBuilt || undefined,
          lotSize:        lotSize || undefined,
          condition:      condition || undefined,
          rooms:          selectedRooms,
          prequalAnswers: prequalAnswers,
        }),
      }
    );
    // Clear session after successful submit
    clearSession();
    localStorage.removeItem("ch_prequal_answers");
    setShowSuccess(true);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Submission failed. Please try again.";
    setSubmitError(msg);
  } finally {
    setSubmitting(false);
  }
}}
```

### 7.3 — Update submit button UI

```tsx
<button
  className="button-primary submit-button"
  type="button"
  disabled={submitting}
  onClick={...}
>
  {submitting ? <><span className="btn-spinner" /> Submitting…</> : "Submit Intake"}
</button>
{submitError && <p className="intake-error">⚠ {submitError}</p>}
```

### 7.4 — Update success modal

Show the real `humanId` from session in the success modal:
```tsx
<p>
  Your submission <strong>{session.humanId ?? ""}</strong> has been sent for review.
  You'll receive a confirmation email with next steps.
</p>
```

---

## Phase 8 — Review Step: Real AI Summary

**File:** `app/intake/page.tsx` — Step 5, AI Summary card

**What is currently wrong:**
- The AI Summary card at line 1200–1237 calls `getOverview(condition, ...)`, `getRoomSignal(room, ...)`, `getFlags(condition)`, `getAssessment(condition)` — all from `lib/aiSummary.ts`
- These are local mock functions with no real AI

**What to change:**

The real AI summary is generated server-side after upload (in the submit fire-and-forget). The Review step (Step 5) is shown BEFORE the user submits. At the moment the user reaches Step 5, the backend has not yet generated the summary (submit hasn't been called yet).

**Decision:** Keep the local `lib/aiSummary.ts` mock for the Review step preview. It's shown as a "Preview" to help the user understand what the team will see — not the final AI-generated summary. The admin dashboard will show the real Groq-generated summary.

**Change the label** to make this clear:
```tsx
// Old:
<h3>AI Summary (Preview)</h3>
<span className="ai-badge">Generated</span>

// New:
<h3>AI Summary (Preview)</h3>
<span className="ai-badge">Estimated · Final generated after review</span>
```

No functional change needed here — the mock is intentional on the intake side.

---

## Phase 9 — Session Resume with Real submissionId

**File:** `app/intake/page.tsx` — session restore `useEffect`

**What is currently wrong:**
- Session restore on mount (line 387–412) restores UI state but loses the real `submissionId`
- After integration, we store `submissionId` in `IntakeSession` shape

**What to change:**

Replace the scattered `localStorage.getItem(SESSION_KEY)` + JSON.parse pattern with the `loadSession()` helper from `lib/client/intakeSession.ts`:

```typescript
useEffect(() => {
  const s = loadSession();
  if (!s || s.currentStep === 0) return;
  // Restore all UI state from session
  setCurrentStep(s.currentStep);
  setAddressQuery(s.selectedAddress ?? "");
  setIsConfirmed(s.isConfirmed);
  setBeds(s.beds);
  setBaths(s.baths);
  setYearBuilt(s.yearBuilt);
  setLotSize(s.lotSize);
  setSqft(s.sqft);
  setCondition(s.condition);
  setSelectedRooms(s.selectedRooms);
  setFirstName(s.firstName);
  setLastName(s.lastName);
  setEmail(s.email);
  setPhone(s.phone);
  setExteriorImageUrl(s.exteriorImageUrl);
  // submissionId is already in session — no need to setState, read from session directly
  if (s.currentStep > 0) setShowResumeBanner(true);
}, []);
```

**Note on submissionId:** Rather than having a separate `useState` for submissionId, read it directly from the session object when needed (e.g., in `addUpload`, `handleConfirm`, submit handler). This avoids a double-source-of-truth problem. The `session` state variable is the single source of truth for `submissionId`.

**Session save effect** — replace the scattered manual object with `saveSession(session)`:
```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    saveSession({
      currentStep, selectedAddress: addressQuery, isConfirmed,
      beds, baths, yearBuilt, lotSize, sqft, condition,
      selectedRooms, firstName, lastName, email, phone,
      submissionId: ..., humanId: ..., exteriorImageUrl: ...,
      // etc.
      savedAt: new Date().toISOString(),
    });
  }, 800);
  return () => clearTimeout(timer);
}, [currentStep, addressQuery, isConfirmed, beds, baths, ...]);
```

### 9.1 — `handleStartFresh`

When user clicks "Start fresh", also clear the `submissionId` from session:
```typescript
clearSession();
localStorage.removeItem("ch_prequal_answers");
setCurrentStep(0);
// reset all form state...
```

**Important — draft cleanup:** Abandoned draft rows (`draft=true`, never submitted) remain in the DB indefinitely. Rate limiting and the cron job have been removed from the project entirely — frontend debounce + button disable states are sufficient for this app. Orphan drafts can be pruned via a manual admin SQL query when needed.

---

## Phase 10 — Admin: Authentication Gate

**File:** `app/admin/page.tsx`

**What is currently wrong:**
- `isLoggedIn` state starts as `false`
- Shows a card with "Enter Demo Dashboard" button that just does `setIsLoggedIn(true)`
- No real Supabase session check

**What to change:**

### 10.1 — Replace isLoggedIn with session check

The admin page is a **server component** wrapped in middleware. Since `middleware.ts` already protects `/admin` (redirects to `/admin/login` if no session), by the time `app/admin/page.tsx` renders, the user IS authenticated.

**Therefore:** Remove the `isLoggedIn` state entirely. Remove the login gate JSX (lines 237–265). The page always renders the dashboard. The middleware handles the redirect.

```typescript
// Delete these:
const [isLoggedIn, setIsLoggedIn] = useState(false);
// Delete the if (!isLoggedIn) { return <login card> } block entirely
```

### 10.2 — Sign out button

Replace:
```typescript
// Old:
onClick={() => setIsLoggedIn(false)}

// New:
onClick={async () => {
  await fetch("/api/admin/auth/logout", { method: "POST" });
  router.push("/admin/login");
}}
```

Add `const router = useRouter();` at the top of the component.

---

## Phase 11 — Admin: Real Submissions Hook

**File:** `hooks/useAdminSubmissions.ts` (new file)

**Purpose:** Encapsulate all state management for the admin submissions list — fetching, filtering, pagination, loading states, and refetch. The admin page component imports this hook and uses its returned values directly.

**What to implement:**

```typescript
"use client";

export interface UseAdminSubmissionsOptions {
  status?:  string;
  city?:    string;
  date?:    string;
  query?:   string;
  page?:    number;
  limit?:   number;
}

export interface UseAdminSubmissionsResult {
  items:      AdminSubmissionListItem[];
  total:      number;
  page:       number;
  loading:    boolean;
  error:      string | null;
  refetch:    () => void;
}

export function useAdminSubmissions(opts: UseAdminSubmissionsOptions): UseAdminSubmissionsResult
```

**Internal implementation:**
1. Build a URL from opts: `/api/admin/submissions?status=X&city=Y&date=Z&q=W&page=N&limit=50`
2. `useEffect` fires when any opt changes — debounce `query` by 300ms
3. Sets `loading = true`, calls `apiFetch`, sets `items` + `total`, sets `loading = false`
4. On error: sets `error` message, `items = []`
5. `refetch` function re-triggers the effect

**Important:** Import `AdminSubmissionListItem` from `lib/types.ts`.

---

## Phase 12 — Admin: Submissions List Render

**File:** `app/admin/page.tsx` — sidebar records list

**What to change:**

### 12.1 — Replace MOCK_SUBMISSIONS with hook

```typescript
// Remove:
const [records, setRecords] = useState<Submission[]>(MOCK_SUBMISSIONS);
// Remove: the useEffect that merges from localStorage["ch_submissions"]

// Add:
const [statusFilter, setStatusFilter] = useState("All");
const [cityFilter, setCityFilter] = useState("All");
const [dateFilter, setDateFilter] = useState("All Time");
const [searchQuery, setSearchQuery] = useState("");
const [page, setPage] = useState(1);

const { items, total, loading, error, refetch } = useAdminSubmissions({
  status: statusFilter !== "All" ? statusFilter : undefined,
  city:   cityFilter !== "All" ? cityFilter : undefined,
  date:   dateFilter !== "All Time" ? dateFilter : undefined,
  query:  searchQuery || undefined,
  page,
});
```

### 12.2 — Update sidebar list render

`filteredRecords` no longer exists — use `items` directly (filtering is server-side now):
```tsx
// Replace:
{filteredRecords.map(sub => ...)}
// With:
{loading && <p className="sidebar-empty">Loading…</p>}
{error && <p className="sidebar-empty">Error: {error}</p>}
{!loading && items.length === 0 && <p className="sidebar-empty">No submissions match your filters.</p>}
{items.map(sub => { ... })}
```

### 12.3 — Update avatar + name logic

`AdminSubmissionListItem.name` already has the full name. Use it directly:
```tsx
const initial = sub.name.charAt(0).toUpperCase();
```

### 12.4 — Update city dropdown

Currently the city dropdown is populated by parsing `records[].address` strings. Replace with a static list populated from the API or just let the user type it:

**Option A (simple):** Use a text input for city filter instead of a dropdown. The API accepts `city` as a partial match (`ilike`).

**Option B (static):** Hardcode major cities known to be in the service area. Acceptable for V1.

**Option C (best):** On mount, fetch a distinct list of `address_city` values from the submissions. Add a dedicated API route `GET /api/admin/submissions/cities` later. For V1 use Option A.

**Implement Option A:**
```tsx
// Replace the city <select> with:
<input
  className="sidebar-search"
  type="text"
  placeholder="Filter by city…"
  value={cityFilter === "All" ? "" : cityFilter}
  onChange={e => setCityFilter(e.target.value || "All")}
/>
```

### 12.5 — Add pagination controls

```tsx
<div className="sidebar-pagination">
  <button
    disabled={page === 1}
    onClick={() => setPage(p => p - 1)}
    className="sidebar-page-btn"
  >←</button>
  <span>{page}</span>
  <button
    disabled={items.length < 50}
    onClick={() => setPage(p => p + 1)}
    className="sidebar-page-btn"
  >→</button>
</div>
```

### 12.6 — Update stats in workspace header

Currently reads `records.filter(r => r.status === "New").length`. Replace with API total:
```tsx
<strong>{total}</strong>  // Total from API
```

For breakdown by status, either:
- Make additional filtered requests
- Or show `total` only in the header and remove per-status breakdown
- For V1: just show `total`

### 12.7 — `newCount` badge

`AdminSubmissionListItem` has `is_new: boolean`. Use it:
```typescript
const newCount = items.filter(s => s.is_new).length;
```

---

## Phase 13 — Admin: Single Submission Detail Hook

**File:** `hooks/useAdminSubmission.ts` (new file)

**Purpose:** Encapsulate fetching a single submission's full detail and its files.

```typescript
export interface UseAdminSubmissionResult {
  submission: AdminSubmissionDetail | null;
  files:      SubmissionFileWithUrl[];
  byRoom:     Record<string, SubmissionFileWithUrl[]>;
  loading:    boolean;
  error:      string | null;
  refetch:    () => void;
}

export function useAdminSubmission(id: string | null): UseAdminSubmissionResult
```

**Internal implementation:**
1. When `id` changes (and is not null): call `apiFetch<AdminSubmissionDetail>(`/api/admin/submissions/${id}`)` 
2. After submission loads: call `apiFetch<{ files: SubmissionFileWithUrl[]; byRoom: Record<string, SubmissionFileWithUrl[]> }>(`/api/admin/submissions/${id}/files`)`
3. Both can fire in parallel with `Promise.all`
4. On error: set `error` string

**Import types from `lib/types.ts`:** `AdminSubmissionDetail`, `SubmissionFileWithUrl`

---

## Phase 14 — Admin: Submission Detail Panel

**File:** `app/admin/page.tsx` — main detail panel

**What to change:**

### 14.1 — Replace selectedRecord with hook

```typescript
const [selectedId, setSelectedId] = useState<string | null>(null);
const { submission, files, byRoom, loading: detailLoading, refetch: refetchDetail } = useAdminSubmission(selectedId);
```

Set `selectedId` to the first item's ID when items load:
```typescript
useEffect(() => {
  if (items.length > 0 && !selectedId) setSelectedId(items[0].id);
}, [items]);
```

### 14.2 — Update `handleSelectRecord`

```typescript
const handleSelectRecord = (id: string) => {
  setSelectedId(id);
  setNoteText("");
  // is_new is cleared server-side when GET /api/admin/submissions/[id] is called
  // Optimistically update the list item locally
  // (refetch will confirm after a moment)
};
```

### 14.3 — Update detail hero

```tsx
// Old: selectedRecord.name, selectedRecord.address, selectedRecord.id
// New:
<h2 className="detail-hero-address">{submission?.address ?? "Loading…"}</h2>
<p className="detail-hero-sub">
  {submission ? `${submission.first_name ?? ""} ${submission.last_name ?? ""}`.trim() : ""}
  {" · "}
  {submission?.human_id ?? ""}
</p>
```

### 14.4 — Update detail contact row

```tsx
{submission?.email && <span>✉ {submission.email}</span>}
{submission?.phone && <span>📞 {submission.phone}</span>}
```

### 14.5 — Update property details table

Map from `submission.*` fields instead of `selectedRecord.*`:
```tsx
{ label: "Sq. Footage", value: submission?.sqft || "—" },
{ label: "Bedrooms",   value: submission?.beds ?? "—" },
{ label: "Bathrooms",  value: submission?.baths ?? "—" },
{ label: "Year Built", value: submission?.year_built || "—" },
{ label: "Lot Size",   value: submission?.lot_size || "—" },
{ label: "Condition",  value: submission?.condition || "—", badge: true },
```

Note: Backend uses `year_built` and `lot_size` (snake_case) — `AdminSubmissionDetail` type in `lib/types.ts` must expose these. Verify the type definition includes all fields.

### 14.6 — Update pre-qualification table

```tsx
{submission?.prequal_answers && Object.keys(submission.prequal_answers).length > 0 && (
  <div className="detail-section">
    {Object.entries(submission.prequal_answers).map(([key, value]) => (
      <div key={key} className="prequal-row">
        <span>{PREQUAL_LABELS[key] ?? key}</span>
        <span>{value}</span>
      </div>
    ))}
  </div>
)}
```

### 14.7 — Show loading state

```tsx
{detailLoading && (
  <div className="detail-loading">
    <span className="btn-spinner" /> Loading submission…
  </div>
)}
{!detailLoading && submission && (
  <div className="detail-wrap">
    {/* all detail content */}
  </div>
)}
```

---

## Phase 15 — Admin: Real Gallery

**File:** `app/admin/page.tsx` — Gallery section

**What is currently wrong:**
```tsx
// Line 481–486: Colored CSS gradient boxes per room name
{(selectedRecord.rooms ?? []).map((room, i) => (
  <div key={room} className="gallery-item" style={{ background: `linear-gradient(...)` }}>
    <span className="gallery-item-label">{room}</span>
  </div>
))}
```

**What to change:**

Replace with real signed URLs from `byRoom` (from `useAdminSubmission` hook):

```tsx
<div className="detail-gallery-grid">
  {Object.keys(byRoom).length === 0 && (
    <p className="detail-empty">No photos uploaded yet.</p>
  )}
  {Object.entries(byRoom).map(([room, roomFiles]) => (
    <div key={room} className="gallery-room-group">
      <p className="gallery-room-label">{room}</p>
      <div className="gallery-room-files">
        {roomFiles.map(f => (
          f.file_type === "photo" ? (
            <a key={f.id} href={f.signed_url} target="_blank" rel="noopener noreferrer">
              <img
                src={f.signed_url}
                alt={`${room} photo`}
                className="gallery-item"
                style={{ objectFit: "cover", cursor: "pointer" }}
              />
            </a>
          ) : (
            <a key={f.id} href={f.signed_url} target="_blank" rel="noopener noreferrer" className="gallery-item gallery-video-item">
              <span className="gallery-item-label">▶ {room} video</span>
            </a>
          )
        ))}
      </div>
    </div>
  ))}
</div>
```

**Note:** Signed URLs have 24h expiry. The admin session typically doesn't last longer than that. No refresh logic needed for V1.

---

## Phase 16 — Admin: Real AI Summary

**File:** `app/admin/page.tsx` — AI Summary section

**What is currently wrong:**
- Calls `getOverview(selectedRecord.condition, ...)`, `getRoomSignal(...)`, `getFlags(...)`, `getAssessment(...)` from `lib/aiSummary.ts`
- These are hardcoded strings, not real Groq output

**What to change:**

The backend stores the AI summary as a JSON object in `submissions.ai_summary`. The `AdminSubmissionDetail` type has `ai_summary: AISummary | null`. The **actual** `AISummary` type from `lib/types.ts` is:

```typescript
// CORRECT type — import from lib/types.ts, do NOT redefine locally
interface AISummaryRoom {
  room:    string;
  signal:  RoomSignal;   // "good" | "fair" | "poor"
  label:   string;
  notes?:  string;
}

interface AISummary {
  overview:     string;
  rooms:        AISummaryRoom[];   // array, NOT Record<string, string>
  flags:        string[];
  assessment:   string;
  generated_at: string;            // snake_case, NOT generatedAt
  model:        string;
}
```

Import both types at the top of `app/admin/page.tsx`:
```typescript
import type { AISummary, AISummaryRoom } from "../../lib/types";
```

Replace the entire AI card content:

```tsx
<div className="admin-ai-card">
  {!submission?.ai_summary ? (
    <div className="ai-empty">
      <p>No AI summary yet.</p>
      <button
        type="button"
        className="admin-notes-save"
        onClick={handleRegenerateSummary}
        disabled={regenerating}
      >
        {regenerating ? "Generating…" : "Generate Summary"}
      </button>
    </div>
  ) : (
    <>
      <div className="ai-summary-section">
        <h5>Property Overview</h5>
        <p>{submission.ai_summary.overview}</p>
      </div>
      <div className="ai-summary-section">
        <h5>Condition by Room</h5>
        <div className="ai-room-grid">
          {submission.ai_summary.rooms.map((r: AISummaryRoom) => (
            <div key={r.room} className="ai-room-row">
              <span className="ai-room-name">{r.room}</span>
              <span className={`ai-room-signal ai-signal-${r.signal}`}>{r.label}</span>
              {r.notes && <span className="ai-room-notes">{r.notes}</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="ai-summary-section">
        <h5>Visible Flags</h5>
        <div className="admin-ai-flags">
          {submission.ai_summary.flags.map(flag => (
            <span key={flag}>{flag}</span>
          ))}
        </div>
      </div>
      <div className="ai-summary-section">
        <h5>Overall Assessment</h5>
        <p className="ai-overall">{submission.ai_summary.assessment}</p>
      </div>
      <div className="ai-footer">
        <span className="ai-timestamp">
          Generated {new Date(submission.ai_summary.generated_at).toLocaleString()}
        </span>
        <button
          type="button"
          className="admin-regen-btn"
          onClick={handleRegenerateSummary}
          disabled={regenerating}
        >
          {regenerating ? "Regenerating…" : "↺ Regenerate"}
        </button>
      </div>
    </>
  )}
</div>
```

**Note on regeneration endpoint:** Admin page must call `POST /api/admin/submissions/${selectedId}/summarize` (the admin-namespaced route), NOT `POST /api/ai/summarize`. The latter is also auth-protected but is a separate standalone route — use only the admin-namespaced version in the dashboard. This is already correctly shown in Phase 17.2.

---

## Phase 17 — Admin: Regenerate AI Summary

**File:** `app/admin/page.tsx`

### 17.1 — Add `regenerating` state

```typescript
const [regenerating, setRegenerating] = useState(false);
```

### 17.2 — Implement `handleRegenerateSummary`

```typescript
const handleRegenerateSummary = async () => {
  if (!selectedId) return;
  setRegenerating(true);
  try {
    await apiFetch(`/api/admin/submissions/${selectedId}/summarize`, {
      method: "POST",
    });
    await refetchDetail(); // reload detail to show new summary
  } catch (e) {
    console.error("Summary regeneration failed:", e);
  } finally {
    setRegenerating(false);
  }
};
```

---

## Phase 18 — Admin: Status Update

**File:** `app/admin/page.tsx` — Pipeline section

**What is currently wrong:**
```typescript
// Line 439:
onClick={() => setRecords(prev => prev.map(r => r.id === selectedRecord.id ? { ...r, status: s } : r))}
// This only updates local React state — not persisted to DB
```

**What to change:**

```typescript
const [statusUpdating, setStatusUpdating] = useState(false);

const handleStatusChange = async (newStatus: string) => {
  if (!selectedId || statusUpdating) return;
  setStatusUpdating(true);
  try {
    await apiFetch(`/api/admin/submissions/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    await refetchDetail(); // reload to confirm
    refetch();             // refresh list (status badge in sidebar)
  } catch (e) {
    console.error("Status update failed:", e);
  } finally {
    setStatusUpdating(false);
  }
};
```

Replace the pipeline button onClick:
```tsx
// Old:
onClick={() => setRecords(prev => ...)}
// New:
onClick={() => handleStatusChange(s)}
disabled={statusUpdating}
```

---

## Phase 19 — Admin: Internal Notes

**File:** `app/admin/page.tsx` — Notes section

**What is currently wrong:**
```typescript
// Line 557:
onClick={() => { setNoteSaved(true); setTimeout(() => setNoteSaved(false), 2000); }}
// Note text is never saved to the database
```

**What to change:**

```typescript
const [noteSaving, setNoteSaving] = useState(false);
const [noteSaved, setNoteSaved]   = useState(false);
const [noteError, setNoteError]   = useState<string | null>(null);

const handleSaveNote = async () => {
  if (!selectedId || !noteText.trim()) return;
  setNoteSaving(true);
  setNoteError(null);
  try {
    await apiFetch(`/api/admin/submissions/${selectedId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteText: noteText.trim() }),
    });
    setNoteText("");
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
    await refetchDetail(); // show updated notes history
  } catch (e) {
    setNoteError("Failed to save note. Try again.");
  } finally {
    setNoteSaving(false);
  }
};
```

### 19.1 — Display notes history

The backend stores `internal_notes` as an array of `{ id, author, text, created_at }`. Display them above the textarea:

```tsx
{(submission?.internal_notes ?? []).length > 0 && (
  <div className="notes-history">
    {(submission.internal_notes as InternalNote[]).map(note => (
      <div key={note.id} className="note-entry">
        <div className="note-header">
          <span className="note-author">{note.author}</span>
          <span className="note-time">{new Date(note.created_at).toLocaleString()}</span>
        </div>
        <p className="note-text">{note.text}</p>
      </div>
    ))}
  </div>
)}
<textarea
  className="text-input"
  placeholder="Add a new note…"
  value={noteText}
  onChange={e => setNoteText(e.target.value)}
/>
<div className="admin-notes-footer">
  <button
    type="button"
    className="admin-notes-save"
    onClick={handleSaveNote}
    disabled={noteSaving || !noteText.trim()}
  >
    {noteSaving ? "Saving…" : noteSaved ? "✓ Saved" : "Add Note"}
  </button>
  {noteError && <span className="note-error">{noteError}</span>}
</div>
```

**Do NOT define a local `NoteEntry` type.** Use the exported `InternalNote` type from `lib/types.ts`:
```typescript
import type { InternalNote } from "../../lib/types";
// Then cast: submission.internal_notes as InternalNote[]
```

The `InternalNote` interface in `lib/types.ts` is already:
```typescript
interface InternalNote { id: string; author: string; text: string; created_at: string; }
```
This exactly matches what the backend stores. Using the shared type prevents drift.

---

## Phase 20 — Admin: Pipeline Detail — `pipelineIndex` Fix

**File:** `app/admin/page.tsx`

Currently `pipelineIndex` reads from `selectedRecord?.status`. After integration:
```typescript
const pipelineIndex = PIPELINE_STEPS.indexOf(
  (submission?.status ?? "New") as typeof PIPELINE_STEPS[number]
);
```

---

## Phase 21 — Remove `lib/aiSummary.ts` from Admin

**File:** `app/admin/page.tsx` imports

After Phase 16 is complete, remove the import:
```typescript
// Delete this line:
import { getRoomSignal, getSignalLabel, getOverview, getFlags, getAssessment } from "../../lib/aiSummary";
```

The `lib/aiSummary.ts` file itself stays (it's still used in `app/intake/page.tsx` for the Review step preview). Only the admin page stops importing it.

---

## Phase 22 — Remove All Remaining Dummy Data

**File:** `app/intake/page.tsx`
- Delete `const mockProperties = [...]` (lines 112–137) — covered in Phase 3
- Delete any remaining references to `selectedProperty.sqft/beds/baths/yearBuilt/lotSize` from the mock shape — replace with state variables
- **Review step (Step 5)**: Search for `selectedProperty?.address` (approx. line 1159) and replace with `session.selectedAddress ?? addressQuery`
- **Review step (Step 5)**: Search for `selectedProperty?.sqft` (approx. line 1163) and replace with `sqft ?? "—"`
- After Phase 2 is implemented, `selectedProperty` will not exist anywhere in scope — TypeScript will catch any remaining references at compile time (Phase 26 `tsc --noEmit` will surface them)

**File:** `app/admin/page.tsx`
- Delete `const MOCK_SUBMISSIONS: Submission[] = [...]` (lines 26–131)
- Delete the local `Submission` interface (use `AdminSubmissionDetail` from `lib/types.ts`)
- Delete the `cities` useMemo that parsed address strings (covered in Phase 12.4)
- Delete the `filteredRecords` useMemo (server-side filtering replaces it)
- Delete the `useEffect` that merged from `localStorage["ch_submissions"]`

**File:** `app/admin/page.tsx` — login gate
- Delete `const [isLoggedIn, setIsLoggedIn] = useState(false)` (covered in Phase 10)
- Delete the entire `if (!isLoggedIn) { return <login card> }` block

---

## Phase 22.A — IntakeChatbot: No Changes Needed

**File:** `components/IntakeChatbot.tsx` (or wherever the floating chatbot lives)

**What it does:** The chatbot collects pre-qualification answers from the user and saves them to `localStorage["ch_prequal_answers"]` as a `Record<string, string>`. It is a completely separate, self-contained component with its own localStorage key — intentionally decoupled from the main `IntakeSession` shape.

**What to change:** Nothing. The chatbot pattern is correct as-is:
1. Chatbot writes to `localStorage["ch_prequal_answers"]`
2. The submit handler (Phase 7.2) reads `localStorage.getItem("ch_prequal_answers")` and parses it as `prequalAnswers` before sending to `/api/intake/submit`
3. After successful submit, `localStorage.removeItem("ch_prequal_answers")` is called to clear it

**Verify the submit handler reads it:**
```typescript
// In Phase 7.2 submit handler, include:
prequalAnswers: JSON.parse(localStorage.getItem("ch_prequal_answers") ?? "{}"),
```

This is intentional — chatbot answers are not part of the `IntakeSession` (they don't need to participate in step-by-step session restore). They are only needed at submit time.

---

## Phase 23 — `lib/types.ts` Completeness Check

Before wiring the admin page, verify `lib/types.ts` exports every field that the admin page needs to access. Specifically check that `AdminSubmissionDetail` includes:

```typescript
interface AdminSubmissionDetail {
  id:              string;
  human_id:        string;
  first_name:      string | null;
  last_name:       string | null;
  email:           string | null;
  phone:           string | null;
  address:         string;
  address_city:    string | null;
  address_state:   string | null;
  status:          SubmissionStatus;
  is_new:          boolean;
  sqft:            string | null;
  beds:            number | null;
  baths:           number | null;
  year_built:      string | null;
  lot_size:        string | null;
  condition:       string | null;
  rooms:           string[];
  prequal_answers: Record<string, string>;
  internal_notes:  Array<{ id: string; author: string; text: string; created_at: string }>;
  ai_summary:      AISummary | null;
  ai_generated_at: string | null;
  submitted_at:    string;
  updated_at:      string;
  files:           SubmissionFileWithUrl[];  // attached by GET /api/admin/submissions/[id]
}
```

If any field is missing from `lib/types.ts`, add it there (the DB columns already exist).

---

## Phase 24 — CSS: New Classes Needed

Add these CSS classes to `app/globals.css`. Do not change any existing classes.

```css
/* Phase 5.2 — Property prefill notice */
.prefill-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(16, 185, 129, 0.08);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 8px;
  padding: 10px 14px;
  font-size: 13px;
  color: #10b981;
  margin-bottom: 16px;
}

/* Phase 6.2 — Upload retry button */
.upload-retry-btn {
  position: absolute;
  bottom: 6px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0,0,0,0.7);
  color: white;
  border: none;
  border-radius: 4px;
  padding: 3px 10px;
  font-size: 11px;
  cursor: pointer;
}

/* Phase 14.7 — Admin detail loading */
.detail-loading {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 40px;
  color: var(--muted);
  font-size: 14px;
}

/* Phase 15 — Gallery room groups */
.gallery-room-group { margin-bottom: 20px; }
.gallery-room-label { font-size: 12px; font-weight: 600; color: var(--muted); margin-bottom: 8px; }
.gallery-room-files { display: flex; flex-wrap: wrap; gap: 8px; }
.gallery-video-item {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.15);
  border-radius: 8px;
  width: 120px;
  height: 90px;
  text-decoration: none;
  font-size: 13px;
  color: var(--text);
}

/* Phase 17 — AI regenerate button */
.admin-regen-btn {
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
  color: var(--text);
}
.admin-regen-btn:hover { background: var(--surface-hover); }
.ai-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}
.ai-timestamp { font-size: 11px; color: var(--muted); }

/* Phase 19 — Notes history */
.notes-history { margin-bottom: 12px; display: flex; flex-direction: column; gap: 10px; }
.note-entry { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 10px 14px; }
.note-header { display: flex; justify-content: space-between; margin-bottom: 6px; }
.note-author { font-size: 12px; font-weight: 600; color: var(--text); }
.note-time   { font-size: 11px; color: var(--muted); }
.note-text   { font-size: 13px; color: var(--text); margin: 0; line-height: 1.5; }
.note-error  { font-size: 12px; color: #ef4444; margin-left: 8px; }

/* Phase 12.5 — Sidebar pagination */
.sidebar-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px 16px;
  border-top: 1px solid var(--border);
  font-size: 13px;
}
.sidebar-page-btn {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  color: var(--text);
}
.sidebar-page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
```

---

## Phase 25 — End-to-End Smoke Test Checklist

After all phases are implemented, run through this checklist manually before marking the integration complete.

### Intake Flow
- [ ] Type 3+ characters in address search → dropdown shows real Google Places suggestions (not mock data)
- [ ] Select a suggestion → `selectedAddress` and `placeId` stored in session
- [ ] Click "Yes, this is correct" → calls `/api/address/details`, calls `/api/address/property`, calls `/api/intake/draft`
- [ ] Property fields pre-fill from RentCast data (check network tab → `/api/address/property` returns sqft/beds/baths)
- [ ] Street View image appears in property card (not blank box)
- [ ] `submissionId` appears in `localStorage["ch_intake_session"]` after address confirm
- [ ] Upload a photo → real `PUT` to Supabase Storage (check network tab for `supabase.co/storage` request)
- [ ] Upload status badge shows: Compressing → Uploading → Confirming → Analyzing → Matched
- [ ] AI mismatch: if backend detects a mismatch, `⚠ Wrong room?` appears with move/keep buttons
- [ ] Retry: upload an oversized video (>150MB) → error badge + Retry button appears
- [ ] Continue to Submit disabled while upload is in progress
- [ ] Submit button calls `/api/intake/submit` (check network tab)
- [ ] Success modal shows real `humanId` (e.g. "CH-0042")
- [ ] Confirmation email arrives at the email entered in Contact step
- [ ] `localStorage["ch_intake_session"]` is cleared after submit
- [ ] Returning to `/intake` after submit shows a fresh session (no resume banner)
- [ ] Closing the tab mid-flow and returning → resume banner appears, session restored, `submissionId` still in session

### Admin Flow
- [ ] Visiting `/admin` without login → redirected to `/admin/login` (middleware working)
- [ ] Login with wrong password → error message shown
- [ ] Login with correct credentials → redirect to `/admin`
- [ ] Admin dashboard loads → real submissions visible (not mock data)
- [ ] Submitted intake from above → submission appears in admin list with `is_new` badge
- [ ] Click a submission → detail panel loads with real address, name, beds/baths, condition
- [ ] Gallery section shows real photos (not gradient boxes), clicking opens signed URL in new tab
- [ ] AI Summary section shows real Groq output (or "No summary yet" button)
- [ ] Click "Regenerate" → loading spinner → new summary appears
- [ ] Click pipeline step "Reviewing" → status updates in DB (refresh confirms it)
- [ ] Type a note and click "Add Note" → note appears in history above textarea
- [ ] City filter (text input) → typing "Austin" filters to Austin submissions
- [ ] Date filter "Today" → only shows today's submissions
- [ ] Search by name → filters correctly
- [ ] Sign out → calls `/api/admin/auth/logout`, redirects to `/admin/login`

---

## Phase 26 — TypeScript Check + Security Final Verification

After all integration phases are done:

```bash
npx tsc --noEmit
```
Must return 0 errors.

```bash
grep -r "SERVICE_ROLE_KEY" app/
```
Must return 0 results.

```bash
grep -r "MOCK_SUBMISSIONS\|mockProperties\|localStorage\[.ch_submissions.\]" app/
```
Must return 0 results — confirms all dummy data removed.

```bash
grep -r "setIsLoggedIn\|Enter Demo Dashboard\|Demo only" app/
```
Must return 0 results — confirms demo auth removed.

---

## Implementation Order Summary

| Phase | Description | File(s) | Prerequisite |
|---|---|---|---|
| 1 | API client utility (`apiFetch`) | `lib/client/apiClient.ts` | None |
| 2 | Session shape + helpers | `lib/client/intakeSession.ts` | None |
| 2.A | HeroResumeCard session shape update | `components/HeroResumeCard.tsx` | Phase 2 |
| 3 | Address autocomplete (real API) | `app/intake/page.tsx` | Phase 1 |
| 4 | Address confirm: details + property + draft | `app/intake/page.tsx` | Phase 1, 2, 3 |
| 5 | Property step: sqft field + prefill banner | `app/intake/page.tsx` | Phase 4 |
| 6 | Upload step: real file pipeline | `app/intake/page.tsx` | Phase 1, 4 |
| 7 | Submit step: real API call | `app/intake/page.tsx` | Phase 1, 4, 6 |
| 8 | AI summary label update on Review | `app/intake/page.tsx` | Phase 7 |
| 9 | Session resume with submissionId | `app/intake/page.tsx` | Phase 2 |
| 10 | Admin auth gate removal | `app/admin/page.tsx` | None |
| 11 | Admin submissions hook | `hooks/useAdminSubmissions.ts` | Phase 1 |
| 12 | Admin list render + filters + pagination | `app/admin/page.tsx` | Phase 10, 11 |
| 13 | Admin detail hook | `hooks/useAdminSubmission.ts` | Phase 1 |
| 14 | Admin detail panel render | `app/admin/page.tsx` | Phase 13 |
| 15 | Admin gallery (real photos) | `app/admin/page.tsx` | Phase 13 |
| 16 | Admin AI summary (real Groq) | `app/admin/page.tsx` | Phase 13 |
| 17 | Admin regenerate summary | `app/admin/page.tsx` | Phase 16 |
| 18 | Admin status update (PATCH) | `app/admin/page.tsx` | Phase 13 |
| 19 | Admin notes (PATCH + history) | `app/admin/page.tsx` | Phase 13 |
| 20 | Admin pipeline index fix | `app/admin/page.tsx` | Phase 14 |
| 21 | Remove aiSummary import from admin | `app/admin/page.tsx` | Phase 16 |
| 22 | Remove all dummy data | Both pages | All above |
| 22.A | IntakeChatbot: verify submit reads ch_prequal_answers | `app/intake/page.tsx` | Phase 7 |
| 23 | `lib/types.ts` completeness check | `lib/types.ts` | Phase 13 |
| 24 | New CSS classes | `app/globals.css` | All above |
| 25 | E2E smoke test | Manual | All above |
| 26 | TypeScript + security final check | Terminal | All above |

---

## Key Decisions and Rules for Implementors

1. **Never import server-only libs in client files.** `lib/supabase/admin.ts`, `lib/ai/roomDetect.ts`, `lib/ai/summarize.ts`, `lib/email/resend.ts` are server-only. Never import them in `"use client"` files. All data access goes through API routes.

2. **Always use `apiFetch` for API calls**, never raw `fetch` + manual JSON parse. It handles the `{ success, data }` envelope unwrapping.

3. **`submissionId` is the backbone of the intake flow.** It is created in Phase 4 (`handleConfirm`) and must persist in `localStorage` session for upload and submit calls. If it's null when the user reaches Step 3, block them and ask them to go back to Step 1.

4. **Signed URLs expire in 24h.** Admin gallery photos will show broken images after 24h without a page refresh. This is acceptable for V1 — the detail hook can be called to refresh URLs.

5. **RentCast may return null** (address not found, API quota). Property prefill is best-effort. All property fields remain editable. The draft is still created even if RentCast fails.

6. **Google Places session token** must be consistent across all autocomplete requests for one address search, then sent with the details call. After address confirm, a new token is generated (next mount or by clearing from session).

7. **Do not change CSS class names.** The existing layout and styles are complete. Only add new classes in Phase 24.

8. **The intake page is a single large client component.** Do not split it into sub-components — the existing architecture uses a single `IntakePage` component with step-conditional renders. Maintain this pattern to avoid prop-drilling complexity.

9. **The admin page may be split into sub-components** (e.g. `AdminDetailPanel`, `AdminSidebar`) if the file becomes too large after integration. This is optional and should only be done after all phases are complete and working.

10. **Error states must be visible to the user.** Every API call in the intake flow must surface errors as visible UI (the existing `intake-error` class). Every API call in the admin must surface errors as visible text. Never fail silently.
