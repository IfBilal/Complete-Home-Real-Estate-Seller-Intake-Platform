import { NextRequest } from "next/server";

export const maxDuration = 60;
import { ok, err, unauthorized } from "../../../../../../lib/api/response";
import { requireAdmin } from "../../../../../../lib/supabase/auth";
import { generateSummary } from "../../../../../../lib/ai/summarize";

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return unauthorized();

  const summary = await generateSummary(params.id);
  if (!summary) return err("AI summarization failed", 500);

  return ok({ summary });
}
