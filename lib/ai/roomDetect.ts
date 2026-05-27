import Groq from "groq-sdk";
import { adminSupabase } from "../supabase/admin";
import { getSignedUrl } from "../supabase/storage";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const CONFIDENCE_THRESHOLD = 0.75;

interface GroqVisionResponse {
  is_valid_photo?: boolean;
  match_confidence?: number;
}

export async function detectRoom(
  fileId: string,
  submissionId: string,
  assignedRoom: string,
  storagePath: string
): Promise<void> {
  let imageUrl: string;
  try {
    imageUrl = await getSignedUrl(storagePath, 300);
  } catch {
    await adminSupabase.from("submission_files")
      .update({ ai_status: "skipped", ai_analyzed_at: new Date().toISOString() })
      .eq("id", fileId);
    return;
  }

  try {
    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl } },
          {
            type: "text",
            text: `This photo was uploaded as a "${assignedRoom}".
Respond with ONLY valid JSON — no extra text:
{"is_valid_photo": <true if this is a real usable room or property photo, false if black/blurry/obscured/hand-covered/unusable>, "match_confidence": <0.0 to 1.0, your confidence this photo actually shows a ${assignedRoom}>}`,
          }
        ]
      }],
      max_tokens: 60,
      temperature: 0.1,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: GroqVisionResponse = {};
    try { parsed = JSON.parse(raw) as GroqVisionResponse; } catch { /* treat as unknown */ }

    const isValidPhoto    = parsed.is_valid_photo !== false;
    const matchConfidence = parsed.match_confidence ?? 0;

    const isInvalid  = !isValidPhoto;
    const isMismatch = isValidPhoto && matchConfidence < CONFIDENCE_THRESHOLD;

    await adminSupabase.from("submission_files").update({
      ai_confidence:  matchConfidence,
      ai_is_mismatch: isMismatch,
      ai_is_invalid:  isInvalid,
      ai_status:      "done",
      ai_analyzed_at: new Date().toISOString(),
    }).eq("id", fileId);

  } catch (error) {
    console.error("Groq vision error for file", fileId, error);
    await adminSupabase.from("submission_files").update({
      ai_status:      "skipped",
      ai_analyzed_at: new Date().toISOString(),
    }).eq("id", fileId);
  }
}
