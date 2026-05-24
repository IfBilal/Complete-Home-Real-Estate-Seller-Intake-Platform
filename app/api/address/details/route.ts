import { NextRequest } from "next/server";
import { ok, err } from "../../../../lib/api/response";
import type { PlaceDetails } from "../../../../lib/types";

interface AddressComponent {
  longText: string;
  shortText: string;
  types: string[];
}

interface PlaceDetailsResponse {
  formattedAddress?: string;
  addressComponents?: AddressComponent[];
  location?: { latitude?: number; longitude?: number };
}

export async function GET(request: NextRequest) {
  const placeId = new URL(request.url).searchParams.get("placeId");
  if (!placeId) return err("placeId required");

  const response = await fetch(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
    {
      headers: {
        "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
        "X-Goog-FieldMask": "formattedAddress,addressComponents,location",
      },
    }
  );

  if (!response.ok) {
    console.error("Place details error:", response.status);
    return err("Place details lookup failed", 502);
  }

  const place = (await response.json()) as PlaceDetailsResponse;

  const getComponent = (types: string[], preferLong = true) => {
    const comp = place.addressComponents?.find(c => c.types.some(t => types.includes(t)));
    return comp ? (preferLong ? comp.longText : comp.shortText) : "";
  };

  const details: PlaceDetails = {
    placeId,
    formattedAddress: place.formattedAddress ?? "",
    addressCity:  getComponent(["locality", "sublocality"]),
    addressState: getComponent(["administrative_area_level_1"], false),
    addressZip:   getComponent(["postal_code"]),
    lat: place.location?.latitude ?? 0,
    lng: place.location?.longitude ?? 0,
  };

  return ok(details);
}
