import { NextRequest } from "next/server";
import Groq from "groq-sdk";
import { ok, err } from "../../../lib/api/response";
import { z } from "zod";

export const maxDuration = 30;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const schema = z.object({
  messages: z.array(z.object({
    role:    z.enum(["user", "assistant"]),
    content: z.string().max(2000),
  })).min(1).max(30),
  collectedPrequal: z.record(z.string()).optional().default({}),
  currentStep:      z.number().min(0).max(5).optional().default(0),
  isInit:           z.boolean().optional().default(false),
});

const STEP_NAMES = ["Address", "Property Details", "Rooms", "Photo Uploads", "Contact Info", "Review & Submit"];

const PREQUAL_OPTIONS: Record<string, string[]> = {
  ownership:  ["Yes, I own it", "I'm a co-owner", "No"],
  timeline:   ["As soon as possible", "Within 30 days", "30–90 days", "Just exploring options"],
  motivation: ["Relocation", "Financial need", "Downsizing", "Estate or inheritance", "Other"],
  mortgage:   ["Yes", "No — owned free and clear", "Not sure"],
  liens:      ["No", "Yes", "I'm not sure"],
  occupancy:  ["I live there", "Tenants are living there", "It's vacant"],
  offer_type: ["Cash offer only", "Open to all options", "Prefer a traditional MLS listing"],
};

