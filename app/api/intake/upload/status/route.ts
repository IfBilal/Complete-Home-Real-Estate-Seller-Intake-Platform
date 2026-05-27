import { NextRequest } from "next/server";
import { ok, err } from "../../../../../lib/api/response";
import { adminSupabase } from "../../../../../lib/supabase/admin";
import type { UploadStatusResponse } from "../../../../../lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId       = searchParams.get("fileId");
  const submissionId = searchParams.get("submissionId");

  if (!fileId || !submissionId) return err("fileId and submissionId required");

  const { data: file } = await adminSupabase
    .from("submission_files")
    .select("id, ai_status, ai_is_mismatch, ai_is_invalid, ai_confidence")
    .eq("id", fileId)
    .eq("submission_id", submissionId)
    .single();

  if (!file) return err("File not found", 404);

  const response: UploadStatusResponse = {
    fileId,
    aiStatus:   file.ai_status,
    isMismatch: file.ai_is_mismatch ?? undefined,
    isInvalid:  file.ai_is_invalid  ?? undefined,
    confidence: file.ai_confidence  ?? undefined,
  };

  return ok(response);
}
