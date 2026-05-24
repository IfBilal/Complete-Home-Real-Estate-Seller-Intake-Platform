import { NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { err } from "../../../../../lib/api/response";
import { adminSupabase } from "../../../../../lib/supabase/admin";
import { z } from "zod";

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return err("Invalid credentials");

  const { email, password } = parsed.data;

  const response = NextResponse.json({ success: true, data: {} });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session) return err("Invalid credentials", 401);

  const { data: adminRow } = await adminSupabase
    .from("admin_users")
    .select("id, role")
    .eq("email", email.toLowerCase())
    .single();

  if (!adminRow) {
    await supabase.auth.signOut();
    return err("Access denied", 403);
  }

  // Rewrite body with user info — cookies were already set on this response object
  const body2 = NextResponse.json({
    success: true,
    data: {
      userId: data.user.id,
      email:  data.user.email,
      role:   adminRow.role,
    },
  });
  response.cookies.getAll().forEach(c => body2.cookies.set(c));
  return body2;
}
