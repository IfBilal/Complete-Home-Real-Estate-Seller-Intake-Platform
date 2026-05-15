"use client";

import { useMemo, useState, useEffect } from "react";
import { getRoomSignal, getSignalLabel, getOverview, getFlags, getAssessment } from "../../lib/aiSummary";

interface Submission {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  address: string;
  date: string;
  submittedAt: string;
  status: "New" | "Reviewing" | "Offer Made" | "Closed";
  isNew: boolean;
  sqft: string;
  beds: number | null;
  baths: number | null;
  yearBuilt: string;
  lotSize: string;
  condition: string;
  rooms: string[];
  prequalAnswers: Record<string, string>;
}

const MOCK_SUBMISSIONS: Submission[] = [
  {
    id: "MS-1021",
    name: "Jordan Lee",
    email: "jordan.lee@email.com",
    phone: "(512) 555-0182",
    address: "123 Willow Lane, Austin TX",
    date: "May 10, 2026",
    submittedAt: "2026-05-10T14:23:00Z",
    status: "New",
    isNew: false,
    sqft: "2,140",
    beds: 4,
    baths: 3,
    yearBuilt: "2008",
    lotSize: "0.23 ac",
    condition: "Good",
    rooms: ["Kitchen", "Living Room", "Bedroom 1", "Bedroom 2", "Bathroom 1", "Exterior"],
    prequalAnswers: {
      ownership: "Yes, I own it",
      timeline: "Within 30 days",
      motivation: "Relocation",
      mortgage: "Yes",
      liens: "No",
      occupancy: "I live there",
      offer_type: "Open to all options"
    }
  },
  {
    id: "MS-1022",
    name: "Samira Khan",
    email: "samira.khan@email.com",
    phone: "(214) 555-0341",
    address: "88 Brookview Dr, Dallas TX",
    date: "May 09, 2026",
    submittedAt: "2026-05-09T10:15:00Z",
    status: "Reviewing",
    isNew: false,
    sqft: "1,860",
    beds: 3,
    baths: 2,
    yearBuilt: "2012",
    lotSize: "0.19 ac",
    condition: "Fair",
    rooms: ["Kitchen", "Living Room", "Bedroom 1", "Bathroom 1", "Garage"],
    prequalAnswers: {
      ownership: "Yes, I own it",
      timeline: "30–90 days",
      motivation: "Financial need",
      mortgage: "Yes",
      liens: "No",
      occupancy: "I live there",
      offer_type: "Cash offer only"
    }
  },
  {
    id: "MS-1023",
    name: "Miguel Torres",
    address: "410 Lake Crest Rd, Houston TX",
    date: "May 08, 2026",
    submittedAt: "2026-05-08T09:05:00Z",
    status: "Offer Made",
    isNew: false,
    sqft: "2,980",
    beds: 5,
    baths: 4,
    yearBuilt: "2016",
    lotSize: "0.31 ac",
    condition: "Good",
    rooms: ["Kitchen", "Living Room", "Bedroom 1", "Bedroom 2", "Bedroom 3", "Bathroom 1", "Bathroom 2", "Exterior", "Backyard"],
    prequalAnswers: {
      ownership: "Yes, I own it",
      timeline: "As soon as possible",
      motivation: "Downsizing",
      mortgage: "No — owned free and clear",
      liens: "No",
      occupancy: "I live there",
      offer_type: "Open to all options"
    }
  },
  {
    id: "MS-1024",
    name: "Alyssa Park",
    address: "19 Oak Terrace, Austin TX",
    date: "May 07, 2026",
    submittedAt: "2026-05-07T16:45:00Z",
    status: "Closed",
    isNew: false,
    sqft: "1,540",
    beds: 3,
    baths: 2,
    yearBuilt: "2005",
    lotSize: "0.15 ac",
    condition: "Fair",
    rooms: ["Kitchen", "Living Room", "Bedroom 1", "Bathroom 1", "Exterior"],
    prequalAnswers: {
      ownership: "I'm a co-owner",
      timeline: "Just exploring options",
      motivation: "Estate or inheritance",
      mortgage: "Not sure",
      liens: "I'm not sure",
      occupancy: "It's vacant",
      offer_type: "Prefer a traditional MLS listing"
    }
  }
];

const PREQUAL_LABELS: Record<string, string> = {
  ownership: "Property Ownership",
  timeline: "Sale Timeline",
  motivation: "Reason for Selling",
  mortgage: "Mortgage Status",
  liens: "Liens / Judgments",
  occupancy: "Occupancy",
  offer_type: "Offer Preference"
};

