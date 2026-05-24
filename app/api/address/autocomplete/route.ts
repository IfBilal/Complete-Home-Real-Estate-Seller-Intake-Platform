import { NextRequest } from "next/server";
import { ok, err } from "../../../../lib/api/response";
import type { PlacesAutocompleteResult } from "../../../../lib/types";

interface PlacesPrediction {
  placePrediction?: {
    placeId?: string;
    text?: { text?: string };
    structuredFormat?: {
      mainText?: { text?: string };
      secondaryText?: { text?: string };
    };
  };
}

export async function GET(request: NextRequest) {
  const query = new URL(request.url).searchParams.get("q");
  const sessionToken = new URL(request.url).searchParams.get("session") ?? "";

  if (!query || query.length < 2) return err("Query too short");

  const response = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": process.env.GOOGLE_PLACES_API_KEY!,
    },
    body: JSON.stringify({
      input: query,
      sessionToken,
      includedPrimaryTypes: ["street_address", "premise"],
      includedRegionCodes: ["us"],
    }),
  });

  if (!response.ok) {
    console.error("Places autocomplete error:", response.status);
    return err("Address lookup failed", 502);
  }

  const raw = (await response.json()) as { suggestions?: PlacesPrediction[] };

  const results: PlacesAutocompleteResult[] = (raw.suggestions ?? []).map(s => ({
    placeId: s.placePrediction?.placeId ?? "",
    description: s.placePrediction?.text?.text ?? "",
    mainText: s.placePrediction?.structuredFormat?.mainText?.text ?? "",
    secondaryText: s.placePrediction?.structuredFormat?.secondaryText?.text ?? "",
  }));

  return ok(results);
}
