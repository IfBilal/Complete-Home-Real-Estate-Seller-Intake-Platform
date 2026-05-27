import { NextRequest } from "next/server";
import { ok, err } from "../../../../lib/api/response";
import type { PlacesAutocompleteResult } from "../../../../lib/types";

interface GeoapifyFeature {
  properties: {
    formatted?: string;
    address_line1?: string;
    city?: string;
    state?: string;
    state_code?: string;
    postcode?: string;
    lat?: number;
    lon?: number;
  };
  geometry?: { coordinates?: [number, number] };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query || query.length < 2) return err("Query too short");

  const params = new URLSearchParams({
    text:   query,
    apiKey: process.env.GEOAPIFY_API_KEY!,
    limit:  "5",
  });

  const response = await fetch(
    `https://api.geoapify.com/v1/geocode/autocomplete?${params}`
  );

  if (!response.ok) {
    console.error("Autocomplete error:", response.status);
    return err("Address lookup failed", 502);
  }

  const raw = (await response.json()) as { features?: GeoapifyFeature[] };

  const results: PlacesAutocompleteResult[] = (raw.features ?? []).map(f => {
    const p = f.properties;
    const lat = p.lat ?? f.geometry?.coordinates?.[1] ?? 0;
    const lng = p.lon ?? f.geometry?.coordinates?.[0] ?? 0;

    const details = {
      formattedAddress: p.formatted ?? "",
      addressCity:  p.city ?? "",
      addressState: p.state_code ?? p.state ?? "",
      addressZip:   p.postcode ?? "",
      lat,
      lng,
    };

    const placeId = Buffer.from(JSON.stringify(details)).toString("base64url");
    const parts   = (p.formatted ?? "").split(", ");
    const main    = parts[0] ?? p.formatted ?? "";
    const secondary = parts.slice(1).join(", ");

    return {
      placeId,
      description: p.formatted ?? "",
      mainText:    main,
      secondaryText: secondary,
    };
  });

  return ok(results);
}
