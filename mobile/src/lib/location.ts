import * as Location from 'expo-location';

/**
 * Best-effort approximate location — never throws, never blocks the caller.
 * Rounded to 3 decimal places (~110m) since only neighbourhood-level
 * precision is needed for nearby-listing search, not an exact address.
 */
export async function getApproxLocation(): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;

    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    return {
      latitude: Math.round(position.coords.latitude * 1000) / 1000,
      longitude: Math.round(position.coords.longitude * 1000) / 1000,
    };
  } catch {
    return null;
  }
}

/**
 * Same as getApproxLocation, plus best-guess neighbourhood/locality and city
 * names from reverse geocoding — for pre-filling the Area field and
 * suggesting which of our listed cities to post under. Both guesses are null
 * if geocoding fails or returns nothing usable; the caller should treat that
 * as "couldn't guess," not an error. cityGuess is deliberately just the raw
 * geocoded city/district name — matching it against our actual city list
 * (and doing nothing if there's no match) is the caller's job, so a village
 * or area we don't have seeded never gets a wrong city forced onto it.
 */
export async function getApproxLocationWithArea(): Promise<
  { latitude: number; longitude: number; areaGuess: string | null; cityGuess: string | null } | null
> {
  const location = await getApproxLocation();
  if (!location) return null;

  let areaGuess: string | null = null;
  let cityGuess: string | null = null;
  try {
    const results = await Location.reverseGeocodeAsync(location);
    const place = results[0];
    areaGuess = place?.district || place?.subregion || place?.name || null;
    cityGuess = place?.city || place?.subregion || null;
  } catch {
    // Reverse geocoding is a nice-to-have — location itself already succeeded.
  }

  return { ...location, areaGuess, cityGuess };
}
