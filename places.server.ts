const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

function headers(extra: Record<string, string> = {}): Record<string, string> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !mapsKey) throw new Error("El buscador de direcciones no está disponible");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": mapsKey,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function ensureOk(res: Response): Promise<void> {
  if (res.ok) return;
  const body = await res.text();
  console.error(`Google Maps request failed [${res.status}]: ${body}`);
  throw new Error("No pudimos buscar direcciones en este momento");
}

export type AddressSuggestion = { placeId: string; primary: string; secondary: string };

/** Sugerencias de direcciones reales (Places API New), limitadas a Argentina. */
export async function suggestAddresses(input: string): Promise<AddressSuggestion[]> {
  const res = await fetch(`${GATEWAY_URL}/places/v1/places:autocomplete`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      input,
      includedRegionCodes: ["ar"],
      languageCode: "es",
      locationBias: {
        circle: { center: { latitude: -32.8908, longitude: -68.8272 }, radius: 50000 },
      },
    }),
  });
  await ensureOk(res);
  const json = (await res.json()) as {
    suggestions?: {
      placePrediction?: {
        placeId: string;
        structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } };
        text?: { text?: string };
      };
    }[];
  };
  return (json.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => Boolean(p?.placeId))
    .map((p) => ({
      placeId: p.placeId,
      primary: p.structuredFormat?.mainText?.text ?? p.text?.text ?? "",
      secondary: p.structuredFormat?.secondaryText?.text ?? "",
    }))
    .slice(0, 6);
}

export type PlaceDetail = { address: string; lat: number; lng: number };

/** Dirección formateada + coordenadas del lugar elegido. */
export async function placeDetails(placeId: string): Promise<PlaceDetail> {
  const res = await fetch(
    `${GATEWAY_URL}/places/v1/places/${encodeURIComponent(placeId)}?languageCode=es`,
    { headers: headers({ "X-Goog-FieldMask": "formattedAddress,location,shortFormattedAddress" }) },
  );
  await ensureOk(res);
  const json = (await res.json()) as {
    formattedAddress?: string;
    shortFormattedAddress?: string;
    location?: { latitude: number; longitude: number };
  };
  if (!json.location) throw new Error("No pudimos ubicar esa dirección");
  return {
    address: json.shortFormattedAddress ?? json.formattedAddress ?? "",
    lat: json.location.latitude,
    lng: json.location.longitude,
  };
}