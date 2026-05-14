# Frontend Implementation Plan
## Real Estate Seller Intake Platform — Remaining Work

> **Scope:** Frontend only. All data is localStorage + dummy/mock. No backend, no database, no real API calls.
> **Stack:** Next.js 14, React, existing custom CSS in globals.css

---

## Current Status Summary

| Area | Done | Remaining |
|---|---|---|
| Homepage / Marketing | 95% | Minor mobile polish |
| Intake Form (Steps 1–5) | 75% | Drag-and-drop, resume flow, compression feedback |
| Admin Dashboard | 75% | Filters (location), wired detail view, new badge |
| Pre-Qual Chatbot | 0% | Full build |
| Mobile Responsiveness | 60% | Full audit needed |
| localStorage Resume | 10% | Full build |
| Address Typeahead UI | 40% | Real dropdown autocomplete feel |
| AI Summary Structured UI | 20% | Proper format per SOW |
| Upload Recategorize | 0% | Move-to-room on mismatch |

---

## PHASE 1 — localStorage Resume Flow
**Priority: High — blocks the hero card from being functional**

### 1.1 Save Intake Progress to localStorage

**File:** `app/intake/page.tsx`

On every step advance, write the current state to localStorage:

```js
const SESSION_KEY = "ch_intake_session";

// Shape of saved session
{
  currentStep: 2,
  addressQuery: "123 Willow Lane, Austin TX",
  selectedProperty: { address, sqft, beds, baths, yearBuilt, lotSize },
  isConfirmed: true,
  bedrooms: 4,
  bathrooms: 3,
  yearBuilt: "2008",
  lotSize: "0.23 ac",
  condition: "Good",
  selectedRooms: ["Kitchen", "Living Room", "Exterior"],
  savedAt: "2026-05-14T10:00:00Z"
}
```

- Write to localStorage inside `handleContinue()` after step advances
- Also write when any key field changes (debounced 1s)
- On successful submit: `localStorage.removeItem(SESSION_KEY)`

### 1.2 Restore Session on Mount

**File:** `app/intake/page.tsx`

Add a `useEffect` on mount:

```js
useEffect(() => {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return;
  const session = JSON.parse(raw);
  setCurrentStep(session.currentStep);
  setAddressQuery(session.addressQuery);
  setSelectedProperty(session.selectedProperty);
  setIsConfirmed(session.isConfirmed);
  setBedrooms(session.bedrooms);
  setBathrooms(session.bathrooms);
  setYearBuilt(session.yearBuilt);
  setLotSize(session.lotSize);
  setCondition(session.condition);
  setSelectedRooms(session.selectedRooms);
}, []);
```

Show a dismissible banner at the top of the form:
```
"Welcome back! Your progress has been saved. [Continue] or [Start fresh]"
```
"Start fresh" clears localStorage and resets all state to defaults.

### 1.3 Wire Up the Hero Resume Card

**File:** `components/HeroResumeCard.tsx` (new client component)

Extract the hero card from `app/page.tsx` into its own `"use client"` component so it can read localStorage:

```js
const [session, setSession] = useState(null);

useEffect(() => {
  const raw = localStorage.getItem("ch_intake_session");
  if (raw) setSession(JSON.parse(raw));
}, []);
```

- **If session exists:** show real address, real progress %, and "Resume Your Review →" link to `/intake`
- **If no session:** show a generic prompt card — "Start your guided review — takes 10 minutes"
- Progress % = `Math.round((session.currentStep / 4) * 100)`
- Hide the card entirely if step is 0 and nothing confirmed yet

---

## PHASE 2 — Address Autocomplete UI
**Priority: High — SOW requires typeahead feel**

### 2.1 Typeahead Dropdown

**File:** `app/intake/page.tsx` — Step 0 (Address)

The current implementation shows a static list below the input at all times. Replace with a proper typeahead dropdown:

- List is **hidden** when input is empty
- List **appears** as a floating dropdown below the input as soon as user types ≥ 2 characters
- Filter mock properties in real-time against typed text
- Each suggestion shows address on top line, city/state smaller below
- Keyboard navigation: arrow keys to highlight, Enter to select, Escape to close
- Clicking outside the dropdown closes it

