"use client";

import { useState } from "react";

export default function AdminRequestPage() {
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [loading,   setLoading]   = useState(false);
  const [success,   setSuccess]   = useState(false);
  const [error,     setError]     = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res  = await fetch("/api/admin/requests", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        setError(json.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSuccess(true);
    } catch {
      setError("Connection error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="admin-request-wrap">
        <div className="admin-request-card">
          <div className="admin-request-success-icon">✓</div>
          <h2 className="admin-request-title">Request Submitted</h2>
          <p className="admin-request-sub">An existing admin will review your request. You&apos;ll be able to log in once approved.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-request-wrap">
      <div className="admin-request-card">
        <div className="admin-request-logo">🏠</div>
        <h2 className="admin-request-title">Request Admin Access</h2>
        <p className="admin-request-sub">Enter the email and password you want to use. An existing admin will review your request.</p>

        <form onSubmit={handleSubmit} className="admin-request-form">
          <div className="admin-req-field">
            <label className="admin-req-label">Email</label>
            <input
              type="email"
              className="admin-req-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="admin-req-field">
            <label className="admin-req-label">Password</label>
            <input
              type="password"
              className="admin-req-input"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={loading}
            />
          </div>

          {error && <p className="admin-req-error">{error}</p>}

          <button type="submit" className="admin-req-btn" disabled={loading}>
            {loading ? "Submitting…" : "Submit Request"}
          </button>
        </form>
      </div>
    </div>
  );
}
