/** Looks up the US county ("tax zone") for a street address via Google Geocoding.
 *  Returns null if the key is missing, the lookup fails, or no county component
 *  is found — callers should treat this as "unknown," not an error. */
export async function getCountyForAddress(address: string, city: string, zipCode: string): Promise<string | null> {
  const key = process.env.GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return null;

  const fullAddress = `${address}, ${city} ${zipCode}`.trim();
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullAddress)}&key=${key}`
    );
    const data = await res.json();
    if (data.status !== "OK" || !data.results?.length) return null;

    const components = data.results[0].address_components as Array<{ long_name: string; types: string[] }>;
    const county = components.find((c) => c.types.includes("administrative_area_level_2"));
    return county?.long_name ?? null;
  } catch {
    return null;
  }
}
