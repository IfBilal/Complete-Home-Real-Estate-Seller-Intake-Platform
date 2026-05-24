import { NextRequest } from "next/server";
import { ok, err } from "../../../../../lib/api/response";
import { adminSupabase } from "../../../../../lib/supabase/admin";
import { sanitizeFileName } from "../../../../../lib/api/sanitize";
import { z } from "zod";

const ALLOWED_MIME = new Set([
  "image/jpeg", "image/png", "image/heic", "image/heif", "image/webp",
  "video/mp4", "video/quicktime", "video/webm",
]);

const schema = z.object({
  submissionId: z.string().uuid(),
  room:         z.string().min(1).max(100),
  fileType:     z.enum(["photo", "video"]),
  originalName: z.string().min(1).max(255),
  mimeType:     z.string(),
  sizeBytes:    z.number().positive().max(150 * 1024 * 1024),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("Invalid request body");

  const { submissionId, room, fileType, originalName, mimeType, sizeBytes } = parsed.data;

  if (!ALLOWED_MIME.has(mimeType)) return err("File type not allowed");

  const { data: sub } = await adminSupabase
    .from("submissions")
    .select("id")
    .eq("id", submissionId)
    .eq("draft", true)
    .single();

  if (!sub) return err("Draft submission not found", 404);

  const safeRoom = room.replace(/[^a-zA-Z0-9 _\-]/g, "").replace(/\s+/g, "_");
  const safeName = sanitizeFileName(originalName);
  const videoExtMap: Record<string, string> = {
    "video/mp4":       "mp4",
    "video/quicktime": "mov",
    "video/webm":      "webm",
  };
  const ext = fileType === "video" ? (videoExtMap[mimeType] ?? "mp4") : "jpg";
  const filename = `${fileType}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
  const storagePath = `submissions/${submissionId}/${safeRoom}/${filename}`;

  const { data: fileRow, error: insertErr } = await adminSupabase
    .from("submission_files")
    .insert({
      submission_id: submissionId,
      room,
      file_type:     fileType,
      original_name: safeName,
      storage_path:  storagePath,
      mime_type:     mimeType,
      size_bytes:    sizeBytes,
      ai_status:     fileType === "video" ? "skipped" : "pending",
    })
    .select("id")
    .single();

  if (insertErr || !fileRow) return err("Failed to create file record", 500);

  const { data: signed, error: signErr } = await adminSupabase.storage
    .from("property-media")
    .createSignedUploadUrl(storagePath);

  if (signErr || !signed?.signedUrl) {
    await adminSupabase.from("submission_files").delete().eq("id", fileRow.id);
    return err("Failed to generate upload URL", 500);
  }

  return ok({ fileId: fileRow.id, uploadUrl: signed.signedUrl, storagePath, token: signed.token });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const fileId       = searchParams.get("fileId");
  const submissionId = searchParams.get("submissionId");
  if (!fileId || !submissionId) return err("fileId and submissionId required");

  await adminSupabase
    .from("submission_files")
    .delete()
    .eq("id", fileId)
    .eq("submission_id", submissionId);

  return ok({ deleted: true });
}
