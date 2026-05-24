import { NextRequest } from "next/server";
import { ok, err } from "../../../../../lib/api/response";
import { adminSupabase } from "../../../../../lib/supabase/admin";
import { requireAdmin } from "../../../../../lib/supabase/auth";

// DELETE /api/admin/admins/[id] — remove an admin (cannot remove yourself)
export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) return err("Unauthorized", 401);

  const { data: target, error: fetchErr } = await adminSupabase
    .from("admin_users")
    .select("id, email")
    .eq("id", params.id)
    .eq("status", "active")
    .single<{ id: string; email: string }>();

  if (fetchErr || !target) return err("Admin not found", 404);

  // Prevent self-removal
  if (target.email === adminCheck.email) return err("You cannot remove yourself", 400);

  // Delete from admin_users and Supabase Auth (id = auth user id)
  await adminSupabase.from("admin_users").delete().eq("id", params.id);
  await adminSupabase.auth.admin.deleteUser(params.id);

  return ok({ message: `${target.email} removed` });
}
