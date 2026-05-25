import { NextRequest } from "next/server";
import { ok, err } from "../../../../lib/api/response";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) return err("lat and lng required");

  // Geoapify Static Maps — zoom 18, OSM bright style
  const imageUrl = `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=600&height=340&center=lonlat:${lng},${lat}&zoom=18&apiKey=${process.env.GEOAPIFY_API_KEY}`;

  return ok({ exteriorImageUrl: imageUrl });
}
