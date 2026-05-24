import { NextRequest } from "next/server";
import { ok, err, unauthorized } from "../../../../lib/api/response";
import { requireAdmin } from "../../../../lib/supabase/auth";
import { detectRoom } from "../../../../lib/ai/roomDetect";
import { adminSupabase } from "../../../../lib/supabase/admin";
import { z } from "zod";

export const maxDuration = 30;

const schema = z.object({ fileId: z.string().uuid(), submissionId: z.string().uuid() });

export async function POST(request: NextRequest) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("Invalid request");

  const { fileId, submissionId } = parsed.data;

  const { data: file } = await adminSupabase
    .from("submission_files")
    .select("room, storage_path, file_type")
    .eq("id", fileId)
    .eq("submission_id", submissionId)
    .single();

  if (!file || file.file_type !== "photo") return err("File not found or not a photo", 404);

  await detectRoom(fileId, submissionId, file.room, file.storage_path);
  return ok({ analyzed: true });
}