```jsx
// Show dropdown only when typing
{addressQuery.length >= 2 && filteredSuggestions.length > 0 && !isConfirmed && (
  <div className="address-dropdown">
    {filteredSuggestions.map((p, i) => (
      <button
        key={p.address}
        className={`address-dropdown-item${highlightedIndex === i ? " highlighted" : ""}`}
        onClick={() => handleSelect(p)}
      >
        <span className="dropdown-address">{p.address}</span>
        <span className="dropdown-meta">{p.sqft} sqft · {p.beds} bed · {p.baths} bath</span>
      </button>
    ))}
    {/* Always show manual entry option */}
    <button className="address-dropdown-manual" onClick={handleManualEntry}>
      Use "{addressQuery}" — enter manually
    </button>
  </div>
)}
```

**CSS needed:**
```css
.address-dropdown {
  position: absolute;
  top: 100%;
  left: 0; right: 0;
  background: white;
  border: 1px solid var(--neutral-line-200);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgba(11,28,44,0.12);
  z-index: 50;
  overflow: hidden;
  margin-top: 4px;
}
.address-dropdown-item { padding: 12px 16px; width: 100%; text-align: left; }
.address-dropdown-item.highlighted { background: #eff6ff; }
.dropdown-address { display: block; font-weight: 600; color: var(--neutral-ink-900); }
.dropdown-meta { display: block; font-size: 12px; color: var(--neutral-ink-400); margin-top: 2px; }
```

### 2.2 Property Card — Exterior Image

**File:** `app/intake/page.tsx` — address confirmation card

SOW says "an exterior image for confirmation before the seller continues."

The `.property-image` div currently uses `livingRoom.jpg` (interior). For the address confirmation card, this should represent an **exterior** view. Since we have only one photo:

- Style it with a blue-to-navy gradient overlay that makes it look like a building exterior silhouette
- Add a label "Exterior view · AI-fetched" to set the expectation it's a system-fetched image
- Or use a different CSS background that suggests a house exterior (gradient + SVG house outline)

```jsx
<div className="property-image">
  <span className="property-image-label">Exterior · Auto-fetched</span>
</div>
```

```css
.property-image {
  height: 160px;
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5f8a 50%, #1a3a5c 100%);
  border-radius: 10px 10px 0 0;
  position: relative;
  display: flex;
  align-items: flex-end;
  padding: 10px;
}

.property-image-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255,255,255,0.6);
  background: rgba(0,0,0,0.3);
  padding: 3px 8px;
  border-radius: 4px;
}
```

---

## PHASE 3 — Drag and Drop Upload UI
**Priority: High — core product feature**

### 3.1 Drag-and-Drop Upload Slots

**File:** `app/intake/page.tsx` — Step 3 (Uploads)

Replace the current "Add photo" click-only buttons with proper drag-and-drop zones.

**Each upload slot supports:**
- Drag file onto zone → border highlights blue → drop → simulate upload
- Click to open native file picker
- Image thumbnail preview via `URL.createObjectURL`
- Video icon + filename for video files
- Animated progress bar

