import 'server-only';
import { CITY_MATCH_KM, MAX_ROUND_TRIP_DAYS, PACKAGE_OFF_MESSAGE } from './config';
import { ApiError } from './http';
import { quote, quoteRoundTrip, quotePackage, findPackage } from './fare';
import { activeCityRows, activeVehicles, cheapestVehicleAndGst, citiesOfRouteSlug, routeBySlug, routeByCities, routeResponse, type CityRow } from './catalog';
import { checkedKm, haversineKm, roughDistance } from './geo';
import * as google from './google';
import { getSettings } from './settings';
import type { FareQuote, RouteResponse, TripKind, TripQuote, TripSpec } from './types';

interface Leg {
  km: number;
  minutes: number;
  mode: TripQuote['mode'];
  routeSlug: string | null;
  routeId: number | null;
}

/** What a booking stores about the trip. */
export interface TripInfo {
  routeId: number | null;
  fromLabel: string;
  toLabel: string;
  fromPlaceId: string | null;
  toPlaceId: string | null;
  distanceKm: number;
}

export interface Resolved {
  quote: TripQuote;
  trip: TripInfo;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const label = (p: google.Place): string => {
  const s = p.name.trim() ? p.name : p.address;
  return s.length > 200 ? s.slice(0, 200) : s;
};

/** A city standing in for a Google place: no place id, so nothing Google-specific is stored with it. */
const cityPlace = (c: CityRow): google.Place => ({ placeId: null, name: c.name, address: `${c.name}, ${c.state}`, lat: c.latitude, lng: c.longitude });

async function requirePackagesOn(): Promise<void> {
  if (!(await getSettings()).packageEnabled) throw new ApiError(503, PACKAGE_OFF_MESSAGE);
}

/** Calendar days a round trip spans (pickup date to return date, both counted); 1 for other trips. */
function tripDays(type: TripKind, spec: TripSpec): number {
  if (type !== 'ROUND_TRIP') return 1;
  if (!spec.pickupDate || !spec.returnDate || !DATE.test(spec.pickupDate) || !DATE.test(spec.returnDate)) {
    throw new ApiError(400, 'Choose the pickup and return dates');
  }
  const diff = Math.round((Date.parse(spec.returnDate) - Date.parse(spec.pickupDate)) / 86_400_000);
  if (Number.isNaN(diff)) throw new ApiError(400, 'Choose the pickup and return dates');
  if (diff < 0) throw new ApiError(400, 'The return date cannot be before the pickup date');
  if (diff + 1 > MAX_ROUND_TRIP_DAYS) {
    throw new ApiError(400, `Trips longer than ${MAX_ROUND_TRIP_DAYS} days are quoted by our team. Please contact us.`);
  }
  return diff + 1;
}

async function priced(from: google.Place, to: google.Place, type: TripKind, days: number, leg: Leg): Promise<Resolved> {
  const [vehicles, { gstRate }] = await Promise.all([activeVehicles(), cheapestVehicleAndGst()]);
  const quotes: FareQuote[] = vehicles.map((v) => (type === 'ROUND_TRIP' ? quoteRoundTrip(leg.km, days, v, gstRate) : quote(leg.km, v, gstRate)));
  return {
    quote: {
      mode: leg.mode, routeSlug: leg.routeSlug, from: from.name, to: to.name, fromAddress: from.address, toAddress: to.address,
      fromPlaceId: from.placeId, toPlaceId: to.placeId, distanceKm: leg.km, durationMinutes: leg.minutes, tollsExtra: true,
      quotes, tripType: type, days, packageHours: null, packageKm: null,
    },
    trip: { routeId: leg.routeId, fromLabel: label(from), toLabel: label(to), fromPlaceId: from.placeId, toPlaceId: to.placeId, distanceKm: leg.km },
  };
}

/** A local package needs only the pickup; the drop is the package itself. */
async function packageResolved(from: google.Place, spec: TripSpec): Promise<Resolved> {
  const pkg = spec.packageHours ? findPackage(Number(spec.packageHours)) : null;
  if (!pkg) throw new ApiError(400, 'Choose one of the available packages');
  const [vehicles, { gstRate }] = await Promise.all([activeVehicles(), cheapestVehicleAndGst()]);
  const to = `Local package: ${pkg.hours} hrs / ${pkg.km} km`;
  return {
    quote: {
      mode: 'DISTANCE', routeSlug: null, from: from.name, to, fromAddress: from.address, toAddress: to, fromPlaceId: from.placeId,
      toPlaceId: null, distanceKm: pkg.km, durationMinutes: pkg.hours * 60, tollsExtra: true,
      quotes: vehicles.map((v) => quotePackage(pkg.hours, pkg.km, v, gstRate)), tripType: 'PACKAGE', days: 1, packageHours: pkg.hours, packageKm: pkg.km,
    },
    trip: { routeId: null, fromLabel: label(from), toLabel: to, fromPlaceId: from.placeId, toPlaceId: null, distanceKm: pkg.km },
  };
}

/** The stored route between the cities nearest to each place, when both places are close to a city. */
async function storedRouteFor(from: google.Place, to: google.Place) {
  const all = await activeCityRows();
  const nearest = (p: google.Place): CityRow | null => {
    let best: CityRow | null = null;
    let bestKm = CITY_MATCH_KM;
    for (const c of all) {
      const km = haversineKm(p.lat, p.lng, c.latitude, c.longitude);
      if (km <= bestKm) { bestKm = km; best = c; }
    }
    return best;
  };
  const a = nearest(from);
  const b = nearest(to);
  if (!a || !b || a.slug === b.slug) return null;
  return routeByCities(a.slug, b.slug);
}

/** Prices a trip between two Google places. Both near cities with a stored route: that route; otherwise Google's road distance. */
export async function resolvePlaces(fromPlaceId: string, toPlaceId: string | null | undefined, sessionToken: string | null | undefined, spec: TripSpec): Promise<Resolved> {
  const type: TripKind = spec.tripType ?? 'ONE_WAY';
  if (type === 'PACKAGE') {
    await requirePackagesOn();
    return packageResolved(await google.place(fromPlaceId, sessionToken), spec);
  }
  const days = tripDays(type, spec);
  if (!toPlaceId?.trim()) throw new ApiError(400, 'Choose a drop place');
  const from = await google.place(fromPlaceId, sessionToken);
  const to = await google.place(toPlaceId, sessionToken);
  if (from.placeId === to.placeId) throw new ApiError(400, 'Pickup and drop must be different places');
  const stored = await storedRouteFor(from, to);
  let leg: Leg;
  if (stored) {
    leg = { km: Number(stored.distance_km), minutes: Number(stored.duration_minutes), mode: 'ROUTE', routeSlug: stored.slug, routeId: Number(stored.id) };
  } else {
    const d = await google.drive(from, to);
    leg = { km: checkedKm(d.distanceKm), minutes: d.durationMinutes, mode: 'DISTANCE', routeSlug: null, routeId: null };
  }
  return priced(from, to, type, days, leg);
}

const cityLegs = new Map<string, { leg: Leg; expires: number }>();

/**
 * Road distance between two cities with no stored route: Google's when the Routes API answers (cached for a day to
 * save quota), otherwise an estimate from the cities' locations. Only the estimate is flagged ESTIMATE.
 */
export async function estimateLeg(a: CityRow, b: CityRow): Promise<Leg> {
  const key = `${a.slug}>${b.slug}`;
  const hit = cityLegs.get(key);
  if (hit && hit.expires > Date.now()) return hit.leg;
  if (google.googleEnabled()) {
    let d: google.Drive | null = null;
    try {
      d = await google.drive(cityPlace(a), cityPlace(b));
    } catch {
      // Google refused or is down: fall back to the estimate below
    }
    if (d) {
      const leg: Leg = { km: checkedKm(d.distanceKm), minutes: d.durationMinutes, mode: 'DISTANCE', routeSlug: null, routeId: null };
      if (cityLegs.size > 5000) cityLegs.clear();
      cityLegs.set(key, { leg, expires: Date.now() + 24 * 3_600_000 });
      return leg;
    }
  }
  const r = roughDistance(a, b);
  return { km: r.km, minutes: r.minutes, mode: 'ESTIMATE', routeSlug: null, routeId: null };
}

async function activeCity(slug: string | null | undefined): Promise<CityRow> {
  const rows = await activeCityRows();
  const city = rows.find((c) => c.slug === (slug ?? ''));
  if (!city) throw new ApiError(400, 'Choose a city from the list');
  return city;
}

/** Prices a trip between two dropdown cities (or a package from one): a stored route's distance, otherwise road distance. */
export async function resolveCities(fromSlug: string, toSlug: string | null | undefined, spec: TripSpec): Promise<Resolved> {
  const type: TripKind = spec.tripType ?? 'ONE_WAY';
  const a = await activeCity(fromSlug);
  if (type === 'PACKAGE') {
    await requirePackagesOn();
    return packageResolved(cityPlace(a), spec);
  }
  const days = tripDays(type, spec);
  if (!toSlug?.trim()) throw new ApiError(400, 'Choose a drop city');
  const b = await activeCity(toSlug);
  if (a.slug === b.slug) throw new ApiError(400, 'Pickup and drop must be different cities');
  const stored = await routeByCities(a.slug, b.slug);
  const leg: Leg = stored
    ? { km: Number(stored.distance_km), minutes: Number(stored.duration_minutes), mode: 'ROUTE', routeSlug: stored.slug, routeId: Number(stored.id) }
    : await estimateLeg(a, b);
  return priced(cityPlace(a), cityPlace(b), type, days, leg);
}

/** Route page data. A pair with no stored route is priced from the two cities, like the booking dropdowns do. */
export async function routePage(slug: string): Promise<RouteResponse> {
  const stored = await routeBySlug(slug);
  if (stored) return routeResponse(stored);
  const pair = await citiesOfRouteSlug(slug);
  if (!pair) throw new ApiError(404, 'Route not found');
  const [{ gstRate }, vehicles, leg] = await Promise.all([cheapestVehicleAndGst(), activeVehicles(), estimateLeg(pair[0], pair[1])]);
  return {
    slug, from: pair[0].name, to: pair[1].name, distanceKm: leg.km, durationMinutes: leg.minutes, highway: null, tollPlazas: 0,
    summary: null, indexable: false, quotes: vehicles.map((v) => quote(leg.km, v, gstRate)), estimated: leg.mode === 'ESTIMATE',
  };
}

