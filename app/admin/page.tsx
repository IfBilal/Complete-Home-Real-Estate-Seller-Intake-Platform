"use client";

import { useMemo, useState } from "react";

const submissions = [
  {
    id: "MS-1021",
    name: "Jordan Lee",
    address: "123 Willow Lane, Austin TX",
    date: "May 10, 2026",
    status: "New"
  },
  {
    id: "MS-1022",
    name: "Samira Khan",
    address: "88 Brookview Dr, Dallas TX",
    date: "May 09, 2026",
    status: "Reviewing"
  },
  {
    id: "MS-1023",
    name: "Miguel Torres",
    address: "410 Lake Crest Rd, Houston TX",
    date: "May 08, 2026",
    status: "Offer Made"
  },
  {
    id: "MS-1024",
    name: "Alyssa Park",
    address: "19 Oak Terrace, Austin TX",
    date: "May 07, 2026",
    status: "Closed"
  }
];

export default function AdminPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [records, setRecords] = useState(submissions);
  const [selectedId, setSelectedId] = useState(submissions[0].id);
  const [noteText, setNoteText] = useState("");
  const [noteSaved, setNoteSaved] = useState(false);

  const selectedRecord = records.find((item) => item.id === selectedId);
  const filteredRecords = useMemo(() => {
    return records.filter((item) => {
      const matchesStatus = statusFilter === "All" || item.status === statusFilter;
      const matchesQuery =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.address.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesQuery;
    });
  }, [records, statusFilter, searchQuery]);

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
                className="text-input"
                type="text"
                placeholder="Search by name or address"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              <select
                className="text-input"
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
              >
                <option>All</option>
                <option>New</option>
                <option>Reviewing</option>
                <option>Offer Made</option>
                <option>Closed</option>
              </select>
            </div>
          </div>
          <div className="admin-records">
            {filteredRecords.map((submission) => (
              <button
                type="button"
                className={`admin-record${submission.id === selectedId ? " active" : ""}`}
                key={submission.id}
                onClick={() => setSelectedId(submission.id)}
              >
                <div>
                  <strong>{submission.name}</strong>
                  <span className="admin-id">{submission.id}</span>
                </div>
                <span className="admin-address">{submission.address}</span>
                <span className="admin-date">{submission.date}</span>
                <span className={`status-pill ${submission.status.toLowerCase().replace(" ", "-")}`}>
                  {submission.status}
                </span>
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
              </div>
              <span className={`status-pill ${selectedRecord?.status.toLowerCase().replace(" ", "-")}`}>
                {selectedRecord?.status}
              </span>
            </div>
            <div className="detail-section">
              <h4>Status</h4>
              <div className="status-actions">
                <select
                  className="text-input"
                  value={selectedRecord?.status}
                  onChange={(event) => {
                    const nextStatus = event.target.value;
                    setRecords((prev) =>
                      prev.map((item) =>
                        item.id === selectedRecord?.id
                          ? { ...item, status: nextStatus }
                          : item
                      )
                    );
                  }}
                >
                  <option>New</option>
                  <option>Reviewing</option>
                  <option>Offer Made</option>
                  <option>Closed</option>
                </select>
                <button className="button-secondary" type="button">
                  Save Status
                </button>
              </div>
            </div>
            <div className="detail-section">
              <h4>Gallery</h4>
              <div className="detail-gallery">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="gallery-tile">
                    Room {index + 1}
                  </div>
                ))}
              </div>
            </div>
            <div className="detail-section">
              <div className="ai-header">
                <h4>AI Summary (Preview)</h4>
                <span className="ai-badge">Generated</span>
              </div>
              <p>
                Bright living areas, updated kitchen surfaces, and minimal
                exterior wear noted. Minor paint touch-ups recommended.
              </p>
              <div className="ai-flags">
                <span>Minor paint wear</span>
                <span>Tile grout refresh</span>
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
              <button
                type="button"
                className="button-primary"
                onClick={() => {
                  setNoteSaved(true);
                  setTimeout(() => setNoteSaved(false), 2000);
                }}
              >
                Save Notes
              </button>
              {noteSaved && <span className="note-saved">Saved!</span>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
