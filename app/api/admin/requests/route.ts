import { NextRequest } from "next/server";
import { ok, err } from "../../../../lib/api/response";
import { adminSupabase } from "../../../../lib/supabase/admin";
import { requireAdmin } from "../../../../lib/supabase/auth";
import { normalizeEmail } from "../../../../lib/api/sanitize";
import { z } from "zod";

const schema = z.object({
  email:    z.string().email().max(255),
  password: z.string().min(8).max(128),
});

// POST /api/admin/requests — public, no auth required
// Creates Supabase auth user + inserts into admin_users as pending (cannot log in until approved)
export async function POST(request: NextRequest) {
  const body   = await request.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return err("Invalid email or password (min 8 chars)");

  const email = normalizeEmail(parsed.data.email);

  // Block if already an active or pending admin
  const { data: existing } = await adminSupabase
    .from("admin_users")
    .select("id, status")
    .eq("email", email)
    .single();

  if (existing?.status === "active")  return err("This email is already an admin");
  if (existing?.status === "pending") return err("A request for this email is already pending");

  // Create Supabase auth user with the chosen password
  const { data: authData, error: authErr } = await adminSupabase.auth.admin.createUser({
    email,
    password:      parsed.data.password,
    email_confirm: true,
  });

  if (authErr || !authData.user) return err(authErr?.message ?? "Failed to create account", 500);

  // Insert into admin_users as pending — blocked from logging in until approved
  const { error: insertErr } = await adminSupabase
    .from("admin_users")
    .insert({ id: authData.user.id, email, role: "admin", status: "pending" });

  if (insertErr) {
    await adminSupabase.auth.admin.deleteUser(authData.user.id);
    return err("Failed to submit request", 500);
  }

  return ok({ message: "Request submitted. An admin will review it shortly." }, 201);
}

// GET /api/admin/requests — admin only, returns pending requests
export async function GET(_request: NextRequest) {
  const adminCheck = await requireAdmin();
  if (!adminCheck.isAdmin) return err("Unauthorized", 401);

  const { data, error } = await adminSupabase
    .from("admin_users")
    .select("id, email, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) return err("Failed to fetch requests", 500);
  return ok({ requests: data ?? [] });
}