```jsx
function UploadSlot({ onUpload, filled, item, onRemove }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef(null);

  return (
    <div
      className={`upload-slot${dragging ? " upload-slot-drag" : ""}${filled ? " filled" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => { e.preventDefault(); setDragging(false); onUpload(e.dataTransfer.files[0]); }}
      onClick={() => !filled && inputRef.current?.click()}
    >
      {filled ? (
        <div className="upload-preview" style={item.preview ? { backgroundImage: `url(${item.preview})` } : {}}>
          {!item.preview && <span className="upload-video-icon">▶</span>}
          <button className="upload-remove-btn" onClick={(e) => { e.stopPropagation(); onRemove(item.id); }}>×</button>
          {item.progress < 100 && (
            <div className="upload-progress-overlay">
              <div className="upload-progress-fill" style={{ width: `${item.progress}%` }} />
            </div>
          )}
          {item.status === "mismatch" && <div className="upload-mismatch-badge">⚠ Wrong room?</div>}
        </div>
      ) : (
        <div className="upload-empty">
          <span className="upload-icon">+</span>
          <span>Drop or click</span>
        </div>
      )}
      <input ref={inputRef} type="file" hidden accept="image/*,video/*" onChange={(e) => onUpload(e.target.files[0])} />
    </div>
  );
}
```

### 3.2 Image Compression Feedback

SOW requires "client-side image compression." Frontend shows the state even though real compression is backend:

```js
const addUpload = (room, file) => {
  const isLarge = file.size > 2 * 1024 * 1024; // > 2MB
  const id = `${room}-${Date.now()}`;
  const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;

  setUploads(prev => ({ ...prev, [room]: [...(prev[room] ?? []), {
    id, name: file.name, type: file.type.startsWith("image/") ? "photo" : "video",
    preview, progress: 0, status: "compressing"
  }]}));

  // Step 1: show "Compressing" if large file
  if (isLarge) {
    setTimeout(() => {
      setUploads(prev => ({ ...prev, [room]: prev[room].map(u =>
        u.id === id ? { ...u, status: "uploading", progress: 0 } : u
      )}));
    }, 800);
  }

  // Step 2: simulate chunked upload progress
  const startDelay = isLarge ? 800 : 0;
  [20, 45, 70, 90, 100].forEach((pct, i) => {
    setTimeout(() => {
      setUploads(prev => ({ ...prev, [room]: prev[room].map(u =>
        u.id === id ? { ...u, progress: pct, status: pct === 100 ? (Math.random() < 0.2 ? "mismatch" : "ok") : "uploading" } : u
      )}));
    }, startDelay + (i + 1) * 250);
  });
};
```

Upload status values: `"compressing" | "uploading" | "ok" | "mismatch"`

Show status text on the slot: "Compressing…" → "Uploading…" → "✓ Matched" / "⚠ Wrong room?"

### 3.3 Upload Recategorize on Mismatch

SOW says: "prompts the seller to confirm or **recategorize**."

When `status === "mismatch"`, show options:

```jsx
{item.status === "mismatch" && (
  <div className="mismatch-actions">
    <p>This photo may not match <strong>{room}</strong>. Move it to:</p>
    <div className="mismatch-room-options">
      {selectedRooms.filter(r => r !== room).map(r => (
        <button key={r} onClick={() => moveUpload(room, item.id, r)}>{r}</button>
      ))}
    </div>
    <button onClick={() => resolveMismatch(room, item.id)}>Keep here — it's correct</button>
  </div>
)}
```

Add `moveUpload(fromRoom, id, toRoom)` function:
```js
const moveUpload = (fromRoom, id, toRoom) => {
  const item = uploads[fromRoom].find(u => u.id === id);
  setUploads(prev => ({
    ...prev,
    [fromRoom]: prev[fromRoom].filter(u => u.id !== id),
    [toRoom]: [...(prev[toRoom] ?? []), { ...item, status: "ok" }]
  }));
  // Switch active panel to destination room
  setActivePanel(toRoom);
};
```

### 3.4 Mobile Native File Picker

On mobile, the file input opens the camera directly:
```jsx
<input
  type="file"
  accept="image/*,video/*"
  capture="environment"
  onChange={(e) => onUpload(e.target.files[0])}
/>
```

---

## PHASE 4 — Pre-Qualification Chatbot
**Priority: High — 0% built, required by SOW**

### 4.1 Chatbot Component Structure

**New file:** `components/IntakeChatbot.tsx` (`"use client"`)

Floating chat widget on the `/intake` page. Rendered in `app/intake/page.tsx`.

**Visual layout:**
```
[Fixed bottom-right]

  ┌──────────────────────────────┐
  │ 🏠  Complete Home Assistant  ×│
  ├──────────────────────────────┤
  │                              │
  │  Bot: Hi! Ready to start?    │
  │                              │
  │              User: Yes!      │
  │                              │
  │  Bot: Do you own this        │
  │  property?                   │
  │  ···  (typing indicator)     │
  │                              │
  │  [Yes, I own it] [Co-owner]  │
  │  [No]                        │
  └──────────────────────────────┘

  [💬 Chat]  ← trigger button with badge
