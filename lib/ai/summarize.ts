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
    .select("room, file_type, ai_detected_room, ai_is_mismatch")
    .eq("submission_id", submissionId);

  const roomStats = (sub.rooms as string[]).map(room => {
    const roomFiles = (files ?? []).filter(f => f.room === room);
    const photos = roomFiles.filter(f => f.file_type === "photo");
    const mismatches = photos.filter(f => f.ai_is_mismatch).length;
    const detected = [...new Set(photos.map(p => p.ai_detected_room).filter(Boolean))];
    return `- ${room}: ${photos.length} photos${mismatches > 0 ? `, ${mismatches} mismatch(es)` : ""}${detected.length ? ` (AI saw: ${detected.join(", ")})` : ""}`;
  });

  const prequal = Object.entries(sub.prequal_answers as Record<string, string>)
    .map(([k, v]) => `${k}: ${v}`).join(", ");

  const prompt = `You are a real estate analyst. Generate a structured property review summary for an internal team. Respond with ONLY valid JSON matching the schema below.

PROPERTY:
- Address: ${sub.address}
- Beds: ${sub.beds ?? "?"} | Baths: ${sub.baths ?? "?"} | Sqft: ${sub.sqft ?? "?"} | Year: ${sub.year_built ?? "?"} | Lot: ${sub.lot_size ?? "?"}
- Seller-rated condition: ${sub.condition ?? "unknown"}

ROOMS WITH PHOTOS:
${roomStats.join("\n")}

PRE-QUAL: ${prequal || "none"}

JSON schema:
{
  "overview": "<2-3 sentence property overview>",
  "rooms": [{"room": "<name>", "signal": "<good|fair|poor>", "label": "<Good condition|Fair condition|Needs attention>", "notes": "<one observation>"}],
  "flags": ["<specific concern>"],
  "assessment": "<2-3 sentence overall assessment and recommendation>"
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