function isWithinDays(isoString: string, days: number): boolean {
  const date = new Date(isoString);
  const now = new Date();
  const diff = (now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
  return diff <= days;
}

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [cityFilter, setCityFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All Time");
  const [searchQuery, setSearchQuery] = useState("");
  const [records, setRecords] = useState<Submission[]>(MOCK_SUBMISSIONS);
  const [selectedId, setSelectedId] = useState(MOCK_SUBMISSIONS[0].id);
  const [noteText, setNoteText] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("ch_submissions");
      if (raw) {
        const stored: Submission[] = JSON.parse(raw);
        setRecords(prev => {
          const existingIds = new Set(prev.map(r => r.id));
          const newOnes = stored.filter(r => !existingIds.has(r.id));
          if (newOnes.length === 0) return prev;
          const merged = [...newOnes, ...prev];
          setSelectedId(newOnes[0].id);
          return merged;
        });
      }
    } catch {
      // ignore
    }
  }, []);

  const selectedRecord = records.find((item) => item.id === selectedId);

  const cities = useMemo(() => {
    const citySet = new Set<string>();
    records.forEach(r => {
      const parts = r.address.split(",");
      if (parts.length >= 2) {
        const city = parts[1].trim().split(" ")[0];
        if (city) citySet.add(city);
      }
    });
    return Array.from(citySet).sort();
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      const matchesStatus = statusFilter === "All" || item.status === statusFilter;
      const matchesQuery =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.address.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCity = cityFilter === "All" || item.address.includes(cityFilter);
      const matchesDate =
        dateFilter === "Today" ? isWithinDays(item.submittedAt, 1) :
        dateFilter === "This Week" ? isWithinDays(item.submittedAt, 7) :
        dateFilter === "This Month" ? isWithinDays(item.submittedAt, 30) :
        true;
      return matchesStatus && matchesQuery && matchesCity && matchesDate;
    });
  }, [records, statusFilter, searchQuery, cityFilter, dateFilter]);

  const handleSelectRecord = (id: string) => {
    setSelectedId(id);
    setNoteText("");
    setRecords(prev => prev.map(r => r.id === id ? { ...r, isNew: false } : r));
    try {
      const raw = localStorage.getItem("ch_submissions");
      if (raw) {
        const stored: Submission[] = JSON.parse(raw);
        const updated = stored.map(r => r.id === id ? { ...r, isNew: false } : r);
        localStorage.setItem("ch_submissions", JSON.stringify(updated));
      }
    } catch {
      // ignore
    }
  };

  const newCount = records.filter(r => r.isNew).length;

  const AVATAR_PALETTE = [
    { bg: "rgba(13,148,136,0.22)", fg: "#5eead4" },
    { bg: "rgba(99,102,241,0.22)", fg: "#a5b4fc" },
    { bg: "rgba(245,158,11,0.22)", fg: "#fcd34d" },
    { bg: "rgba(236,72,153,0.20)", fg: "#f9a8d4" },
    { bg: "rgba(16,185,129,0.20)", fg: "#86efac" },
    { bg: "rgba(249,115,22,0.20)", fg: "#fdba74" },
  ];

  if (!isLoggedIn) {
    return (
      <main className="container section">
        <div className="login-shell">
          <div className="login-card">
            <div className="login-header">
              <h1>Admin Access</h1>
              <p>Sign in to view submissions and manage pipeline status.</p>
            </div>
            <div className="login-actions">
              <a className="button-primary" href="/admin/login">
                Go to Login
              </a>
              <button
                className="button-secondary"
                type="button"
                onClick={() => setIsLoggedIn(true)}
              >
                Enter Demo Dashboard
              </button>
            </div>
            <p className="login-note">
              Demo only — no real authentication in this preview.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const PIPELINE_STEPS = ["New", "Reviewing", "Offer Made", "Closed"] as const;
  const pipelineIndex = PIPELINE_STEPS.indexOf(selectedRecord?.status as typeof PIPELINE_STEPS[number]);

  return (
    <div className="admin-layout">
      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-brand-inner">
            <span className="sidebar-brand-dot" />
            <span className="sidebar-brand-name">Complete Home</span>
            <span className="sidebar-brand-sep">·</span>
            <span className="sidebar-brand-sub">Admin</span>
          </div>
          <button className="sidebar-signout" type="button" onClick={() => setIsLoggedIn(false)}>
            Sign out
          </button>
        </div>

        <div className="sidebar-stats">
          <div className="sidebar-stat">
            <strong>{records.length}</strong>
            <span>Submissions</span>
          </div>
          <div className="sidebar-stat">
            <strong>48h</strong>
            <span>Avg response</span>
          </div>
          {newCount > 0 && (
            <div className="sidebar-stat sidebar-new-badge">
              <span className="admin-new-dot-pulse" />
              <strong style={{ color: "var(--brand-teal-500)" }}>{newCount} new</strong>
            </div>
          )}
        </div>

        <div className="sidebar-filters">
          <input
            className="sidebar-search"
            type="text"
            placeholder="Search name or address…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          <div className="sidebar-selects">
            <select className="sidebar-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option>All</option>
              <option>New</option>
              <option>Reviewing</option>
              <option>Offer Made</option>
              <option>Closed</option>
            </select>
            <select className="sidebar-select" value={cityFilter} onChange={e => setCityFilter(e.target.value)}>
              <option value="All">All Cities</option>
              {cities.map(city => <option key={city}>{city}</option>)}
            </select>
            <select className="sidebar-select" value={dateFilter} onChange={e => setDateFilter(e.target.value)}>
              <option>All Time</option>
              <option>Today</option>
              <option>This Week</option>
              <option>This Month</option>
            </select>
          </div>
        </div>

        <div className="sidebar-records-header">
          Submissions
          <span>{filteredRecords.length}</span>
        </div>

        <div className="sidebar-records">
          {filteredRecords.length === 0 && (
            <p className="sidebar-empty">No submissions match your filters.</p>
          )}
          {filteredRecords.map(sub => {
            const isActive = sub.id === selectedId;
            const palette = AVATAR_PALETTE[sub.name.charCodeAt(0) % AVATAR_PALETTE.length];
            const statusKey = sub.status.toLowerCase().replace(" ", "-");
            return (
              <button
                key={sub.id}
                type="button"
                className={`sidebar-record${isActive ? " active" : ""}`}
                onClick={() => handleSelectRecord(sub.id)}
              >
                <div
                  className="record-avatar"
                  style={isActive ? undefined : { background: palette.bg, color: palette.fg }}
                >
                  {sub.name.charAt(0)}
                </div>
                <div className="record-body">
                  <div className="record-name">
                    {sub.isNew && <span className="admin-new-dot" />}
                    {sub.name}
                  </div>
                  <div className="record-addr">{sub.address}</div>
                  <div className="record-foot">
                    <span>{sub.id}</span>
                    <span className={`record-status-text status-text-${statusKey}`}>{sub.status}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ── Main detail panel ── */}
      <main className="admin-main">
        {/* Workspace header — always visible */}
        <div className="admin-workspace-header">
          <div className="admin-workspace-left">
            <p className="admin-workspace-eyebrow">Internal Review Workspace</p>
            <h1 className="admin-workspace-title">Seller Submissions</h1>
          </div>
          <div className="admin-workspace-right">
            <div className="admin-workspace-stat">
              <strong>{records.length}</strong>
              <span>Total</span>
            </div>
            <div className="admin-workspace-stat">
              <strong>{records.filter(r => r.status === "New").length}</strong>
              <span>New</span>
            </div>
            <div className="admin-workspace-stat">
              <strong>{records.filter(r => r.status === "Reviewing").length}</strong>
              <span>Reviewing</span>
            </div>
            <div className="admin-workspace-stat">
              <strong>{records.filter(r => r.status === "Offer Made").length}</strong>
              <span>Offer Made</span>
            </div>
            {newCount > 0 && (
              <div className="admin-workspace-new">
                <span className="admin-new-dot-pulse" />
                <span>{newCount} unread</span>
              </div>
            )}
          </div>
        </div>

        {selectedRecord && (
          <div className="detail-wrap">
            {/* Submission header */}
            <div className="detail-hero">
              <div>
                <h2 className="detail-hero-address">{selectedRecord.address}</h2>
                <p className="detail-hero-sub">{selectedRecord.name} · {selectedRecord.id}</p>
                {(selectedRecord.email || selectedRecord.phone) && (
                  <div className="detail-contact-row">
                    {selectedRecord.email && <span>✉ {selectedRecord.email}</span>}
                    {selectedRecord.phone && <span>📞 {selectedRecord.phone}</span>}
                  </div>
                )}
              </div>
              <span className={`status-pill status-pill-lg ${selectedRecord.status.toLowerCase().replace(" ", "-")}`}>
                {selectedRecord.status}
              </span>
            </div>

            {/* Pipeline */}
            <div className="detail-section">
              <div className="pipeline">
                {PIPELINE_STEPS.map((s, i) => {
                  const isDone = i < pipelineIndex;
                  const isActive = i === pipelineIndex;
                  return (
                    <div key={s} className="pipeline-item">
                      <button
                        type="button"
                        className={`pipeline-step${isActive ? " active" : isDone ? " done" : ""}`}
                        onClick={() => setRecords(prev => prev.map(r => r.id === selectedRecord.id ? { ...r, status: s } : r))}
                      >
                        <div className="pipeline-node">{isDone ? "✓" : i + 1}</div>
                        <span className="pipeline-label">{s}</span>
                      </button>
                      {i < PIPELINE_STEPS.length - 1 && (
                        <div className={`pipeline-connector${isDone ? " done" : ""}`} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Property details */}
            <div className="detail-section">
              <h4 className="detail-section-title">Property Details</h4>
              <div className="prop-table">
                {[
                  { label: "Sq. Footage", value: selectedRecord.sqft || "—" },
                  { label: "Bedrooms", value: selectedRecord.beds ?? "—" },
                  { label: "Bathrooms", value: selectedRecord.baths ?? "—" },
                  { label: "Year Built", value: selectedRecord.yearBuilt || "—" },
                  { label: "Lot Size", value: selectedRecord.lotSize || "—" },
                  { label: "Condition", value: selectedRecord.condition || "—", badge: true },
                ].map(({ label, value, badge }) => (
                  <div key={label} className="prop-row">
                    <span className="prop-label">{label}</span>
                    {badge ? (
                      <strong className={`condition-badge condition-${String(value).toLowerCase()}`}>{value}</strong>
                    ) : (
                      <strong className="prop-value">{value}</strong>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Gallery */}
            <div className="detail-section">
              <h4 className="detail-section-title">Gallery</h4>
              <div className="detail-gallery-grid">
                {(selectedRecord.rooms ?? []).map((room, i) => (
                  <div key={room} className="gallery-item" style={{ background: `linear-gradient(135deg, hsl(${200 + i * 18}, 25%, 22%), hsl(${200 + i * 18}, 20%, 32%))` }}>
                    <span className="gallery-item-label">{room}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pre-qualification */}
            {selectedRecord.prequalAnswers && Object.keys(selectedRecord.prequalAnswers).length > 0 && (
              <div className="detail-section">
                <h4 className="detail-section-title">Pre-Qualification</h4>
                <div className="prequal-table">
                  {Object.entries(selectedRecord.prequalAnswers).map(([key, value]) => (
                    <div key={key} className="prequal-row">
                      <span className="prequal-label">{PREQUAL_LABELS[key] ?? key}</span>
                      <span className="prequal-value">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* AI Summary */}
            <div className="detail-section">
              <div className="ai-header">
                <h4 className="detail-section-title">AI Summary</h4>
                <span className="ai-badge">Generated</span>
              </div>
              <div className="admin-ai-card">
                <div className="ai-summary-section">
                  <h5>Property Overview</h5>
                  <p>{getOverview(selectedRecord.condition ?? "Good", selectedRecord.beds ?? null, selectedRecord.baths ?? null)}</p>
                </div>
                <div className="ai-summary-section">
                  <h5>Condition by Room</h5>
                  <div className="ai-room-grid">
                    {(selectedRecord.rooms ?? []).map(room => {
                      const signal = getRoomSignal(room, selectedRecord.condition ?? "Good");
                      return (
                        <div key={room} className="ai-room-row">
                          <span className="ai-room-name">{room}</span>
                          <span className={`ai-room-signal ai-signal-${signal}`}>{getSignalLabel(signal)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="ai-summary-section">
                  <h5>Visible Flags</h5>
                  <div className="admin-ai-flags">
                    {getFlags(selectedRecord.condition ?? "Good").map(flag => (
                      <span key={flag}>{flag}</span>
                    ))}
                  </div>
                </div>
                <div className="ai-summary-section">
                  <h5>Overall Assessment</h5>
                  <p className="ai-overall">{getAssessment(selectedRecord.condition ?? "Good")}</p>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="detail-section">
              <h4 className="detail-section-title">Internal Notes</h4>
              <textarea
                className="text-input"
                placeholder="Add your internal notes…"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
              />
              <div className="admin-notes-footer">
                <button
                  type="button"
                  className="admin-notes-save"
                  onClick={() => { setNoteSaved(true); setTimeout(() => setNoteSaved(false), 2000); }}
                >
                  {noteSaved ? "✓ Saved" : "Save Notes"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
