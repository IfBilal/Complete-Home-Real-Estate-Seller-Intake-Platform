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

  return (
    <>
    <div className="admin-nav">
      <div className="admin-nav-brand">
        <span className="admin-nav-dot" />
        Complete Home <span className="admin-nav-sep">·</span> Admin
      </div>
      <button className="admin-nav-out" type="button" onClick={() => setIsLoggedIn(false)}>
        Sign out
      </button>
    </div>
    <main className="container section">
      <div className="admin-header premium reveal-once" style={{ "--delay": "60ms" } as React.CSSProperties}>
        <div>
          <p className="admin-eyebrow">Internal Review Workspace</p>
          <h1>Admin Dashboard</h1>
          <p>Review submissions, assess quality, and guide next steps.</p>
        </div>
        <div className="admin-header-meta">
          <div>
            <span>Active pipeline</span>
            <strong>{records.length} submissions</strong>
          </div>
          <div>
            <span>Avg response</span>
            <strong>48 hrs</strong>
          </div>
          {newCount > 0 && (
            <div className="admin-new-count">
              <span className="admin-new-dot-pulse" />
              <strong>{newCount} new</strong>
            </div>
          )}
        </div>
      </div>

      <div className="admin-grid">
        <section className="admin-list premium reveal-once" style={{ "--delay": "140ms" } as React.CSSProperties}>
          <div className="admin-list-header">
            <div>
              <h2>Submissions</h2>
              <p>Prioritize the most recent seller intakes.</p>
            </div>
            <div className="admin-filters">
              <input
                className="admin-search-input"
                type="text"
                placeholder="Search by name or address"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <select
                className="admin-select"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option>All</option>
                <option>New</option>
                <option>Reviewing</option>
                <option>Offer Made</option>
                <option>Closed</option>
              </select>
              <select
                className="admin-select"
                value={cityFilter}
                onChange={(event) => setCityFilter(event.target.value)}
              >
                <option value="All">All Cities</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              <select
                className="admin-select"
                value={dateFilter}
                onChange={(event) => setDateFilter(event.target.value)}
              >
                <option>All Time</option>
                <option>Today</option>
                <option>This Week</option>
                <option>This Month</option>
              </select>
            </div>
          </div>
          <div className="admin-records">
            {filteredRecords.length === 0 && (
              <p className="admin-empty">No submissions match your filters.</p>
            )}
            {filteredRecords.map((submission) => (
              <button
                type="button"
                className={`admin-record${submission.id === selectedId ? " active" : ""}`}
                key={submission.id}
                onClick={() => handleSelectRecord(submission.id)}
              >
                <div className="admin-record-top">
                  <div className="admin-record-name-row">
                    {submission.isNew && <span className="admin-new-dot" />}
                    <strong>{submission.name}</strong>
                  </div>
                  <span className={`status-pill ${submission.status.toLowerCase().replace(" ", "-")}`}>
                    {submission.status}
                  </span>
                </div>
                <span className="admin-address">{submission.address}</span>
                <div className="admin-record-bottom">
                  <span className="admin-id">{submission.id}</span>
                  <span className="admin-date">{submission.date}</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="admin-detail premium reveal-once" style={{ "--delay": "220ms" } as React.CSSProperties}>
          <div className="detail-card">
            <div className="detail-header">
              <div>
                <h3>{selectedRecord?.address}</h3>
                <p>{selectedRecord?.name} · {selectedRecord?.id}</p>
                {(selectedRecord?.email || selectedRecord?.phone) && (
                  <p className="detail-contact">
                    {selectedRecord.email && <span>✉ {selectedRecord.email}</span>}
                    {selectedRecord.phone && <span>📞 {selectedRecord.phone}</span>}
                  </p>
                )}
              </div>
              <span className={`status-pill ${selectedRecord?.status.toLowerCase().replace(" ", "-")}`}>
                {selectedRecord?.status}
              </span>
            </div>

            {selectedRecord && (
              <div className="detail-section">
                <h4>Property Details</h4>
                <div className="detail-property-grid">
                  <div className="detail-property-item">
                    <span>Sq. Footage</span>
                    <strong>{selectedRecord.sqft || "—"}</strong>
                  </div>
                  <div className="detail-property-item">
                    <span>Bedrooms</span>
                    <strong>{selectedRecord.beds ?? "—"}</strong>
                  </div>
                  <div className="detail-property-item">
                    <span>Bathrooms</span>
                    <strong>{selectedRecord.baths ?? "—"}</strong>
                  </div>
                  <div className="detail-property-item">
                    <span>Year Built</span>
                    <strong>{selectedRecord.yearBuilt || "—"}</strong>
                  </div>
                  <div className="detail-property-item">
                    <span>Lot Size</span>
                    <strong>{selectedRecord.lotSize || "—"}</strong>
                  </div>
                  <div className="detail-property-item">
                    <span>Condition</span>
                    <strong className={`condition-badge condition-${(selectedRecord.condition || "").toLowerCase()}`}>
                      {selectedRecord.condition || "—"}
                    </strong>
                  </div>
                </div>
              </div>
            )}

            <div className="detail-section">
              <h4>Status</h4>
              <div className="status-pills">
                {["New", "Reviewing", "Offer Made", "Closed"].map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`status-pill-btn${selectedRecord?.status === s ? " status-pill-active" : ""}`}
                    onClick={() =>
                      setRecords((prev) =>
                        prev.map((item) =>
                          item.id === selectedRecord?.id ? { ...item, status: s as Submission["status"] } : item
                        )
                      )
                    }
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="detail-section">
              <h4>Gallery</h4>
              <div className="detail-gallery">
                {(selectedRecord?.rooms ?? ["Kitchen", "Living Room", "Bedroom 1", "Bathroom 1", "Exterior"]).map((room) => (
                  <div
                    key={room}
                    className="gallery-tile"
                    style={{ background: "linear-gradient(155deg, #0b1c2c, #1a3a5c, #2563eb)", backgroundSize: "cover" }}
                  >
                    <span className="gallery-tile-room">{room}</span>
                  </div>
                ))}
              </div>
            </div>

            {selectedRecord?.prequalAnswers && Object.keys(selectedRecord.prequalAnswers).length > 0 && (
              <div className="detail-section">
                <h4>Pre-Qualification</h4>
                <div className="detail-prequal">
                  {Object.entries(selectedRecord.prequalAnswers).map(([key, value]) => (
                    <div key={key} className="prequal-row">
                      <span className="prequal-label">{PREQUAL_LABELS[key] ?? key}</span>
                      <span className="prequal-value">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="detail-section">
              <div className="ai-header">
                <h4>AI Summary</h4>
                <span className="ai-badge">Generated</span>
              </div>
              <div className="admin-ai-card">
                <div className="ai-summary-section">
                  <h5>Property Overview</h5>
                  <p>{getOverview(selectedRecord?.condition ?? "Good", selectedRecord?.beds ?? null, selectedRecord?.baths ?? null)}</p>
                </div>
                <div className="ai-summary-section">
                  <h5>Condition by Room</h5>
                  <div className="ai-room-grid">
                    {(selectedRecord?.rooms ?? ["Kitchen", "Living Room", "Bedroom 1", "Bathroom 1", "Exterior"]).map(room => {
                      const signal = getRoomSignal(room, selectedRecord?.condition ?? "Good");
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
                    {getFlags(selectedRecord?.condition ?? "Good").map(flag => (
                      <span key={flag}>{flag}</span>
                    ))}
                  </div>
                </div>
                <div className="ai-summary-section">
                  <h5>Overall Assessment</h5>
                  <p className="ai-overall">{getAssessment(selectedRecord?.condition ?? "Good")}</p>
                </div>
              </div>
            </div>

            <div className="detail-section">
              <h4>Internal Notes</h4>
              <textarea
                className="text-input"
                placeholder="Add your internal notes"
                value={noteText}
                onChange={(event) => setNoteText(event.target.value)}
              />
              <div className="admin-notes-footer">
                <button
                  type="button"
                  className="admin-notes-save"
                  onClick={() => {
                    setNoteSaved(true);
                    setTimeout(() => setNoteSaved(false), 2000);
                  }}
                >
                  {noteSaved ? "✓ Saved" : "Save Notes"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
    </>
  );
}
