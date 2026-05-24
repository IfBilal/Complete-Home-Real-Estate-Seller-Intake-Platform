import { NextRequest } from "next/server";
import { ok, err, unauthorized } from "../../../../lib/api/response";
import { generateSummary } from "../../../../lib/ai/summarize";
import { requireAdmin } from "../../../../lib/supabase/auth";
import { z } from "zod";

export const maxDuration = 60;

const schema = z.object({ submissionId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("Invalid request");

  const summary = await generateSummary(parsed.data.submissionId);
  if (!summary) return err("AI summary failed", 500);

  return ok({ summary });
}
