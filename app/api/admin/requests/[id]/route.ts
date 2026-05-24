import { NextRequest } from "next/server";
import { ok, err } from "../../../../../lib/api/response";
import { adminSupabase } from "../../../../../lib/supabase/admin";
import { requireAdmin } from "../../../../../lib/supabase/auth";
import { z } from "zod";

const schema = z.object({ action: z.enum(["approve", "reject"]) });

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) return err("Unauthorized", 401);

  const body   = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("action must be approve or reject");

  // Only act on pending entries
  const { data: req, error: fetchErr } = await adminSupabase
    .from("admin_users")
    .select("id, email")
    .eq("id", params.id)
    .eq("status", "pending")
    .single();

  if (fetchErr || !req) return err("Pending request not found", 404);

  if (parsed.data.action === "reject") {
    // Delete auth user and the admin_users row
    await adminSupabase.auth.admin.deleteUser(req.id);
    await adminSupabase.from("admin_users").delete().eq("id", req.id);
    return ok({ message: "Request rejected" });
  }

  // Approve — flip status to active, they can now log in
  const { error: updateErr } = await adminSupabase
    .from("admin_users")
    .update({ status: "active" })
    .eq("id", req.id);

  if (updateErr) return err("Failed to activate admin", 500);
  return ok({ message: `${req.email} is now an active admin` });
}
