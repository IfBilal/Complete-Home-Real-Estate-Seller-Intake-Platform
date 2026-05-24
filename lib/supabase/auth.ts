import { createClient } from "./server";
import { adminSupabase } from "./admin";

export interface AdminContext {
  isAdmin: boolean;
  userId: string | null;
  email: string | null;
  role: string | null;
}

export async function requireAdmin(): Promise<AdminContext> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { isAdmin: false, userId: null, email: null, role: null };

  const { data: adminUser } = await adminSupabase
    .from("admin_users")
    .select("email, role")
    .eq("id", user.id)
    .eq("status", "active")
    .single();

  return {
    isAdmin: !!adminUser,
    userId: user.id,
    email: adminUser?.email ?? null,
    role: adminUser?.role ?? null
  };
}