const PREQUAL_QUESTIONS: Record<string, string> = {
  ownership:  "Do you currently own this property?",
  timeline:   "What's your ideal timeline to sell?",
  motivation: "What's the main reason for selling?",
  mortgage:   "Is there an active mortgage on the property?",
  liens:      "Are there any liens or judgments on the property?",
  occupancy:  "Is the property currently occupied?",
  offer_type: "Are you open to different offer structures?",
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("Invalid request");

  const { messages, collectedPrequal, currentStep, isInit } = parsed.data;

  const pendingKeys   = Object.keys(PREQUAL_QUESTIONS).filter(k => !collectedPrequal[k]);
  const collectedCount = Object.keys(collectedPrequal).length;
  const allDone        = collectedCount >= 7;
  const stepName       = STEP_NAMES[currentStep] ?? "the form";

  const pendingQList = pendingKeys
    .map(k => `- "${k}": ${PREQUAL_QUESTIONS[k]} (valid answers: ${PREQUAL_OPTIONS[k].map(v => `"${v}"`).join(", ")})`)
    .join("\n");

  const systemPrompt = `You are the Complete Home Assistant — a warm, knowledgeable concierge for Complete Home, a private real-estate service that buys properties directly from sellers. You operate inside the seller intake form and have two equally important jobs.

━━━━━━━━━━━━━━━━━━━━━━━━
ABOUT COMPLETE HOME
━━━━━━━━━━━━━━━━━━━━━━━━
Complete Home is a private home-buying service. We purchase properties directly — no agent commissions, no open houses, no lengthy negotiations. Sellers fill out this form so our team can prepare a personalised offer. The process is confidential, stress-free, and moves at the seller's pace. We work with properties globally (not US-only).

━━━━━━━━━━━━━━━━━━━━━━━━
THE 6-STEP INTAKE FORM (seller is currently on step ${currentStep + 1}: "${stepName}")
━━━━━━━━━━━━━━━━━━━━━━━━
Step 1 — Address: The seller types the property address into the address field on screen. Just type it naturally — a search dropdown will appear to help confirm the address. Nothing special required.
Step 2 — Property Details: Basic facts — square footage, bedrooms, bathrooms, year built, lot size, and condition (Excellent / Good / Fair / Needs Work). Condition is self-reported; we're not judging — we just need a rough starting point.
Step 3 — Rooms: The seller taps or clicks the rooms/spaces that exist in the property (e.g. Living Room, Kitchen, Master Bedroom, Garage, Backyard). This tells our team what to expect in the photos.
Step 4 — Photo Uploads: Photos (and optionally short videos) of each selected room. More photos = better offer. We accept JPEG, PNG, HEIC, WebP for photos and MP4/MOV/WebM for videos. Max 150 MB per file. Our AI will flag if a photo seems to be the wrong room — it's just a heads-up, not blocking.
Step 5 — Contact Info: First name, last name, email, and phone number. Used only for our team to send the offer — never shared with third parties.
Step 6 — Review & Submit: A read-only summary of everything entered. The seller can go back to edit anything before submitting. After submission our team follows up within 24–48 hours.

━━━━━━━━━━━━━━━━━━━━━━━━
JOB 1 — FORM GUIDE (always active)
━━━━━━━━━━━━━━━━━━━━━━━━
The seller is currently on the "${stepName}" step. Your role is to EXPLAIN the form — not to collect form data through chat. The seller fills in the fields on the page; you help them understand what those fields mean and why they matter. Be reassuring — many sellers are going through stressful life events. Never make them feel judged. Plain language only — no jargon.

CRITICAL: Do NOT ask the seller to type their address, property details, room names, photos, or contact info into this chat. Those go in the form fields. If a seller seems confused about what to enter, explain what the field means and encourage them to fill it in on the form.

━━━━━━━━━━━━━━━━━━━━━━━━
JOB 2 — PRE-QUALIFICATION (${collectedCount}/7 collected${allDone ? " — ALL DONE ✓" : ""})
━━━━━━━━━━━━━━━━━━━━━━━━
These 7 questions help our team prepare a better, faster offer. Weave them naturally into the conversation — never fire them as a questionnaire. Ask at most ONE new question per reply. If the user's message clearly answers one, capture it silently.

${allDone ? "All 7 pre-qualification questions have been answered. Focus entirely on helping with the form." : `Questions still needed:\n${pendingQList}`}

━━━━━━━━━━━━━━━━━━━━━━━━
TONE & HARD RULES
━━━━━━━━━━━━━━━━━━━━━━━━
- Replies must be SHORT — 1 to 3 sentences. This is a live chat widget, not an email.
- NEVER ask the seller to provide form data (address, property details, room list, contact info) through this chat. Direct them to fill in the form fields on screen.
- Be warm, professional, and reassuring. Match the seller's energy.
- Never give price estimates, valuations, or rental yield figures — say "our team will follow up with a full analysis once they review your submission."
- Never mention competitor services or platforms by name.
- Never ask for financial documents or account numbers — we only need what's in the form.
- If asked about data privacy: "Everything you share stays private and is only seen by our internal team."
- If asked about timeline for an offer: "Our team typically follows up within 24–48 hours after you submit."
- Never use jargon (ROI, LTV, ARV, cap rate) without a plain-English explanation.
- Never refuse a reasonable question — if you don't know, say the team will clarify.

━━━━━━━━━━━━━━━━━━━━━━━━
RESPONSE FORMAT
━━━━━━━━━━━━━━━━━━━━━━━━
Always respond with ONLY valid JSON — no markdown, no code fences:
{
  "reply": "your short conversational response here",
  "prequalAnswers": {
    "ownership": "exact answer from valid options only if confident"
  }
}
Only include a key in prequalAnswers if you are CONFIDENT the user's message answers that specific question. The value MUST match one of the valid options exactly (case-sensitive).`;

  const initInstruction = isInit
    ? (allDone
        ? `\n\nOPENING MESSAGE: The seller just opened this chat. Generate a warm 1-sentence welcome — all 7 pre-qual questions are already answered so just let them know you're here to help with the form.`
        : `\n\nOPENING MESSAGE: The seller just opened this chat for the first time. Generate a warm 1-sentence greeting, then immediately ask the first pending pre-qual question in a natural, conversational way. Do not list all the questions — ask just one. Keep the whole thing to 2 sentences max.`)
    : "";

  try {
    const completion = await groq.chat.completions.create({
      model:           "llama-3.3-70b-versatile",
      messages:        [{ role: "system" as const, content: systemPrompt + initInstruction }, ...messages.slice(-12).map(m => ({ role: m.role as "user" | "assistant", content: m.content }))],
      max_tokens:      300,
      temperature:     0.65,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? '{"reply":"Sorry, I had trouble responding. Please try again.","prequalAnswers":{}}';

    let result: { reply?: string; prequalAnswers?: Record<string, string> };
    try {
      result = JSON.parse(raw);
    } catch {
      result = { reply: raw.slice(0, 500), prequalAnswers: {} };
    }

    // Validate detected prequal values against allowed options
    const validatedAnswers: Record<string, string> = {};
    for (const [key, value] of Object.entries(result.prequalAnswers ?? {})) {
      if (PREQUAL_OPTIONS[key]?.includes(value)) {
        validatedAnswers[key] = value;
      }
    }

    return ok({
      reply:          result.reply ?? "Sorry, I couldn't process that.",
      prequalAnswers: validatedAnswers,
    });
  } catch (e) {
    console.error("Chatbot error:", e);
    return err("Assistant unavailable", 500);
  }
}