```

**Features:**
- Slide-up animation on open (`transform: translateY`)
- Auto-scroll to bottom on new message (`useRef` + `scrollTop`)
- Typing indicator: three animated dots, shown for 800ms before each bot reply
- Unread badge on trigger button when chat has new messages and is minimized
- Persists open/closed state in sessionStorage (reopens if user navigates)

### 4.2 Question Flow — All 7 Questions

```js
const QUESTIONS = [
  {
    id: "ownership",
    bot: "Do you currently own this property?",
    options: ["Yes, I own it", "I'm a co-owner", "No"]
  },
  {
    id: "timeline",
    bot: "What's your ideal timeline to sell?",
    options: ["As soon as possible", "Within 30 days", "30–90 days", "Just exploring options"]
  },
  {
    id: "motivation",
    bot: "What's the main reason for selling?",
    options: ["Relocation", "Financial need", "Downsizing", "Estate or inheritance", "Other"]
  },
  {
    id: "mortgage",
    bot: "Is there an active mortgage on the property?",
    options: ["Yes", "No — owned free and clear", "Not sure"]
  },
  {
    id: "liens",
    bot: "Are there any liens or judgments on the property?",
    options: ["No", "Yes", "I'm not sure"]
  },
  {
    id: "occupancy",
    bot: "Is the property currently occupied?",
    options: ["I live there", "Tenants are living there", "It's vacant"]
  },
  {
    id: "offer_type",
    bot: "Are you open to different offer structures?",
    options: ["Cash offer only", "Open to all options", "Prefer a traditional MLS listing"]
  }
];
```

Completion message:
```
"Thanks! Your answers have been saved and will be included with your submission. 
Our team reviews these before reaching out. Good luck with your intake!"
```

### 4.3 State Management

```js
const [open, setOpen] = useState(false);
const [messages, setMessages] = useState([
  { from: "bot", text: "Hi! I have 7 quick questions that help us prepare a better review for your property. Want to start?" }
]);
const [qIndex, setQIndex] = useState(-1);  // -1 = intro, 0-6 = questions
const [answers, setAnswers] = useState({});
const [typing, setTyping] = useState(false);
const [done, setDone] = useState(false);
const [unread, setUnread] = useState(1);   // starts at 1 (initial message)
```

Flow:
1. Intro message shown immediately
2. User clicks "Start" → question 0 loads with 800ms typing delay
3. Each answer → typed message added → 800ms delay → next question
4. After Q7 → completion message → `done = true` → save to localStorage

```js
localStorage.setItem("ch_prequal_answers", JSON.stringify(answers));
```

### 4.4 CSS — Chatbot Panel

```css
.chatbot-trigger {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 200;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--brand-blue-600);
  color: white;
  border: none;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(37,99,235,0.35);
}

.chatbot-badge {
  position: absolute;
  top: -4px; right: -4px;
  width: 18px; height: 18px;
  border-radius: 50%;
  background: #dc2626;
  color: white;
  font-size: 10px;
  font-weight: 700;
  display: grid;
  place-items: center;
}

.chatbot-panel {
  position: fixed;
  bottom: 88px;
  right: 24px;
  width: 340px;
  max-height: 520px;
  background: white;
  border: 1px solid var(--neutral-line-200);
  border-radius: 20px;
  box-shadow: 0 16px 48px rgba(11,28,44,0.18);
  z-index: 200;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: chatSlideUp 250ms ease forwards;
}

@keyframes chatSlideUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

.chatbot-messages { flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.bot-bubble { background: var(--neutral-line-100); border-radius: 12px 12px 12px 4px; padding: 10px 14px; max-width: 85%; font-size: 14px; }
.user-bubble { background: var(--brand-blue-600); color: white; border-radius: 12px 12px 4px 12px; padding: 10px 14px; max-width: 85%; align-self: flex-end; font-size: 14px; }
.typing-indicator { display: flex; gap: 4px; padding: 10px 14px; }
.typing-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--neutral-ink-400); animation: typingBounce 1s infinite; }
.typing-dot:nth-child(2) { animation-delay: 0.15s; }
.typing-dot:nth-child(3) { animation-delay: 0.3s; }
@keyframes typingBounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }

