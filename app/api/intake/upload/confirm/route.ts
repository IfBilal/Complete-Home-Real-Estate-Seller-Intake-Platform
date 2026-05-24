import { NextRequest } from "next/server";
import { ok, err } from "../../../../../lib/api/response";
import { adminSupabase } from "../../../../../lib/supabase/admin";
import { detectRoom } from "../../../../../lib/ai/roomDetect";
import { z } from "zod";

// NC1 fix: extend timeout so background Groq vision call has time to complete
export const maxDuration = 30;

const schema = z.object({
  fileId:       z.string().uuid(),
  submissionId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("Invalid request");

  const { fileId, submissionId } = parsed.data;

  const { data: file } = await adminSupabase
    .from("submission_files")
    .select("room, file_type, storage_path, ai_status")
    .eq("id", fileId)
    .eq("submission_id", submissionId)
    .single();

  if (!file) return err("File not found", 404);

  if (file.file_type === "photo" && file.ai_status === "pending") {
    await adminSupabase
      .from("submission_files")
      .update({ ai_status: "analyzing" })
      .eq("id", fileId);

    detectRoom(fileId, submissionId, file.room, file.storage_path)
      .catch(e => console.error("Room detection failed:", e));
  }

  return ok({ confirmed: true, aiStatus: file.file_type === "photo" ? "analyzing" : "skipped" });
}
