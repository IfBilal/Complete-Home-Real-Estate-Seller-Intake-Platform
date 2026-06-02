import Groq from "groq-sdk";
import { adminSupabase } from "../supabase/admin";
import type { AISummary, AISummaryRoom } from "../types";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

interface SummaryGroqResponse {
  overview?:   string;
  rooms?:      AISummaryRoom[];
  flags?:      string[];
  assessment?: string;
}

export async function generateSummary(submissionId: string): Promise<AISummary | null> {
  const { data: sub } = await adminSupabase
    .from("submissions")
    .select("address, beds, baths, sqft, year_built, lot_size, condition, rooms, prequal_answers")
    .eq("id", submissionId)
    .single();

  if (!sub) return null;

  const { data: files } = await adminSupabase
    .from("submission_files")
    .select("room, file_type, ai_is_mismatch, ai_is_invalid")
    .eq("submission_id", submissionId);

  const prequal_map = (sub.prequal_answers ?? {}) as Record<string, string>;

  const getRoomCondition = (room: string): string | null => {
    if (room === "Kitchen")     return prequal_map.kitchenCondition    || null;
    if (room === "Living Room") return prequal_map.livingRoomCondition || null;
    if (room.startsWith("Bathroom")) return prequal_map.bathroomCondition || null;
    return null;
  };

  const roomConditionToSignal = (c: string): string => {
    if (c === "High end" || c === "Standard") return "good";
    if (c === "Dated")       return "fair";
    if (c === "Fixer Upper") return "poor";
    return "good";
  };

  const roomStats = (sub.rooms as string[]).map(room => {
    const roomFiles   = (files ?? []).filter(f => f.room === room);
    const photos      = roomFiles.filter(f => f.file_type === "photo");
    const mismatches  = photos.filter(f => f.ai_is_mismatch).length;
    const invalids    = photos.filter(f => f.ai_is_invalid).length;
    const aiFlags = [
      mismatches > 0 ? `${mismatches} wrong-room flag(s)` : "",
      invalids   > 0 ? `${invalids} unusable photo(s)`    : "",
    ].filter(Boolean).join(", ");
    const roomCond    = getRoomCondition(room);
    const condNote    = roomCond ? ` — seller-rated condition: ${roomCond}` : "";
    return `- ${room}: ${photos.length} photo(s)${aiFlags ? ` — AI flags: ${aiFlags}` : " — no AI flags"}${condNote}`;
  });

  const totalMismatches = (files ?? []).filter(f => f.ai_is_mismatch).length;
  const totalInvalids   = (files ?? []).filter(f => f.ai_is_invalid).length;
  const totalAiFlags    = totalMismatches + totalInvalids;

  const prequal = Object.entries(prequal_map)
    .filter(([k]) => !["kitchenCondition","bathroomCondition","livingRoomCondition"].includes(k))
    .map(([k, v]) => `${k}: ${v}`).join(", ");

  // Pre-compute room signals deterministically so AI can't contradict seller room data
  const roomSignalLines = (sub.rooms as string[]).map(room => {
    const cond = getRoomCondition(room);
    if (cond) {
      const sig = roomConditionToSignal(cond);
      const label = sig === "good" ? "Good condition" : sig === "fair" ? "Fair condition" : "Needs attention";
      return `- ${room}: signal="${sig}", label="${label}" (seller-rated: ${cond})`;
    }
    // No specific room condition — derive from overall
    const overall = sub.condition ?? "";
    const sig = (overall === "Excellent" || overall === "Good") ? "good" : overall === "Fair" ? "fair" : "poor";
    const label = sig === "good" ? "Good condition" : sig === "fair" ? "Fair condition" : "Needs attention";
    return `- ${room}: signal="${sig}", label="${label}" (derived from overall: ${overall})`;
  });

  const prompt = `You are a real estate intake analyst writing an internal summary for a buying team. Respond with ONLY valid JSON matching the schema below.

YOUR JOB: Summarize the data the seller actually provided. Be accurate — if a room was rated "Fixer Upper", flag it even if the overall property condition is "Good" or "Excellent".

STRICT RULES:
1. Use the exact signal/label values from ROOM SIGNALS below — do not change them.
2. Only reference rooms listed under "ROOMS WITH PHOTOS". Never mention any room not listed.
3. Flags must come from: (a) AI photo flags, OR (b) room conditions of "Fixer Upper" or "Dated", OR (c) overall condition of "Fair" or "Needs Work".
4. Do not invent defects not supported by the data.
5. Room notes: describe photo count and any AI flags only — nothing more.

PROPERTY DATA:
- Address: ${sub.address}
- Beds: ${sub.beds ?? "not provided"} | Baths: ${sub.baths ?? "not provided"} | Sqft: ${sub.sqft ?? "not provided"} | Year built: ${sub.year_built ?? "not provided"} | Lot: ${sub.lot_size ?? "not provided"}
- Overall seller-rated condition: ${sub.condition ?? "not provided"}
- Total AI photo flags: ${totalAiFlags} (${totalMismatches} wrong-room, ${totalInvalids} unusable)

ROOM SIGNALS (use these exactly):
${roomSignalLines.join("\n")}

ROOMS WITH PHOTOS:
${roomStats.join("\n")}

SELLER PRE-QUAL ANSWERS:
${prequal || "none collected"}

JSON schema:
{
  "overview": "<2-3 sentences summarizing the property. Reflect overall condition but honestly note any room-level concerns.>",
  "rooms": [{"room": "<exact room name>", "signal": "<copy signal from ROOM SIGNALS>", "label": "<copy label from ROOM SIGNALS>", "notes": "<photo count and AI flags only>"}],
  "flags": ["<real flags: AI photo flags, Fixer Upper/Dated room conditions, or Fair/Needs Work overall — empty array if none>"],
  "assessment": "<2-3 sentences. Acknowledge both positives and real concerns from the data.>"
}`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1000,
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as SummaryGroqResponse;

    const summary: AISummary = {
      overview:     parsed.overview ?? "",
      rooms:        parsed.rooms ?? [],
      flags:        parsed.flags ?? [],
      assessment:   parsed.assessment ?? "",
      generated_at: new Date().toISOString(),
      model:        "llama-3.3-70b-versatile",
    };

    await adminSupabase.from("submissions").update({
      ai_summary:      summary,
      ai_generated_at: new Date().toISOString(),
    }).eq("id", submissionId);

    return summary;

  } catch (error) {
    console.error("Groq summary error for submission", submissionId, error);
    return null;
  }
}
