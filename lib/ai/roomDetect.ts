import Groq from "groq-sdk";
import { adminSupabase } from "../supabase/admin";
import { getSignedUrl } from "../supabase/storage";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const ROOM_SYNONYMS: Record<string, string[]> = {
  Kitchen:       ["kitchen", "kitchenette"],
  "Living Room": ["living room", "lounge", "family room", "great room"],
  Bedroom:       ["bedroom", "sleeping room", "master bedroom", "guest room"],
  Bathroom:      ["bathroom", "bath", "restroom", "washroom", "shower"],
  Garage:        ["garage", "carport"],
  Backyard:      ["backyard", "patio", "deck", "garden", "pool", "yard"],
  Exterior:      ["exterior", "front yard", "facade", "outside", "driveway", "street view"],
  "Dining Room": ["dining room", "dining area"],
  Basement:      ["basement", "cellar"],
  Laundry:       ["laundry", "utility room"],
};

function matchCategory(label: string): string {
  const lower = label.toLowerCase();
  for (const [cat, synonyms] of Object.entries(ROOM_SYNONYMS)) {
    if (synonyms.some(s => lower.includes(s))) return cat;
  }
  return "Unknown";
}

function roomsMatch(assignedRoom: string, detectedCategory: string): boolean {
  if (detectedCategory === "Unknown") return true;
  const base = assignedRoom.replace(/\s*\d+$/, "").trim();
  return base === detectedCategory;
}

interface GroqVisionResponse {
  room_type?: string;
  confidence?: number;
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
      model: "llama-3.2-90b-vision-preview",
      messages: [{
        role: "user",
        content: [
          { type: "image_url", image_url: { url: imageUrl } },
          {
            type: "text",
            text: `Classify this real estate photo. Respond with ONLY valid JSON:
{"room_type": "<detected room in plain English>", "confidence": <0.0 to 1.0>}
Categories: Kitchen, Living Room, Bedroom, Bathroom, Garage, Backyard, Exterior, Dining Room, Basement, Laundry, Unknown.
No extra text.`
          }
        ]
      }],
      max_tokens: 100,
      temperature: 0.1,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    let parsed: GroqVisionResponse = {};
    try { parsed = JSON.parse(raw) as GroqVisionResponse; } catch { /* use empty */ }

    const detected = matchCategory(parsed.room_type ?? "");
    const isMismatch = !roomsMatch(assignedRoom, detected);

    await adminSupabase.from("submission_files").update({
      ai_detected_room: detected,
      ai_confidence:    parsed.confidence ?? null,
      ai_is_mismatch:   isMismatch,
      ai_status:        "done",
      ai_analyzed_at:   new Date().toISOString(),
    }).eq("id", fileId);

  } catch (error) {
    console.error("Groq vision error for file", fileId, error);
    await adminSupabase.from("submission_files").update({
      ai_status:      "skipped",
      ai_analyzed_at: new Date().toISOString(),
    }).eq("id", fileId);
  }
}
