export type RoomSignal = "good" | "fair" | "poor";

export function getRoomSignal(room: string, condition: string): RoomSignal {
  const r = room.toLowerCase();
  if (condition === "Poor") {
    if (r.includes("bathroom") || r.includes("garage") || r.includes("exterior")) return "poor";
    if (r.includes("kitchen") || r.includes("backyard")) return "fair";
    return "good";
  }
  if (condition === "Fair") {
    if (r.includes("bathroom") || r.includes("garage")) return "fair";
    return "good";
  }
  // Good
  if (r.includes("garage") || r.includes("backyard")) return "fair";
  return "good";
}

export function getSignalLabel(signal: RoomSignal): string {
  return signal === "good" ? "Good condition" : signal === "fair" ? "Fair condition" : "Needs attention";
}

export function getOverview(condition: string, beds: number | null, baths: number | null): string {
  const desc = `${beds ?? 3}-bed, ${baths ?? 2}-bath home`;
  if (condition === "Good") {
    return `${desc} in strong condition. Bright living areas, updated kitchen surfaces, and well-maintained exterior. Minimal prep work required.`;
  }
  if (condition === "Fair") {
    return `${desc} in solid shape with minor deferred maintenance. Strong bones with updated primary areas. A few cosmetic items flagged below.`;
  }
  return `${desc} showing signs of deferred maintenance. Several items flagged for attention. Recommend detailed inspection before finalizing offer.`;
}

export function getFlags(condition: string): string[] {
  if (condition === "Poor") {
    return [
      "⚠ Visible wear on exterior siding",
      "⚠ Bathroom fixtures aged — replacement recommended",
      "⚠ Roof condition requires inspection"
    ];
  }
  if (condition === "Fair") {
    return [
      "⚠ Minor paint wear — living room",
      "⚠ Tile grout needs refresh — bathroom"
    ];
  }
  return ["⚠ Minor paint wear — entry area"];
}

export function getAssessment(condition: string): string {
  if (condition === "Good") {
    return "Strong candidate for a private market offer. Minimal prep work required. Recommend expedited review.";
  }
  if (condition === "Fair") {
    return "Good candidate with moderate prep work. Cosmetic updates would improve offer range. Standard review timeline applies.";
  }
  return "Recommend full inspection before offer. Condition flags require assessment. Extended review timeline likely.";
}
