import { NextRequest } from "next/server";
import { ok, err, unauthorized } from "../../../../../../lib/api/response";
import { adminSupabase } from "../../../../../../lib/supabase/admin";
import { requireAdmin } from "../../../../../../lib/supabase/auth";
import { getSignedUrls } from "../../../../../../lib/supabase/storage";
import type { SubmissionFile, SubmissionFileWithUrl } from "../../../../../../lib/types";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return unauthorized();

  // Verify submission exists and is not a draft
  const { data: sub } = await adminSupabase
    .from("submissions")
    .select("id")
    .eq("id", params.id)
    .eq("draft", false)
    .single();

  if (!sub) return err("Submission not found", 404);

  const { data: rawFiles } = await adminSupabase
    .from("submission_files")
    .select("*")
    .eq("submission_id", params.id)
    .order("room")
    .order("uploaded_at");

  const files: SubmissionFile[] = (rawFiles ?? []) as SubmissionFile[];
  if (files.length === 0) return ok({ files: [], byRoom: {} });

  const signed = await getSignedUrls(files.map(f => f.storage_path), 86400);

  const filesWithUrls: SubmissionFileWithUrl[] = files.map(f => ({
    ...f,
    signed_url: signed[f.storage_path] ?? "",
  }));

  const byRoom: Record<string, SubmissionFileWithUrl[]> = {};
  for (const f of filesWithUrls) {
    if (!byRoom[f.room]) byRoom[f.room] = [];
    byRoom[f.room].push(f);
  }

  return ok({ files: filesWithUrls, byRoom });
}
