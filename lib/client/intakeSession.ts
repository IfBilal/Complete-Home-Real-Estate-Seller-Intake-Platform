"use client";

export const SESSION_KEY = "ch_intake_session";

export interface IntakeSession {
  // Step 0 — Address
  currentStep:      number;
  addressQuery:     string;
  placeId:          string | null;
  sessionToken:     string | null;
  selectedAddress:  string | null;
  addressCity:      string | null;
  addressState:     string | null;
  addressZip:       string | null;
  addressLat:       number | null;
  addressLng:       number | null;
  isConfirmed:      boolean;
  // Backend draft
  submissionId:     string | null;
  humanId:          string | null;
  // Step 1 — Property
  sqft:             string | null;
  beds:             number | null;
  baths:            number | null;
  yearBuilt:        string;
  lotSize:          string;
  condition:        string;
  exteriorImageUrl: string | null;
  // Step 2 — Rooms
  selectedRooms:    string[];
  // Step 4 — Contact
  firstName:        string;
  lastName:         string;
  email:            string;
  phone:            string;
  savedAt:          string;
}

export const DEFAULT_SESSION: IntakeSession = {
  currentStep:      0,
  addressQuery:     "",
  placeId:          null,
  sessionToken:     null,
  selectedAddress:  null,
  addressCity:      null,
  addressState:     null,
  addressZip:       null,
  addressLat:       null,
  addressLng:       null,
  isConfirmed:      false,
  submissionId:     null,
  humanId:          null,
  sqft:             null,
  beds:             null,
  baths:            null,
  yearBuilt:        "",
  lotSize:          "",
  condition:        "",
  exteriorImageUrl: null,
  selectedRooms:    ["Kitchen", "Living Room", "Bedroom 1", "Bathroom 1", "Exterior"],
  firstName:        "",
  lastName:         "",
  email:            "",
  phone:            "",
  savedAt:          "",
};

export function loadSession(): IntakeSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<IntakeSession>;
    // Merge with defaults so new fields don't break old sessions
    return { ...DEFAULT_SESSION, ...parsed };
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function saveSession(s: IntakeSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    // Storage quota exceeded — silently ignore
  }
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY);
}