.chatbot-choices { padding: 12px 16px; display: flex; flex-wrap: wrap; gap: 8px; border-top: 1px solid var(--neutral-line-200); }
.chat-choice-btn { padding: 7px 14px; border-radius: 999px; border: 1.5px solid var(--neutral-line-200); background: white; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 150ms ease; }
.chat-choice-btn:hover { border-color: var(--brand-blue-600); color: var(--brand-blue-600); }
```

---

## PHASE 5 — Admin Dashboard Improvements
**Priority: Medium**

### 5.1 LocalStorage-Backed Submissions

When intake form is submitted, save full record to localStorage:

```js
const submission = {
  id: `MS-${Date.now()}`,
  name: "New Submission",
  address: selectedProperty?.address || addressQuery,
  date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
  status: "New",
  isNew: true,           // drives the notification badge
  beds: bedrooms,
  baths: bathrooms,
  sqft: selectedProperty?.sqft || "—",
  yearBuilt,
  lotSize,
  condition,
  rooms: selectedRooms,
  uploadPreviews: Object.fromEntries(
    Object.entries(uploads).map(([room, files]) => [
      room, files.map(f => ({ name: f.name, preview: f.preview, type: f.type }))
    ])
  ),
  prequalAnswers: JSON.parse(localStorage.getItem("ch_prequal_answers") || "{}"),
  submittedAt: new Date().toISOString()
};

const existing = JSON.parse(localStorage.getItem("ch_submissions") || "[]");
localStorage.setItem("ch_submissions", JSON.stringify([submission, ...existing]));
localStorage.removeItem("ch_intake_session");
localStorage.removeItem("ch_prequal_answers");
```

**Admin page on mount — load real submissions:**

```js
useEffect(() => {
  const saved = JSON.parse(localStorage.getItem("ch_submissions") || "[]");
  if (saved.length > 0) setRecords([...saved, ...submissions]);
}, []);
```

### 5.2 New Submission Badge

In the admin submission list, show a pulsing blue dot for any record with `isNew: true`:

```jsx
<div className="admin-item-row">
  {sub.isNew && <span className="admin-new-dot" />}
  <strong className="admin-item-name">{sub.name}</strong>
  <StatusPill status={sub.status} />
</div>
```

```css
.admin-new-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  background: var(--brand-blue-600);
  box-shadow: 0 0 0 0 rgba(37,99,235,0.4);
  animation: newPulse 1.5s infinite;
  flex-shrink: 0;
}
@keyframes newPulse {
  0%   { box-shadow: 0 0 0 0 rgba(37,99,235,0.4); }
  70%  { box-shadow: 0 0 0 8px rgba(37,99,235,0); }
  100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
}
```

Clear `isNew` when admin clicks the submission to open it.

### 5.3 Admin Detail — Wired to Real Submission Data

When `selectedRecord` comes from localStorage (has `beds`, `rooms`, `uploadPreviews` etc.), show real data:

**Property details section:**
```jsx
<div className="detail-property-grid">
  <div><span>Beds</span><strong>{selectedRecord.beds ?? "—"}</strong></div>
  <div><span>Baths</span><strong>{selectedRecord.baths ?? "—"}</strong></div>
  <div><span>Sqft</span><strong>{selectedRecord.sqft ?? "—"}</strong></div>
  <div><span>Year Built</span><strong>{selectedRecord.yearBuilt || "—"}</strong></div>
  <div><span>Lot</span><strong>{selectedRecord.lotSize || "—"}</strong></div>
  <div><span>Condition</span><strong>{selectedRecord.condition || "—"}</strong></div>
</div>
```

**Gallery — real upload previews:**
```jsx
<div className="detail-gallery">
  {selectedRecord.rooms?.map(room =>
    (selectedRecord.uploadPreviews?.[room] ?? []).map((file, i) => (
      <div
        key={`${room}-${i}`}
        className="gallery-tile"
        style={file.preview ? { backgroundImage: `url(${file.preview})`, backgroundSize: "cover" } : {}}
      >
        {!file.preview && <span>{room}</span>}
      </div>
    ))
  ) ?? Array.from({ length: 5 }).map((_, i) => (
    <div key={i} className="gallery-tile">Room {i + 1}</div>
  ))}
