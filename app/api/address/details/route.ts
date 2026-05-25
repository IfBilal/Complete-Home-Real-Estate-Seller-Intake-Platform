import { NextRequest } from "next/server";
import { ok, err } from "../../../../lib/api/response";
import type { PlaceDetails } from "../../../../lib/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const placeId = searchParams.get("placeId");

  if (!placeId) return err("placeId required");

  try {
    const decoded = JSON.parse(Buffer.from(placeId, "base64url").toString("utf-8"));
    const details: PlaceDetails = {
      placeId,
      formattedAddress: decoded.formattedAddress ?? "",
      addressCity:  decoded.addressCity  ?? "",
      addressState: decoded.addressState ?? "",
      addressZip:   decoded.addressZip   ?? "",
      lat: decoded.lat ?? 0,
      lng: decoded.lng ?? 0,
    };
    return ok(details);
  } catch {
    return err("Invalid placeId", 400);
  }
}
