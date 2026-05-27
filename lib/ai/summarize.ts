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

  const roomStats = (sub.rooms as string[]).map(room => {
    const roomFiles = (files ?? []).filter(f => f.room === room);
    const photos     = roomFiles.filter(f => f.file_type === "photo");
    const mismatches = photos.filter(f => f.ai_is_mismatch).length;
    const invalids   = photos.filter(f => f.ai_is_invalid).length;
    const flags = [
      mismatches > 0 ? `${mismatches} wrong-room flag(s)` : "",
      invalids   > 0 ? `${invalids} unusable photo(s)`    : "",
    ].filter(Boolean).join(", ");
    return `- ${room}: ${photos.length} photo(s)${flags ? ` — AI flags: ${flags}` : " — no AI flags"}`;
  });

  const totalMismatches = (files ?? []).filter(f => f.ai_is_mismatch).length;
  const totalInvalids   = (files ?? []).filter(f => f.ai_is_invalid).length;
  const totalAiFlags    = totalMismatches + totalInvalids;

  const prequal = Object.entries(sub.prequal_answers as Record<string, string>)
    .map(([k, v]) => `${k}: ${v}`).join(", ");

  const prompt = `You are a real estate intake analyst writing an internal summary for a buying team. Respond with ONLY valid JSON matching the schema below.

YOUR JOB: Summarize the data the seller actually provided. Your tone must match the seller's condition rating — if they said "Excellent" or "Good", reflect that positively. Do not add concerns that are not in the data.

STRICT RULES:
1. The seller's condition rating is the single strongest signal. Trust it. A seller who says "Excellent" is describing an excellent home — write accordingly.
2. Only reference rooms listed under "ROOMS WITH PHOTOS". Never mention any room, area, or feature not listed there.
3. Flags must come from: (a) AI flags in the photo data, OR (b) a condition rating of "Fair" or "Needs Work". If there are zero AI flags and condition is "Good" or "Excellent", the flags array should be empty [].
4. Do not invent defects, maintenance issues, or recommendations not supported by the data.
5. Notes for each room should describe what was submitted (photo count, any AI flags) — nothing more.

PROPERTY DATA:
- Address: ${sub.address}
- Beds: ${sub.beds ?? "not provided"} | Baths: ${sub.baths ?? "not provided"} | Sqft: ${sub.sqft ?? "not provided"} | Year built: ${sub.year_built ?? "not provided"} | Lot: ${sub.lot_size ?? "not provided"}
- Seller-rated condition: ${sub.condition ?? "not provided"}
- Total AI photo flags: ${totalAiFlags} (${totalMismatches} wrong-room, ${totalInvalids} unusable)

ROOMS WITH PHOTOS:
${roomStats.join("\n")}

SELLER PRE-QUAL ANSWERS:
${prequal || "none collected"}

JSON schema:
{
  "overview": "<2-3 sentences summarizing the property based on what the seller provided. Tone must match the condition rating.>",
  "rooms": [{"room": "<exact room name from list above>", "signal": "<good|fair|poor — driven by condition rating and AI flags>", "label": "<Good condition|Fair condition|Needs attention>", "notes": "<one factual observation: photo count and any AI flags only>"}],
  "flags": ["<only real flags from AI photo data or a Fair/Needs Work condition rating — empty array if none>"],
  "assessment": "<2-3 sentences. If condition is Good/Excellent and no AI flags, recommend proceeding. Only flag concerns when the data supports it.>"
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