</div>
```

**Pre-qual answers section:**
```jsx
{selectedRecord.prequalAnswers && Object.keys(selectedRecord.prequalAnswers).length > 0 && (
  <div className="detail-section">
    <h4>Pre-Qualification</h4>
    <div className="prequal-grid">
      {Object.entries(selectedRecord.prequalAnswers).map(([key, val]) => (
        <div key={key}>
          <span>{key.replace("_", " ")}</span>
          <strong>{val}</strong>
        </div>
      ))}
    </div>
  </div>
)}
```

### 5.4 Location Filter

Add a city/state filter alongside status and date:

```jsx
const cities = ["All", ...new Set(records.map(r => r.address.split(",")[1]?.trim() || "Unknown"))];

<select className="admin-select" value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
  {cities.map(c => <option key={c}>{c}</option>)}
</select>
```

Filter logic: `item.address.includes(cityFilter) || cityFilter === "All"`

### 5.5 Date Filter

```jsx
<select className="admin-select" value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
  <option value="all">All time</option>
  <option value="today">Today</option>
  <option value="week">This week</option>
  <option value="month">This month</option>
</select>
```

Filter logic using `submission.submittedAt` ISO string comparison.

---

## PHASE 6 — Structured AI Summary UI
**Priority: Medium — SOW defines exact output format**

SOW specifies the AI summary must display: **property overview → condition signals per room → visible flags → brief overall description.**

Both the admin panel and the intake Review step need this layout.

### 6.1 Admin AI Summary Section

**File:** `app/admin/page.tsx`

Replace the current single paragraph with structured sections:

```jsx
<div className="admin-ai-card">
  <div className="ai-summary-section">
    <h5>Property Overview</h5>
    <p>Two-story single-family home with bright living areas and a recently updated kitchen. Exterior appears well maintained with minimal visible wear.</p>
  </div>

  <div className="ai-summary-section">
    <h5>Condition by Room</h5>
    <div className="ai-room-grid">
      {["Kitchen", "Living Room", "Master Bed", "Bathroom", "Exterior"].map(room => (
        <div key={room} className="ai-room-row">
          <span className="ai-room-name">{room}</span>
          <span className="ai-room-signal ai-signal-good">Good condition</span>
        </div>
      ))}
    </div>
  </div>

  <div className="ai-summary-section">
    <h5>Visible Flags</h5>
    <div className="admin-ai-flags">
      <span>⚠ Minor paint wear — living room</span>
      <span>⚠ Tile grout needs refresh — bathroom</span>
    </div>
  </div>

  <div className="ai-summary-section">
    <h5>Overall Assessment</h5>
    <p className="ai-overall">Strong candidate for a private market offer. Minimal prep work required. Recommend expedited review.</p>
  </div>
