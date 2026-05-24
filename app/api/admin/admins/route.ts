import { NextRequest } from "next/server";
import { ok, err } from "../../../../lib/api/response";
import { adminSupabase } from "../../../../lib/supabase/admin";
import { requireAdmin } from "../../../../lib/supabase/auth";

// GET /api/admin/admins — list all admins
export async function GET(_request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) return err("Unauthorized", 401);

  const { data, error } = await adminSupabase
    .from("admin_users")
    .select("id, email, role, created_at")
    .eq("status", "active")
    .neq("email", adminCheck.email ?? "")
    .order("created_at", { ascending: true });

  if (error) return err("Failed to fetch admins", 500);
  return ok({ admins: data ?? [], currentEmail: adminCheck.email });
}
