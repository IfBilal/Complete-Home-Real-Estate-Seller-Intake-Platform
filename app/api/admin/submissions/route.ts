import { NextRequest } from "next/server";
import { ok, err, unauthorized } from "../../../../lib/api/response";
import { adminSupabase } from "../../../../lib/supabase/admin";
import { requireAdmin } from "../../../../lib/supabase/auth";
import type { AdminSubmissionListItem } from "../../../../lib/types";

export async function GET(request: NextRequest) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) return unauthorized();

  const sp = new URL(request.url).searchParams;
  const status = sp.get("status");
  const city   = sp.get("city");
  const date   = sp.get("date");
  const query  = sp.get("q");
  const page   = Math.max(1, parseInt(sp.get("page") ?? "1"));
  const limit  = Math.min(100, parseInt(sp.get("limit") ?? "50"));
  const offset = (page - 1) * limit;

  // NI3 fix: use submission_files(id) + .length — not submission_files(count)
  let q = adminSupabase
    .from("submissions")
    .select(`id, human_id, first_name, last_name, address, address_city, status, is_new, beds, baths, condition, submitted_at, submission_files(id)`, { count: "exact" })
    .eq("draft", false)
    .order("submitted_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (status && status !== "All") q = q.eq("status", status);
  if (city && city !== "All") q = q.ilike("address_city", `%${city}%`);
  if (query) q = q.or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,address.ilike.%${query}%`);

  if (date) {
    // FV3 fix: normalize "Today"/"This Week"/"This Month" → "today"/"week"/"month"
    const dateKey = date.toLowerCase().replace("this ", "").trim();
    const cutoffs: Record<string, Date> = {
      today: (() => { const d = new Date(); d.setHours(0,0,0,0); return d; })(),
      week:  new Date(Date.now() - 7  * 86400000),
      month: new Date(Date.now() - 30 * 86400000),
    };
    if (cutoffs[dateKey]) q = q.gte("submitted_at", cutoffs[dateKey].toISOString());
  }

  const { data, count, error } = await q;
  if (error) return err("Failed to fetch submissions", 500);

  interface RawRow {
    id: string;
    human_id: string;
    first_name: string | null;
    last_name: string | null;
    address: string;
    address_city: string | null;
    status: string;
    is_new: boolean;
    beds: number | null;
    baths: number | null;
    condition: string | null;
    submitted_at: string;
    submission_files: { id: string }[];
  }

  const items: AdminSubmissionListItem[] = (data as RawRow[] ?? []).map(s => ({
    id:           s.id,
    human_id:     s.human_id,
    name:         `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || "Unknown",
    address:      s.address,
    address_city: s.address_city ?? undefined,
    status:       s.status as AdminSubmissionListItem["status"],
    is_new:       s.is_new,
    beds:         s.beds ?? undefined,
    baths:        s.baths ?? undefined,
    condition:    s.condition ?? undefined,
    submitted_at: s.submitted_at,
    file_count:   s.submission_files?.length ?? 0,
  }));

  return ok({ items, total: count ?? 0, page, limit });
}
