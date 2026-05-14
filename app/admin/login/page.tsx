"use client";

import Image from "next/image";
import Link from "next/link";

const FEATURES = [
  { icon: "◈", label: "Submission Management", desc: "Review and track every seller intake in one place." },
  { icon: "◎", label: "AI Property Summaries", desc: "Auto-generated condition analysis for each submission." },
  { icon: "◇", label: "Pipeline Tracking",     desc: "Move submissions from New to Closed with one click." },
];

export default function AdminLoginPage() {
  return (
    <main className="al-shell">

      {/* ── Left panel ── */}
      <div className="al-left">
        <div className="al-left-inner">
          <Link href="/" className="al-brand">
            <Image src="/logo.jpeg" alt="Complete Home" width={40} height={40} className="al-brand-logo" />
            <div>
              <strong>Complete Home</strong>
              <span>Real Estate Experts</span>
            </div>
          </Link>

          <div className="al-left-body">
            <p className="al-left-label">Internal Dashboard</p>
            <h2 className="al-left-heading">
              Your complete review workspace.
            </h2>
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

      {/* ── Right panel ── */}
      <div className="al-right">
        <div className="al-form-wrap">
          <div className="al-form-header">
            <span className="al-pill">Staff Portal</span>
            <h1>Sign In</h1>
            <p>Enter your credentials to access the review dashboard.</p>
          </div>

          <form className="al-form">
            <div className="al-field">
              <label className="input-label" htmlFor="email">Work email</label>
              <input id="email" className="text-input" type="email" placeholder="you@completehome.com" />
            </div>

            <div className="al-field">
              <div className="al-field-row">
                <label className="input-label" htmlFor="password">Password</label>
                <a href="#" className="al-forgot">Forgot password?</a>
              </div>
              <input id="password" className="text-input" type="password" placeholder="••••••••••" />
            </div>

            <button className="button-primary al-submit" type="button">
              Sign In to Dashboard
            </button>

          </form>

          <p className="login-note">Demo only — authentication is mocked for client preview.</p>
        </div>
      </div>

    </main>
  );
}