</div>
```

**CSS additions:**
```css
.ai-summary-section { padding: 12px 0; border-bottom: 1px solid var(--neutral-line-200); }
.ai-summary-section:last-child { border-bottom: none; }
.ai-summary-section h5 { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.08em; color: var(--neutral-ink-400); margin: 0 0 8px; }
.ai-room-grid { display: flex; flex-direction: column; gap: 6px; }
.ai-room-row { display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
.ai-room-name { color: var(--neutral-ink-700); font-weight: 600; }
.ai-signal-good { color: #15803d; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
.ai-signal-fair { color: #b45309; background: #fffbeb; border: 1px solid #fde68a; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; }
.ai-overall { font-style: italic; color: var(--neutral-ink-700); line-height: 1.6; margin: 0; }
```

### 6.2 Intake Review Step — AI Preview

**File:** `app/intake/page.tsx` — Step 4 (Review)

Apply the same structured format to the intake-side AI preview card so sellers see what the team will receive.

---

## PHASE 7 — Mobile Responsiveness Audit
**Priority: Medium**

### Pages to audit at 390px (iPhone 14) and 414px (iPhone XR):

#### 7.1 Homepage
- [ ] Metrics grid: 2×2 on mobile (currently 4-col)
- [ ] Hero card: hide on mobile (content covers it)
- [ ] Testimonials: single column stacked
- [ ] Timeline: full width, no horizontal overflow
- [ ] CTA band: stacked, full-width button

#### 7.2 Intake Form
- [ ] Step indicator in intake hero: compress to dots-only on mobile
- [ ] Segmented controls (bed/bath): ensure all options fit (may need 2 rows)
- [ ] Room grid: 2-col on mobile
- [ ] Upload grid: 2-col on mobile
- [ ] Review step: stack left/right columns vertically
- [ ] Chatbot panel: full-screen on mobile (not just 340px floating)

#### 7.3 Admin
- [ ] Admin nav: hide stat pills, keep brand + sign out
- [ ] Admin grid: single column (list top, detail below)
- [ ] Gallery: 3-col on mobile
- [ ] Status pills: wrap gracefully

#### 7.4 Admin Login
- [ ] Hide left branding panel on mobile, show only the form

---

## PHASE 8 — Minor UX Polish
**Priority: Low**

### 8.1 Step Transition Animation

```css
.intake-step-body {
  animation: stepIn 220ms ease forwards;
}
@keyframes stepIn {
  from { opacity: 0; transform: translateX(12px); }
  to   { opacity: 1; transform: translateX(0); }
}
```

### 8.2 Address Confirm Loading State

When "Yes, confirm" clicked — 600ms "Confirming…" before confirmed badge:

```js
const handleConfirm = () => {
  setConfirming(true);
  setTimeout(() => { setConfirming(false); setIsConfirmed(true); }, 600);
};
```

Button shows: "Confirming…" with a spinner during the 600ms.

### 8.3 Styled Error States

Replace plain text errors with visual callout boxes:

```jsx
{errors.address && (
  <div className="intake-error">⚠ {errors.address}</div>
)}
```

```css
.intake-error {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  padding: 10px 14px;
  color: #dc2626;
  font-size: 13px;
  font-weight: 600;
}
```

### 8.4 Review Step — Wired to Real State

The intake Review step (Step 5) should show:
- Real address + property data from confirmed state
- Real upload previews from Phase 3 (objectURLs)
- Real pre-qual answers from chatbot (Phase 4)
- Computed AI summary based on room count and condition selected

---

## Files That Will Be Modified

| File | Phases |
|---|---|
| `app/intake/page.tsx` | 1, 2, 3, 8 |
| `app/page.tsx` | 1 (extract hero card) |
| `app/admin/page.tsx` | 5, 6 |
| `app/globals.css` | 2, 3, 4, 5, 6, 7, 8 |
| `components/HeroResumeCard.tsx` | 1 (new) |
| `components/IntakeChatbot.tsx` | 4 (new) |

---

## Implementation Order

| Phase | Feature | Effort | Impact |
|---|---|---|---|
| 3 | Drag-and-drop + compression + recategorize | High | High |
| 2 | Address typeahead + exterior image | Low | High |
| 1 | localStorage resume + hero card | Medium | High |
| 4 | Pre-qual chatbot | High | High |
| 5 | Admin wired data + filters + badge | Medium | Medium |
| 6 | Structured AI summary UI | Low | Medium |
| 7 | Mobile audit | Medium | High |
| 8 | UX polish | Low | Low |

**Recommended order:** 2 → 3 → 1 → 4 → 5 → 6 → 7 → 8

---

## Completion Estimate

| Phase | Frontend % Added |
|---|---|
| Phase 1 (localStorage resume + hero) | +8% |
| Phase 2 (address typeahead + exterior image) | +4% |
| Phase 3 (drag-drop + compression + recategorize) | +8% |
| Phase 4 (pre-qual chatbot) | +12% |
| Phase 5 (admin wired + filters + badge) | +5% |
| Phase 6 (structured AI summary) | +3% |
| Phase 7 (mobile audit) | +6% |
| Phase 8 (UX polish) | +2% |
| **Total after all phases** | **~100% frontend** |
