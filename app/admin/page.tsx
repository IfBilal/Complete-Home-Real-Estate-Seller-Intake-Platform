"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "../../lib/client/apiClient";
import type {
  AdminSubmissionListItem,
  AdminSubmissionDetail,
  AISummary,
  InternalNote,
  SubmissionStatus,
} from "../../lib/types";

const PREQUAL_LABELS: Record<string, string> = {
  ownership:  "Property Ownership",
  timeline:   "Sale Timeline",
  motivation: "Reason for Selling",
  mortgage:   "Mortgage Status",
  liens:      "Liens / Judgments",
  occupancy:  "Occupancy",
  offer_type: "Offer Preference",
};

const AVATAR_PALETTE = [
  { bg: "rgba(232,84,26,0.22)",  fg: "#FDBA74" },
  { bg: "rgba(99,102,241,0.22)", fg: "#a5b4fc" },
  { bg: "rgba(245,158,11,0.22)", fg: "#fcd34d" },
  { bg: "rgba(236,72,153,0.20)", fg: "#f9a8d4" },
  { bg: "rgba(16,185,129,0.20)", fg: "#86efac" },
  { bg: "rgba(249,115,22,0.20)", fg: "#fdba74" },
];

const PIPELINE_STEPS = ["New", "Reviewing", "Offer Made", "Closed"] as const;

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminPage() {
  const router = useRouter();

  // ── List
  const [isLoading,  setIsLoading]  = useState(true);
  const [loadError,  setLoadError]  = useState<string | null>(null);
  const [records,    setRecords]    = useState<AdminSubmissionListItem[]>([]);

  // ── Filters
  const [statusFilter, setStatusFilter] = useState("All");
  const [cityFilter,   setCityFilter]   = useState("All");
  const [dateFilter,   setDateFilter]   = useState("All Time");
  const [searchQuery,  setSearchQuery]  = useState("");

  // ── Detail
  const [selectedId,    setSelectedId]    = useState<string | null>(null);
  const [detail,        setDetail]        = useState<AdminSubmissionDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Notes
  const [noteText,  setNoteText]  = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [noteSaved,  setNoteSaved]  = useState(false);

  // ── Status
  const [statusSaving, setStatusSaving] = useState(false);

  // ── AI summary
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError,   setAiError]   = useState<string | null>(null);

  // ── Admin management view
  const [activeView,      setActiveView]      = useState<"submissions" | "admins">("submissions");
  const [adminList,       setAdminList]       = useState<{ id: string; email: string; role: string; created_at: string }[]>([]);
  const [currentAdminEmail, setCurrentAdminEmail] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<{ id: string; email: string; created_at: string }[]>([]);
  const [adminViewLoading, setAdminViewLoading] = useState(false);
  const [removingId,      setRemovingId]      = useState<string | null>(null);
  const [actioningReqId,  setActioningReqId]  = useState<string | null>(null);

  // ─────────────────────────────────────────────────────────────────────────────
  // Fetch list (re-runs on filter changes)
  // ─────────────────────────────────────────────────────────────────────────────
  const fetchList = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "All")    params.set("status", statusFilter);
      if (cityFilter   !== "All")    params.set("city",   cityFilter);
      if (dateFilter   !== "All Time") params.set("date", dateFilter);
      if (searchQuery)               params.set("q",      searchQuery);

      const data = await apiFetch<{ items: AdminSubmissionListItem[]; total: number }>(
        `/api/admin/submissions?${params}`
      );
      setRecords(data.items);
      const ids = new Set(data.items.map(i => i.id));
      setSelectedId(prev => (prev && ids.has(prev)) ? prev : (data.items[0]?.id ?? null));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        router.push("/admin/login?redirect=/admin");
        return;
      }
      setLoadError("Failed to load submissions.");
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, cityFilter, dateFilter, searchQuery, router]);

  // Debounce typing; immediate for filter changes
  useEffect(() => {
    const delay = searchQuery ? 400 : 0;
    const t = setTimeout(fetchList, delay);
    return () => clearTimeout(t);
  }, [fetchList, searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─────────────────────────────────────────────────────────────────────────────
  // Fetch detail when selectedId changes
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedId) return;
    setDetailLoading(true);
    setDetail(null);
    setNoteText("");
    setAiError(null);
    apiFetch<AdminSubmissionDetail>(`/api/admin/submissions/${selectedId}`)
      .then(d => {
        setDetail(d);
        setRecords(prev => prev.map(r => r.id === selectedId ? { ...r, is_new: false } : r));
      })
      .catch(e => {
        if (e instanceof ApiError && e.status === 401) router.push("/admin/login?redirect=/admin");
      })
      .finally(() => setDetailLoading(false));
  }, [selectedId, router]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Actions
  // ─────────────────────────────────────────────────────────────────────────────
  const handleStatusChange = useCallback(async (status: SubmissionStatus) => {
    if (!selectedId || statusSaving) return;
    setStatusSaving(true);
    try {
      await apiFetch(`/api/admin/submissions/${selectedId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status }),
      });
      setDetail(prev => prev ? { ...prev, status } : prev);
      setRecords(prev => prev.map(r => r.id === selectedId ? { ...r, status } : r));
    } catch { /* silent */ }
    finally { setStatusSaving(false); }
  }, [selectedId, statusSaving]);

  const handleSaveNote = useCallback(async () => {
    if (!selectedId || !noteText.trim() || noteSaving) return;
    setNoteSaving(true);
    try {
      const result = await apiFetch<{ internal_notes: InternalNote[] }>(
        `/api/admin/submissions/${selectedId}`,
        {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ noteText: noteText.trim() }),
        }
      );
      setDetail(prev => prev
        ? { ...prev, internal_notes: result.internal_notes ?? prev.internal_notes }
        : prev
      );
      setNoteText("");
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    } catch { /* silent */ }
    finally { setNoteSaving(false); }
  }, [selectedId, noteText, noteSaving]);

  const handleGenerateSummary = useCallback(async () => {
    if (!selectedId || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const result = await apiFetch<{ summary: AISummary }>(
        `/api/admin/submissions/${selectedId}/summarize`,
        { method: "POST" }
      );
      setDetail(prev => prev
        ? { ...prev, ai_summary: result.summary, ai_generated_at: new Date().toISOString() }
        : prev
      );
    } catch (e) {
      setAiError(e instanceof ApiError ? e.message : "AI summary failed.");
    } finally {
      setAiLoading(false);
    }
  }, [selectedId, aiLoading]);

  const handleSignOut = useCallback(async () => {
    try { await fetch("/api/admin/auth/logout", { method: "POST" }); } catch { /* ignore */ }
    router.push("/admin/login");
  }, [router]);

  const fetchAdminView = useCallback(async () => {
    setAdminViewLoading(true);
    try {
      const [adminsData, reqsData] = await Promise.all([
        apiFetch<{ admins: typeof adminList; currentEmail: string | null }>("/api/admin/admins"),
        apiFetch<{ requests: typeof pendingRequests }>("/api/admin/requests"),
      ]);
      setAdminList(adminsData.admins);
      setCurrentAdminEmail(adminsData.currentEmail ?? null);
      setPendingRequests(reqsData.requests);
    } catch { /* silent */ }
    finally { setAdminViewLoading(false); }
  }, []);

  useEffect(() => {
    if (activeView === "admins") fetchAdminView();
  }, [activeView, fetchAdminView]);

  const handleRequestAction = useCallback(async (id: string, action: "approve" | "reject") => {
    setActioningReqId(id);
    try {
      await apiFetch(`/api/admin/requests/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      await fetchAdminView();
    } catch { /* silent */ }
    finally { setActioningReqId(null); }
  }, [fetchAdminView]);

  const handleRemoveAdmin = useCallback(async (id: string) => {
    if (!confirm("Remove this admin? They will lose access immediately.")) return;
    setRemovingId(id);
    try {
      await apiFetch(`/api/admin/admins/${id}`, { method: "DELETE" });
      await fetchAdminView();
    } catch { /* silent */ }
    finally { setRemovingId(null); }
  }, [fetchAdminView]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Derived values
  // ─────────────────────────────────────────────────────────────────────────────
  const cities = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => { if (r.address_city) set.add(r.address_city); });
    return Array.from(set).sort();
  }, [records]);

  const newCount      = records.filter(r => r.is_new).length;
  const closedCount   = records.filter(r => r.status === "Closed").length;
  const pipelineIndex = PIPELINE_STEPS.indexOf(detail?.status as typeof PIPELINE_STEPS[number]);

  const galleryByRoom = useMemo(() => {
    if (!detail?.files) return {} as Record<string, AdminSubmissionDetail["files"]>;
    const map: Record<string, AdminSubmissionDetail["files"]> = {};
    for (const f of detail.files) {
      if ((f.file_type === "photo" || f.file_type === "video") && f.signed_url) {
        (map[f.room] ??= []).push(f);
      }
    }
    return map;
  }, [detail]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Loading / error screens
  // ─────────────────────────────────────────────────────────────────────────────
  if (isLoading && records.length === 0) {
    return (
      <main className="container section" style={{ textAlign: "center", paddingTop: "6rem" }}>
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      </main>
    );
  }

  if (loadError) {
    return (
      <main className="container section" style={{ textAlign: "center", paddingTop: "6rem" }}>
        <p style={{ color: "var(--error, #f87171)" }}>{loadError}</p>
        <button className="button-primary" style={{ marginTop: "1rem" }} onClick={fetchList}>Retry</button>
      </main>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Main dashboard
  // ─────────────────────────────────────────────────────────────────────────────
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
          <button className="sidebar-signout" type="button" onClick={handleSignOut}>
            Sign out
          </button>
        </div>

        <div className="sidebar-stats">
          <div className="sidebar-stat">
            <strong>{records.length}</strong>
            <span>Submissions</span>
          </div>
          <div className="sidebar-stat">
            <strong>{closedCount}</strong>
            <span>Closed</span>
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

        {/* ── View switcher ── */}
        <div className="sidebar-view-tabs">
          <button
            type="button"
            className={`sidebar-view-tab${activeView === "submissions" ? " active" : ""}`}
            onClick={() => setActiveView("submissions")}
          >
            Submissions
          </button>
          <button
            type="button"
            className={`sidebar-view-tab${activeView === "admins" ? " active" : ""}`}
            onClick={() => setActiveView("admins")}
          >
            Admins
            {pendingRequests.length > 0 && (
              <span className="sidebar-view-badge">{pendingRequests.length}</span>
            )}
          </button>
        </div>

        <div className="sidebar-records-header">
          Submissions
          <span>{records.length}</span>
        </div>

        <div className="sidebar-records">
          {records.length === 0 && (
            <p className="sidebar-empty">No submissions match your filters.</p>
          )}
          {records.map(sub => {
            const isActive  = sub.id === selectedId;
            const palette   = AVATAR_PALETTE[sub.name.charCodeAt(0) % AVATAR_PALETTE.length];
            const statusKey = sub.status.toLowerCase().replace(" ", "-");
            return (
              <button
                key={sub.id}
                type="button"
                className={`sidebar-record${isActive ? " active" : ""}`}
                onClick={() => setSelectedId(sub.id)}
              >
                <div
                  className="record-avatar"
                  style={isActive ? undefined : { background: palette.bg, color: palette.fg }}
                >
                  {sub.name.charAt(0)}
                </div>
                <div className="record-body">
                  <div className="record-name">
                    {sub.is_new && <span className="admin-new-dot" />}
                    {sub.name}
                  </div>
                  <div className="record-addr">{sub.address}</div>
                  <div className="record-foot">
                    <span>{sub.human_id}</span>
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
        <div className="admin-workspace-header">
          <div className="admin-workspace-left">
            <p className="admin-workspace-eyebrow">Internal Review Workspace</p>
            <h1 className="admin-workspace-title">Seller Submissions</h1>
          </div>
          <div className="admin-workspace-right">
            <div className="admin-workspace-stat"><strong>{records.length}</strong><span>Total</span></div>
            <div className="admin-workspace-stat"><strong>{records.filter(r => r.status === "New").length}</strong><span>New</span></div>
            <div className="admin-workspace-stat"><strong>{records.filter(r => r.status === "Reviewing").length}</strong><span>Reviewing</span></div>
            <div className="admin-workspace-stat"><strong>{records.filter(r => r.status === "Offer Made").length}</strong><span>Offer Made</span></div>
            {newCount > 0 && (
              <div className="admin-workspace-new">
                <span className="admin-new-dot-pulse" />
                <span>{newCount} unread</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Admin management panel ── */}
        {activeView === "admins" && (
          <div className="admin-mgmt-wrap">
            {adminViewLoading ? (
              <div style={{ padding: "3rem", textAlign: "center", color: "var(--neutral-ink-400)" }}>Loading…</div>
            ) : (
              <>
                {/* Pending requests */}
                <div className="admin-mgmt-section">
                  <h3 className="admin-mgmt-title">
                    Pending Requests
                    {pendingRequests.length > 0 && <span className="admin-mgmt-badge">{pendingRequests.length}</span>}
                  </h3>
                  {pendingRequests.length === 0 ? (
                    <p className="admin-mgmt-empty">No pending requests.</p>
                  ) : (
                    <div className="admin-mgmt-list">
                      {pendingRequests.map(req => (
                        <div key={req.id} className="admin-mgmt-row">
                          <div className="admin-mgmt-email">{req.email}</div>
                          <div className="admin-mgmt-meta">{new Date(req.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</div>
                          <div className="admin-mgmt-actions">
                            <button
                              type="button"
                              className="admin-mgmt-btn approve"
                              disabled={actioningReqId === req.id}
                              onClick={() => handleRequestAction(req.id, "approve")}
                            >
                              {actioningReqId === req.id ? "…" : "Approve"}
                            </button>
                            <button
                              type="button"
                              className="admin-mgmt-btn reject"
                              disabled={actioningReqId === req.id}
                              onClick={() => handleRequestAction(req.id, "reject")}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Current admins */}
                <div className="admin-mgmt-section">
                  <h3 className="admin-mgmt-title">Current Admins</h3>
                  <div className="admin-mgmt-list">
                    {adminList.map(admin => (
                      <div key={admin.id} className="admin-mgmt-row">
                        <div className="admin-mgmt-email">{admin.email}</div>
                        <div className="admin-mgmt-meta">{admin.role}</div>
                        <div className="admin-mgmt-actions">
                          <button
                            type="button"
                            className="admin-mgmt-btn remove"
                            disabled={removingId === admin.id || admin.email === currentAdminEmail}
                            onClick={() => handleRemoveAdmin(admin.id)}
                            title={admin.email === currentAdminEmail ? "You cannot remove yourself" : "Remove admin"}
                          >
                            {removingId === admin.id ? "…" : "Remove"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Detail loading */}
        {activeView === "submissions" && detailLoading && (
          <div style={{ padding: "3rem", textAlign: "center", color: "var(--muted)" }}>Loading…</div>
        )}

        {/* Detail panel */}
        {activeView === "submissions" && !detailLoading && detail && (
          <div className="detail-wrap">

            {/* Header */}
            <div className="detail-hero">
              <div>
                <h2 className="detail-hero-address">{detail.address}</h2>
                <p className="detail-hero-sub">
                  {`${detail.first_name ?? ""} ${detail.last_name ?? ""}`.trim() || "Unknown"} · {detail.human_id}
                </p>
                {(detail.email || detail.phone) && (
                  <div className="detail-contact-row">
                    {detail.email && <span>✉ {detail.email}</span>}
                    {detail.phone && <span>📞 {detail.phone}</span>}
                  </div>
                )}
              </div>
              <span className={`status-pill status-pill-lg ${detail.status.toLowerCase().replace(" ", "-")}`}>
                {detail.status}
              </span>
            </div>

            {/* Pipeline */}
            <div className="detail-section">
              <div className="pipeline">
                {PIPELINE_STEPS.map((s, i) => {
                  const isDone   = i < pipelineIndex;
                  const isActive = i === pipelineIndex;
                  return (
                    <div key={s} className="pipeline-item">
                      <button
                        type="button"
                        className={`pipeline-step${isActive ? " active" : isDone ? " done" : ""}`}
                        disabled={statusSaving}
                        onClick={() => handleStatusChange(s)}
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
                  { label: "Sq. Footage", value: detail.sqft ?? "—" },
                  { label: "Bedrooms",    value: detail.beds ?? "—" },
                  { label: "Bathrooms",   value: detail.baths ?? "—" },
                  { label: "Year Built",  value: detail.year_built ?? "—" },
                  { label: "Lot Size",    value: detail.lot_size ?? "—" },
                  { label: "Condition",   value: detail.condition ?? "—", badge: true },
                  { label: "Submitted",   value: formatDate(detail.submitted_at) },
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
              {Object.keys(galleryByRoom).length > 0 ? (
                Object.entries(galleryByRoom).map(([room, files]) => (
                  <div key={room} style={{ marginBottom: "1.25rem" }}>
                    <p style={{ fontSize: "0.7rem", color: "var(--muted)", marginBottom: "0.5rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                      {room}
                    </p>
                    <div className="detail-gallery-grid">
                      {files.map(f => (
                        f.file_type === "video" ? (
                          <a key={f.id} href={f.signed_url} target="_blank" rel="noopener noreferrer" className="gallery-item gallery-item-video">
                            <video src={f.signed_url} muted playsInline className="gallery-video" />
                            <span className="gallery-item-label gallery-video-badge">▶ Video</span>
                          </a>
                        ) : (
                          <a
                            key={f.id}
                            href={f.signed_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="gallery-item"
                            style={{ backgroundImage: `url(${f.signed_url})`, backgroundSize: "cover", backgroundPosition: "center" }}
                          >
                            <span className="gallery-item-label">{room}</span>
                          </a>
                        )
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
                  {detail.files.length > 0 ? "No photos available." : "No files uploaded."}
                </p>
              )}
            </div>

            {/* Pre-qualification */}
            {detail.prequal_answers && Object.keys(detail.prequal_answers).length > 0 && (
              <div className="detail-section">
                <h4 className="detail-section-title">Pre-Qualification</h4>
                <div className="prequal-table">
                  {Object.entries(detail.prequal_answers).map(([key, value]) => (
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
                {detail.ai_summary ? (
                  <span className="ai-badge">Generated {formatDate(detail.ai_generated_at)}</span>
                ) : (
                  <button
                    type="button"
                    className="admin-notes-save"
                    disabled={aiLoading}
                    onClick={handleGenerateSummary}
                  >
                    {aiLoading ? "Generating…" : "Generate AI Summary"}
                  </button>
                )}
              </div>
              {aiError && (
                <p style={{ color: "var(--error, #f87171)", fontSize: "0.875rem", marginBottom: "0.75rem" }}>{aiError}</p>
              )}
              {detail.ai_summary ? (
                <div className="admin-ai-card">
                  <div className="ai-summary-section">
                    <h5>Property Overview</h5>
                    <p>{detail.ai_summary.overview}</p>
                  </div>
                  <div className="ai-summary-section">
                    <h5>Condition by Room</h5>
                    <div className="ai-room-grid">
                      {detail.ai_summary.rooms.map(r => (
                        <div key={r.room} className="ai-room-row">
                          <span className="ai-room-name">{r.room}</span>
                          <span className={`ai-room-signal ai-signal-${r.signal}`}>{r.signal}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="ai-summary-section">
                    <h5>Visible Flags</h5>
                    <div className="admin-ai-flags">
                      {detail.ai_summary.flags.map(flag => <span key={flag}>{flag}</span>)}
                    </div>
                  </div>
                  <div className="ai-summary-section">
                    <h5>Overall Assessment</h5>
                    <p className="ai-overall">{detail.ai_summary.assessment}</p>
                  </div>
                </div>
              ) : (
                !aiLoading && (
                  <p style={{ color: "var(--muted)", fontSize: "0.875rem" }}>
                    No summary yet. Click &quot;Generate AI Summary&quot; to analyze this submission.
                  </p>
                )
              )}
            </div>

            {/* Notes */}
            <div className="detail-section">
              <h4 className="detail-section-title">Internal Notes</h4>
              {detail.internal_notes.length > 0 && (
                <div style={{ marginBottom: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                  {detail.internal_notes.map((n: InternalNote) => (
                    <div key={n.id} style={{ background: "rgba(255,255,255,0.04)", borderRadius: "0.5rem", padding: "0.75rem 1rem" }}>
                      <div style={{ fontSize: "0.7rem", color: "var(--muted)", marginBottom: "0.25rem" }}>
                        {n.author} · {formatDate(n.created_at)}
                      </div>
                      <p style={{ fontSize: "0.875rem", margin: 0 }}>{n.text}</p>
                    </div>
                  ))}
                </div>
              )}
              <textarea
                className="text-input"
                placeholder="Add an internal note…"
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
              />
              <div className="admin-notes-footer">
                <button
                  type="button"
                  className="admin-notes-save"
                  disabled={noteSaving || !noteText.trim()}
                  onClick={handleSaveNote}
                >
                  {noteSaved ? "✓ Saved" : noteSaving ? "Saving…" : "Save Note"}
                </button>
              </div>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}
