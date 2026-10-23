import 'server-only';
import { ApiError } from './http';

// Server-side access to Google Places (New) and Routes. The key stays on the server: the browser only talks to
// our own endpoints. Everything is disabled when GOOGLE_MAPS_API_KEY is not set.

const PLACE_ID = /^[A-Za-z0-9_-]{10,200}$/; // place ids go into a URL path, so only their known alphabet is accepted
const SESSION = /^[A-Za-z0-9_-]{8,36}$/;
const PLACES = 'https://places.googleapis.com';
const ROUTES = 'https://routes.googleapis.com';
const TIMEOUT_MS = 8000;

export interface Suggestion { placeId: string; mainText: string; secondaryText: string }
export interface Place { placeId: string | null; name: string; address: string; lat: number; lng: number }
export interface Drive { distanceKm: number; durationMinutes: number }

const key = () => (process.env.GOOGLE_MAPS_API_KEY ?? '').trim();
export const googleEnabled = () => key() !== '';

function requireEnabled(): void {
  if (!googleEnabled()) throw new ApiError(503, 'Google Maps search is not configured');
}

/** Runs a Google call; any failure becomes a generic 502 so no Google detail reaches the client. */
async function call(url: string, init: RequestInit, what: string): Promise<any> {
  try {
    const res = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS), cache: 'no-store' });
    if (res.status === 400 || res.status === 404) throw new ApiError(400, 'That place could not be found');
    if (!res.ok) {
      console.warn(`Google ${what} request rejected: HTTP ${res.status}`);
      throw new ApiError(502, 'The maps service is unavailable. Please try again.');
    }
    return await res.json();
  } catch (e) {
    if (e instanceof ApiError) throw e;
    console.warn(`Google ${what} request failed:`, (e as Error).message);
    throw new ApiError(502, 'The maps service is unavailable. Please try again.');
  }
}

export async function autocomplete(input: string, sessionToken?: string | null): Promise<Suggestion[]> {
  requireEnabled();
  const body: Record<string, unknown> = { input, includedRegionCodes: ['in'], languageCode: 'en' };
  if (sessionToken && SESSION.test(sessionToken)) body.sessionToken = sessionToken;
  const json = await call(
    `${PLACES}/v1/places:autocomplete`,
    { method: 'POST', headers: { 'X-Goog-Api-Key': key(), 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
    'autocomplete',
  );
  const out: Suggestion[] = [];
  for (const s of json.suggestions ?? []) {
    const p = s.placePrediction;
    const id: string = p?.placeId ?? '';
    if (!PLACE_ID.test(id)) continue;
    out.push({
      placeId: id,
      mainText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
      secondaryText: p.structuredFormat?.secondaryText?.text ?? '',
    });
  }
  return out;
}

const placeCache = new Map<string, { place: Place; expires: number }>();

/** Name, address and coordinates of a place, cached briefly to save quota. */
export async function place(placeId: string, sessionToken?: string | null): Promise<Place> {
  requireEnabled();
  if (!placeId || !PLACE_ID.test(placeId)) throw new ApiError(400, 'Invalid place');
  const hit = placeCache.get(placeId);
  if (hit && hit.expires > Date.now()) return hit.place;
  const q = new URLSearchParams({ languageCode: 'en' });
  if (sessionToken && SESSION.test(sessionToken)) q.set('sessionToken', sessionToken);
  const json = await call(
    `${PLACES}/v1/places/${placeId}?${q}`,
    { headers: { 'X-Goog-Api-Key': key(), 'X-Goog-FieldMask': 'id,displayName,formattedAddress,location' } },
    'place details',
  );
  const loc = json.location;
  if (typeof loc?.latitude !== 'number' || typeof loc?.longitude !== 'number') throw new ApiError(400, 'That place has no location');
  const result: Place = {
    placeId, name: json.displayName?.text ?? '', address: json.formattedAddress ?? '', lat: loc.latitude, lng: loc.longitude,
  };
  if (placeCache.size >= 2000) placeCache.clear();
  placeCache.set(placeId, { place: result, expires: Date.now() + 3_600_000 });
  return result;
}

/** Road distance and travel time between two places. */
export async function drive(from: Place, to: Place): Promise<Drive> {
  requireEnabled();
  const point = (p: Place) => ({ location: { latLng: { latitude: p.lat, longitude: p.lng } } });
  const json = await call(
    `${ROUTES}/directions/v2:computeRoutes`,
    {
      method: 'POST',
      headers: { 'X-Goog-Api-Key': key(), 'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration', 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin: point(from), destination: point(to), travelMode: 'DRIVE', routingPreference: 'TRAFFIC_UNAWARE', units: 'METRIC' }),
    },
    'route',
  );
  const route = json.routes?.[0];
  if (typeof route?.distanceMeters !== 'number') throw new ApiError(422, 'No driving route was found between these places');
  const seconds = parseFloat(String(route.duration ?? '0s').replace(/s$/, '')) || 0;
  return { distanceKm: Math.round(route.distanceMeters / 100) / 10, durationMinutes: Math.max(1, Math.round(seconds / 60)) };
}
