"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SESSION_KEY, type IntakeSession } from "../lib/client/intakeSession";

const STEPS = ["Address", "Property", "Rooms", "Uploads", "Contact", "Review"];

export default function HeroResumeCard() {
  const [session, setSession] = useState<IntakeSession | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) setSession(JSON.parse(raw) as IntakeSession);
    } catch {
      localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const hasActiveSession = session && session.currentStep > 0;
  const progress = session ? Math.round((session.currentStep / (STEPS.length - 1)) * 100) : 65;

  // selectedAddress is the flat field from the new IntakeSession shape
  const address = session?.selectedAddress || session?.addressQuery || "";
  const streetPart = address.split(",")[0] || "Your Property";
  const cityPart = session?.addressCity && session?.addressState
    ? `${session.addressCity}, ${session.addressState}`
    : address.split(",").slice(1).join(",").trim() || "City, State";
  const meta = hasActiveSession
    ? `${cityPart}${session?.sqft ? ` · ${session.sqft} sqft` : ""}`
    : "City, State · Sq Ft";

  const stepName = session ? STEPS[Math.min(session.currentStep, STEPS.length - 1)] : "";

  return (
    <div className={`hero-card${hasActiveSession ? " hero-card-active" : ""}`}>
      <div className={`hero-card-image${hasActiveSession ? " hero-card-image-live" : ""}`} />
      <div className="hero-card-body">
        {hasActiveSession && (
          <div className="hero-card-live-badge">In Progress</div>
        )}
        <p className="hero-card-title">{streetPart}</p>
        <p className="hero-card-meta">{hasActiveSession ? meta : "City, State · Sq Ft"}</p>
        <div className="hero-card-row">
          <span>
            {hasActiveSession ? `Step ${session!.currentStep + 1} — ${stepName}` : "Intake progress"}
          </span>
          <strong>{hasActiveSession ? `${progress}%` : "0%"}</strong>
        </div>
        <div className="hero-card-progress">
          <div
            className="hero-card-progress-fill"
            style={{ width: `${hasActiveSession ? progress : 0}%` }}
          />
        </div>
        {hasActiveSession ? (
          <Link href="/intake" className="hero-card-resume-btn">
            Resume Your Review →
          </Link>
        ) : (
          <p className="hero-card-note">Resume anytime on this device.</p>
        )}
      </div>
    </div>
  );
}
