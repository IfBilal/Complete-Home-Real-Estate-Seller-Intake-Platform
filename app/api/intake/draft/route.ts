import { NextRequest } from "next/server";
import { ok, err } from "../../../../lib/api/response";
import { adminSupabase } from "../../../../lib/supabase/admin";
import { sanitizeText } from "../../../../lib/api/sanitize";
import { z } from "zod";

const draftSchema = z.object({
  address:         z.string().min(5).max(500),
  addressCity:     z.string().max(100).optional().default(""),
  addressState:    z.string().max(50).optional().default(""),
  addressZip:      z.string().max(20).optional().default(""),
  addressLat:      z.number().optional(),
  addressLng:      z.number().optional(),
  sqft:            z.string().max(20).optional(),
  beds:            z.number().int().min(0).max(50).optional(),
  baths:           z.number().int().min(0).max(50).optional(),
  yearBuilt:       z.string().max(10).optional(),
  lotSize:         z.string().max(30).optional(),
  existingDraftId: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const body = await request.json().catch(() => null);
  const parsed = draftSchema.safeParse(body);
  if (!parsed.success) return err(`Validation failed: ${parsed.error.issues[0]?.message}`);

  const d = parsed.data;

  if (d.existingDraftId) {
    const { data: updated, error } = await adminSupabase
      .from("submissions")
      .update({
        address:       sanitizeText(d.address),
        address_city:  d.addressCity,
        address_state: d.addressState,
        address_zip:   d.addressZip,
        address_lat:   d.addressLat,
        address_lng:   d.addressLng,
        sqft:          d.sqft,
        beds:          d.beds,
        baths:         d.baths,
        year_built:    d.yearBuilt,
        lot_size:      d.lotSize,
      })
      .eq("id", d.existingDraftId)
      .eq("draft", true)
      .select("id, human_id")
      .single();

    if (error || !updated) return err("Draft not found or already submitted", 404);
    return ok({ submissionId: updated.id, humanId: updated.human_id });
  }

  const { data: draft, error } = await adminSupabase
    .from("submissions")
    .insert({
      address:       sanitizeText(d.address),
      address_city:  d.addressCity,
      address_state: d.addressState,
      address_zip:   d.addressZip,
      address_lat:   d.addressLat,
      address_lng:   d.addressLng,
      sqft:          d.sqft,
      beds:          d.beds,
      baths:         d.baths,
      year_built:    d.yearBuilt,
      lot_size:      d.lotSize,
      draft:         true,
      ip_address:    ip,
    })
    .select("id, human_id")
    .single();

  if (error || !draft) {
    console.error("Draft creation error:", error);
    return err("Failed to create draft", 500);
  }

  return ok({ submissionId: draft.id, humanId: draft.human_id }, 201);
}
