import { NextRequest } from "next/server";
import { ok, err } from "../../../../lib/api/response";

function buildStreetViewUrl(address: string): string {
  const params = new URLSearchParams({
    size: "600x340",
    location: address,
    key: process.env.GOOGLE_PLACES_API_KEY!,
    fov: "80",
    pitch: "0",
  });
  return `https://maps.googleapis.com/maps/api/streetview?${params.toString()}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");
  if (!address) return err("address required");
  return ok({ exteriorImageUrl: buildStreetViewUrl(address) });
}
