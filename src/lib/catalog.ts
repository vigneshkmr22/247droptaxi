import 'server-only';
import { query, one } from './db';
import { cached } from './cache';
import { getSettings } from './settings';
import { fareConfig } from './config';
import { quote, type Vehicle } from './fare';
import { ApiError } from './http';
import type { City, CityDetail, CityImageInfo, Faq, RouteItem, RouteResponse, Tariff } from './types';
import { roughDistance } from './geo';

interface VehicleRow {
  id: number; name: string; seats: number; rate_per_km: number; driver_allowance: number;
  round_trip_rate_per_km: number; round_trip_driver_allowance: number; image_file: string | null; is_active: boolean;
}

const VEHICLE_COLS = `id, name, seats, rate_per_km::float8 AS rate_per_km, driver_allowance::float8 AS driver_allowance,
  round_trip_rate_per_km::float8 AS round_trip_rate_per_km, round_trip_driver_allowance::float8 AS round_trip_driver_allowance,
  image_file, is_active`;

export const toVehicle = (r: VehicleRow): Vehicle => ({
  id: Number(r.id), name: r.name, seats: Number(r.seats), ratePerKm: Number(r.rate_per_km),
  driverAllowance: Number(r.driver_allowance), roundTripRatePerKm: Number(r.round_trip_rate_per_km),
  roundTripDriverAllowance: Number(r.round_trip_driver_allowance), imageFile: r.image_file, active: r.is_active,
});

/** Active vehicles ordered by rate, so the first one gives the lowest total. */
export function activeVehicles(): Promise<Vehicle[]> {
  return cached('vehicles', async () =>
    (await query<VehicleRow>(`SELECT ${VEHICLE_COLS} FROM vehicle_types WHERE is_active ORDER BY rate_per_km, id`)).map(toVehicle));
}

export async function allVehicles(): Promise<Vehicle[]> {
  return (await query<VehicleRow>(`SELECT ${VEHICLE_COLS} FROM vehicle_types ORDER BY id`)).map(toVehicle);
}

export async function vehicleById(id: number): Promise<Vehicle | null> {
  const hit = (await activeVehicles()).find((v) => v.id === id);
  if (hit) return hit;
  const r = await one<VehicleRow>(`SELECT ${VEHICLE_COLS} FROM vehicle_types WHERE id = $1`, [id]);
  return r ? toVehicle(r) : null;
}

export interface CityRow {
  id: number; name: string; slug: string; state: string; latitude: number; longitude: number;
  description: string | null; details: string | null; popular_spots: string[] | null; is_active: boolean;
}
const CITY_COLS = `id, name, slug, state, latitude::float8 AS latitude, longitude::float8 AS longitude, description, details, popular_spots, is_active`;

export const activeCityRows = () => cached('cities', () => query<CityRow>(`SELECT ${CITY_COLS} FROM cities WHERE is_active ORDER BY name`));
export const cityRowBySlug = (slug: string) => one<CityRow>(`SELECT ${CITY_COLS} FROM cities WHERE slug = $1`, [slug]);

export interface RouteRow {
  id: number; slug: string; distance_km: number; duration_minutes: number; highway: string | null; toll_plazas: number;
  summary_text: string | null; is_indexable: boolean; from_slug: string; to_slug: string; from_name: string; to_name: string;
}
const ROUTE_SELECT = `SELECT r.id, r.slug, r.distance_km::float8 AS distance_km, r.duration_minutes, r.highway, r.toll_plazas,
  r.summary_text, r.is_indexable, fc.slug AS from_slug, tc.slug AS to_slug, fc.name AS from_name, tc.name AS to_name
  FROM routes r JOIN cities fc ON fc.id = r.from_city_id JOIN cities tc ON tc.id = r.to_city_id`;

export const routeBySlug = (slug: string) => one<RouteRow>(`${ROUTE_SELECT} WHERE r.slug = $1`, [slug]);
export const routeByCities = (from: string, to: string) =>
  one<RouteRow>(`${ROUTE_SELECT} WHERE fc.slug = $1 AND tc.slug = $2`, [from, to]);

async function imagesByCity(): Promise<Map<number, CityImageInfo[]>> {
  const rows = await query<{ city_id: number; file_name: string; credit: string | null; source_url: string | null }>(
    'SELECT city_id, file_name, credit, source_url FROM city_images ORDER BY city_id, sort_order, id',
  );
  const map = new Map<number, CityImageInfo[]>();
  for (const r of rows) {
    const list = map.get(Number(r.city_id)) ?? [];
    list.push({ fileName: r.file_name, credit: r.credit, sourceUrl: r.source_url });
    map.set(Number(r.city_id), list);
  }
  return map;
}

const spots = (c: CityRow): string[] => (Array.isArray(c.popular_spots) ? c.popular_spots : []);

/** Active cities for the dropdowns, city cards and sitemap. `hasRoutes` is true when the city is on any stored route. */
export async function activeCities(): Promise<City[]> {
  const [cities, images, withRoutes] = await Promise.all([
    activeCityRows(),
    imagesByCity(),
    query<{ slug: string }>(`SELECT DISTINCT c.slug FROM cities c JOIN routes r ON r.from_city_id = c.id OR r.to_city_id = c.id`),
  ]);
  const has = new Set(withRoutes.map((r) => r.slug));
  return cities.map((c) => ({
    name: c.name, slug: c.slug, state: c.state, description: c.description, popularSpots: spots(c),
    images: images.get(Number(c.id)) ?? [], hasRoutes: has.has(c.slug),
  }));
}

