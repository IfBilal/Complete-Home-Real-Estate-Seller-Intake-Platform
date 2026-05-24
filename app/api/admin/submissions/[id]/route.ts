import { NextRequest } from "next/server";
import { ok, err, unauthorized } from "../../../../../lib/api/response";
import { adminSupabase } from "../../../../../lib/supabase/admin";
import { requireAdmin } from "../../../../../lib/supabase/auth";
import { getSignedUrls } from "../../../../../lib/supabase/storage";
import type { SubmissionStatus, SubmissionFile, SubmissionFileWithUrl } from "../../../../../lib/types";
import { z } from "zod";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return unauthorized();

  const { data: sub } = await adminSupabase
    .from("submissions")
    .select("*")
    .eq("id", params.id)
    .eq("draft", false)
    .single();

  if (!sub) return err("Submission not found", 404);

  const { data: rawFiles } = await adminSupabase
    .from("submission_files")
    .select("*")
    .eq("submission_id", params.id)
    .order("uploaded_at");

  const files: SubmissionFile[] = (rawFiles ?? []) as SubmissionFile[];
  let filesWithUrls: SubmissionFileWithUrl[] = files.map(f => ({ ...f, signed_url: "" }));

  if (files.length > 0) {
    try {
      const signed = await getSignedUrls(files.map(f => f.storage_path), 86400);
      filesWithUrls = files.map(f => ({ ...f, signed_url: signed[f.storage_path] ?? "" }));
    } catch { /* return without signed URLs rather than fail entire request */ }
  }

  // Mark as read
  await adminSupabase.from("submissions").update({ is_new: false }).eq("id", params.id).eq("is_new", true);

  return ok({ ...sub, files: filesWithUrls });
}

const patchSchema = z.object({
  status:   z.enum(["New", "Reviewing", "Offer Made", "Closed"]).optional(),
  noteText: z.string().min(1).max(5000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { isAdmin, email } = await requireAdmin();
  if (!isAdmin) return unauthorized();

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return err("Invalid request body");

  const { status, noteText } = parsed.data;
  const updates: Record<string, unknown> = {};

  if (status) updates.status = status as SubmissionStatus;

  if (noteText) {
    const { data: cur } = await adminSupabase
      .from("submissions")
      .select("internal_notes")
      .eq("id", params.id)
      .eq("draft", false)
      .single();

    const notes = (cur?.internal_notes as Record<string, unknown>[]) ?? [];
    updates.internal_notes = [...notes, {
      id:         crypto.randomUUID(),
      author:     email ?? "admin",
      text:       noteText,
      created_at: new Date().toISOString(),
    }];
  }

  if (Object.keys(updates).length === 0) return err("Nothing to update");

  const { data: updated, error } = await adminSupabase
    .from("submissions")
    .update(updates)
    .eq("id", params.id)
    .eq("draft", false)
    .select("id, status, internal_notes, updated_at")
    .single();

  if (error) return err("Update failed", 500);
  return ok(updated);
}
