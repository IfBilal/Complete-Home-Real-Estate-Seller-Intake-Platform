import { NextRequest } from "next/server";
import { ok, err } from "../../../../lib/api/response";
import { adminSupabase } from "../../../../lib/supabase/admin";

// NC2 fix: extend timeout so fire-and-forget emails + AI summary have time to complete
export const maxDuration = 60;

import { sanitizeText, normalizeEmail } from "../../../../lib/api/sanitize";
import { sendAdminAlert, sendSellerConfirmation } from "../../../../lib/email/nodemailer";
import { generateSummary } from "../../../../lib/ai/summarize";
import { z } from "zod";

// N1 fix: include all user-editable property fields — draft seeded from RentCast but user may edit
const submitSchema = z.object({
  submissionId:   z.string().uuid(),
  firstName:      z.string().min(1).max(100),
  lastName:       z.string().min(1).max(100),
  email:          z.string().email().max(255),
  phone:          z.string().min(7).max(30),
  sqft:           z.string().max(20).optional(),
  beds:           z.number().int().min(0).max(50).optional(),
  baths:          z.number().int().min(0).max(50).optional(),
  yearBuilt:      z.string().max(10).optional(),
  lotSize:        z.string().max(30).optional(),
  condition:      z.enum(["Excellent", "Good", "Fair", "Needs work"]).optional(),
  rooms:          z.array(z.string().min(1)).min(1).max(30),
  prequalAnswers: z.record(z.string()).optional().default({}),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) return err(`Validation: ${parsed.error.issues[0]?.message}`);

  const d = parsed.data;

  const { data: existing } = await adminSupabase
    .from("submissions")
    .select("id, human_id, address, address_city, address_state")
    .eq("id", d.submissionId)
    .eq("draft", true)
    .single();

  if (!existing) return err("Draft not found or already submitted", 404);

  const { data: submission, error: updateError } = await adminSupabase
    .from("submissions")
    .update({
      draft:           false,
      first_name:      sanitizeText(d.firstName),
      last_name:       sanitizeText(d.lastName),
      email:           normalizeEmail(d.email),
      phone:           d.phone,
      sqft:            d.sqft,
      beds:            d.beds,
      baths:           d.baths,
      year_built:      d.yearBuilt,
      lot_size:        d.lotSize,
      condition:       d.condition,
      rooms:           d.rooms,
      prequal_answers: d.prequalAnswers,
      status:          "New",
      is_new:          true,
      submitted_at:    new Date().toISOString(),
      user_agent:      request.headers.get("user-agent") ?? undefined,
    })
    .eq("id", d.submissionId)
    .select("id, human_id, address, first_name, last_name, email")
    .single();

  if (updateError || !submission) {
    console.error("Submit finalize error:", updateError);
    return err("Failed to submit. Please try again.", 500);
  }

  // Await all post-submit tasks so Vercel doesn't kill them before completion
  const results = await Promise.allSettled([
    sendAdminAlert(submission.id, submission.human_id, submission.first_name ?? "", submission.last_name ?? "", submission.address, submission.email ?? ""),
    sendSellerConfirmation(submission.id, submission.email ?? "", submission.first_name ?? "", submission.human_id),
    generateSummary(submission.id),
  ]);
  results.forEach(r => { if (r.status === "rejected") console.error("Post-submit task failed:", r.reason); });

  return ok({ submissionId: submission.id, humanId: submission.human_id }, 200);
}