export async function cheapestVehicleAndGst() {
  const [vehicles, settings] = await Promise.all([activeVehicles(), getSettings()]);
  return { cheapest: vehicles[0] ?? null, gstRate: settings.gstEnabled ? fareConfig.gstRate : 0 };
}

/** Indexable routes only, each with the lowest total fare; feeds the home page and the sitemap. */
export async function indexableRoutes(): Promise<RouteItem[]> {
  const { cheapest, gstRate } = await cheapestVehicleAndGst();
  const rows = await query<RouteRow>(`${ROUTE_SELECT} WHERE r.is_indexable ORDER BY r.slug`);
  return rows.map((r) => ({
    slug: r.slug, from: r.from_name, to: r.to_name, distanceKm: Number(r.distance_km),
    fromFare: cheapest ? quote(Number(r.distance_km), cheapest, gstRate).total : null,
  }));
}

/** One city with its overview and a fare entry for every other active city (stored route, or a rough estimate). */
export async function cityDetail(slug: string): Promise<CityDetail> {
  const city = await cityRowBySlug(slug);
  if (!city || !city.is_active) throw new ApiError(404, 'City not found');
  const [{ cheapest, gstRate }, all, stored, images] = await Promise.all([
    cheapestVehicleAndGst(),
    activeCityRows(),
    query<RouteRow>(`${ROUTE_SELECT} WHERE fc.slug = $1 ORDER BY r.slug`, [slug]),
    query<{ file_name: string; credit: string | null; source_url: string | null }>(
      'SELECT file_name, credit, source_url FROM city_images WHERE city_id = $1 ORDER BY sort_order, id', [city.id]),
  ]);
  const byTo = new Map(stored.map((r) => [r.to_slug, r]));
  const routes: RouteItem[] = all
    .filter((o) => o.slug !== slug)
    .map((o) => {
      const r = byTo.get(o.slug);
      if (r) {
        return { slug: r.slug, from: r.from_name, to: r.to_name, distanceKm: Number(r.distance_km), estimated: false,
          fromFare: cheapest ? quote(Number(r.distance_km), cheapest, gstRate).total : null };
      }
      const km = roughDistance(city, o).km;
      return { slug: `${slug}-to-${o.slug}-taxi`, from: city.name, to: o.name, distanceKm: km, estimated: true,
        fromFare: cheapest ? quote(km, cheapest, gstRate).total : null };
    });
  const hasRoutes = routes.length > 0;
  return {
    name: city.name, slug: city.slug, state: city.state, description: city.description, details: city.details,
    popularSpots: spots(city), hasRoutes, routes,
    images: images.map((i) => ({ fileName: i.file_name, credit: i.credit, sourceUrl: i.source_url })),
  };
}

export async function routeResponse(r: RouteRow): Promise<RouteResponse> {
  const { gstRate } = await cheapestVehicleAndGst();
  const vehicles = await activeVehicles();
  return {
    slug: r.slug, from: r.from_name, to: r.to_name, distanceKm: Number(r.distance_km), durationMinutes: Number(r.duration_minutes),
    highway: r.highway, tollPlazas: Number(r.toll_plazas), summary: r.summary_text, indexable: r.is_indexable,
    quotes: vehicles.map((v) => quote(Number(r.distance_km), v, gstRate)), estimated: false,
  };
}

export async function routeQuote(from: string, to: string): Promise<RouteResponse> {
  const r = await routeByCities(from, to);
  if (!r) throw new ApiError(404, 'No route for these cities');
  return routeResponse(r);
}

/** The two active cities a slug such as ambur-to-chennai-taxi names. */
export async function citiesOfRouteSlug(slug: string): Promise<[CityRow, CityRow] | null> {
  if (!slug.endsWith('-taxi')) return null;
  const core = slug.slice(0, -'-taxi'.length);
  for (let i = core.indexOf('-to-'); i > 0; i = core.indexOf('-to-', i + 1)) {
    const [a, b] = await Promise.all([cityRowBySlug(core.slice(0, i)), cityRowBySlug(core.slice(i + 4))]);
    if (a?.is_active && b?.is_active && a.slug !== b.slug) return [a, b];
  }
  return null;
}

export async function tariff(): Promise<Tariff> {
  const [vehicles, settings] = await Promise.all([activeVehicles(), getSettings()]);
  return {
    minKm: fareConfig.minKm, roundTripMinKmPerDay: fareConfig.roundTripMinKmPerDay, gstEnabled: settings.gstEnabled,
    packageEnabled: settings.packageEnabled, gstRate: fareConfig.gstRate,
    vehicles: vehicles.map((v) => ({
      id: v.id, name: v.name, seats: v.seats, ratePerKm: v.ratePerKm, driverAllowance: v.driverAllowance,
      roundTripRatePerKm: v.roundTripRatePerKm, roundTripDriverAllowance: v.roundTripDriverAllowance, image: v.imageFile,
    })),
  };
}

export async function sharedFaqs(): Promise<Faq[]> {
  return query<Faq>('SELECT question, answer FROM route_faqs WHERE route_id IS NULL ORDER BY sort_order, id');
}

export async function contactInfo() {
  const s = await getSettings();
  return { phone: s.supportPhone, whatsapp: s.whatsappNumber };
}
