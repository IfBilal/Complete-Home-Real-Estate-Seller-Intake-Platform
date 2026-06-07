"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const FEATURES = [
  { icon: "◈", label: "Submission Management", desc: "Review and track every seller intake in one place." },
  { icon: "◎", label: "AI Property Summaries", desc: "Auto-generated condition analysis for each submission." },
  { icon: "◇", label: "Pipeline Tracking",     desc: "Move submissions from New to Closed with one click." },
];

function LoginForm() {
  const router      = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim(), password }),
      });

      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json.error ?? "Login failed. Check your credentials.");
      } else {
        const redirect = searchParams.get("redirect") ?? "/admin";
        router.push(redirect);
        router.refresh();
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="al-right">
      <div className="al-form-wrap">
        <div className="al-form-header">
          <span className="al-pill">Staff Portal</span>
          <h1>Sign In</h1>
          <p>Enter your credentials to access the review dashboard.</p>
        </div>

        <form className="al-form" onSubmit={handleSubmit}>
          <div className="al-field">
            <label className="input-label" htmlFor="email">Work email</label>
            <input
              id="email"
              className="text-input"
              type="email"
              placeholder="you@completehome.com"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="al-field">
            <label className="input-label" htmlFor="password">Password</label>
            <input
              id="password"
              className="text-input"
              type="password"
              placeholder="••••••••••"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="al-error">{error}</p>}

          <button
            className="button-primary al-submit"
            type="submit"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign In to Dashboard"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <main className="al-shell">

      {/* ── Left panel ── */}
      <div className="al-left">
        <div className="al-left-inner">
          <Link href="/" className="al-brand">
            <Image src="/logo.png" alt="Complete Home" width={40} height={40} className="al-brand-logo" />
            <div>
              <strong>Complete Home</strong>
              <span>Real Estate Experts</span>
            </div>
          </Link>

          <div className="al-left-body">
            <p className="al-left-label">Internal Dashboard</p>
            <h2 className="al-left-heading">Your complete review workspace.</h2>
            <p className="al-left-sub">
              Manage seller submissions, review AI-generated property summaries, and guide deals from intake to close.
            </p>

            <div className="al-features">
              {FEATURES.map((f) => (
                <div key={f.label} className="al-feature">
                  <span className="al-feature-icon">{f.icon}</span>
                  <div>
                    <strong>{f.label}</strong>
                    <p>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="al-left-footer">© 2026 Complete Home Real Estate Experts</p>
        </div>
      </div>

      {/* ── Right panel — Suspense required for useSearchParams ── */}
      <Suspense fallback={<div className="al-right" />}>
        <LoginForm />
      </Suspense>

    </main>
  );
}
