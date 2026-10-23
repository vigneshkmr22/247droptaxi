import 'server-only';
import { ApiError } from './http';
import { query, one } from './db';
import { allVehicles, vehicleById } from './catalog';
import { deleteImage, storeImage } from './media';

export const MAX_CITY_IMAGES = 3;

// ---- vehicles

export async function vehicleRows() {
  return (await allVehicles()).map(toVehicleRow);
}

function toVehicleRow(v: Awaited<ReturnType<typeof allVehicles>>[number]) {
  return {
    id: v.id, name: v.name, seats: v.seats, ratePerKm: v.ratePerKm, driverAllowance: v.driverAllowance,
    roundTripRatePerKm: v.roundTripRatePerKm, roundTripDriverAllowance: v.roundTripDriverAllowance, image: v.imageFile, active: v.active,
  };
}

function num(v: unknown, label: string, min: number, max: number): number {
  const n = Number(v);
  if (v === null || v === '' || !Number.isFinite(n) || n < min || n > max) throw new ApiError(400, `${label} must be between ${min} and ${max}`);
  return Math.round(n * 100) / 100;
}

/** New one-way and round-trip rate per km and driver batta (rupees per day); they apply to new quotes immediately. */
export async function updateRates(id: number, body: Record<string, unknown>) {
  const v = await vehicleById(id);
  if (!v) throw new ApiError(404, 'Vehicle not found');
  await query(
    `UPDATE vehicle_types SET rate_per_km = $2, driver_allowance = $3, round_trip_rate_per_km = $4, round_trip_driver_allowance = $5 WHERE id = $1`,
    [id, num(body.ratePerKm, 'ratePerKm', 0.01, 9999.99), num(body.driverAllowance, 'driverAllowance', 0, 99999.99),
      num(body.roundTripRatePerKm, 'roundTripRatePerKm', 0.01, 9999.99), num(body.roundTripDriverAllowance, 'roundTripDriverAllowance', 0, 99999.99)],
  );
  return toVehicleRow((await vehicleById(id))!);
}

export async function setVehicleImage(id: number, file: unknown | null) {
  const v = await vehicleById(id);
  if (!v) throw new ApiError(404, 'Vehicle not found');
  const name = file === null ? null : await storeImage(file, 'vehicles');
  await query('UPDATE vehicle_types SET image_file = $2 WHERE id = $1', [id, name]);
  await deleteImage(v.imageFile);
  return toVehicleRow((await vehicleById(id))!);
}

// ---- cities

interface CityAdminRow { id: number; name: string; slug: string; state: string; description: string | null; details: string | null; popular_spots: string[] | null }

async function cityRow(c: CityAdminRow) {
  const images = await query<{ id: number; file_name: string; credit: string | null; source_url: string | null }>(
    'SELECT id, file_name, credit, source_url FROM city_images WHERE city_id = $1 ORDER BY sort_order, id', [c.id]);
  return {
    name: c.name, slug: c.slug, state: c.state, description: c.description, details: c.details,
    popularSpots: Array.isArray(c.popular_spots) ? c.popular_spots : [],
    images: images.map((i) => ({ id: Number(i.id), fileName: i.file_name, credit: i.credit, sourceUrl: i.source_url })),
  };
}

export async function adminCities() {
  const cities = await query<CityAdminRow>('SELECT id, name, slug, state, description, details, popular_spots FROM cities ORDER BY name');
  return Promise.all(cities.map(cityRow));
}

async function findCity(slug: string): Promise<CityAdminRow> {
  const c = await one<CityAdminRow>('SELECT id, name, slug, state, description, details, popular_spots FROM cities WHERE slug = $1', [slug]);
  if (!c) throw new ApiError(404, 'City not found');
  return c;
}

const blankToNull = (s: unknown): string | null => (typeof s === 'string' && s.trim() ? s.trim() : null);

export async function updateCity(slug: string, body: Record<string, unknown>) {
  const city = await findCity(slug);
  const description = blankToNull(body.description);
  const details = blankToNull(body.details);
  if (description && description.length > 500) throw new ApiError(400, 'description must be at most 500 characters');
  if (details && details.length > 2000) throw new ApiError(400, 'details must be at most 2000 characters');
  const spots = Array.isArray(body.popularSpots) ? body.popularSpots.map((s) => String(s).trim()).filter(Boolean) : [];
  if (spots.length > 8) throw new ApiError(400, 'popularSpots can have at most 8 entries');
  if (spots.some((s) => s.length > 80)) throw new ApiError(400, 'Each popular spot must be at most 80 characters');
  await query('UPDATE cities SET description = $2, details = $3, popular_spots = $4::jsonb WHERE id = $1', [city.id, description, details, JSON.stringify(spots)]);
  return cityRow(await findCity(slug));
}

function cleanText(s: unknown, max: number, label: string): string | null {
  if (typeof s !== 'string') return null;
  const cleaned = s.replace(/[\u0000-\u001f\u007f]/g, ' ').trim();
  if (cleaned.length > max) throw new ApiError(400, `${label} must be at most ${max} characters`);
  return cleaned || null;
}

export async function addCityImage(slug: string, file: unknown, credit: unknown, sourceUrl: unknown) {
  const city = await findCity(slug);
  const count = Number((await one<{ n: number }>('SELECT count(*)::int AS n FROM city_images WHERE city_id = $1', [city.id]))?.n ?? 0);
  if (count >= MAX_CITY_IMAGES) throw new ApiError(400, `A city can have at most ${MAX_CITY_IMAGES} images. Remove one first.`);
  const creditText = cleanText(credit, 300, 'Credit');
  const source = cleanText(sourceUrl, 300, 'Source link');
  if (source && !source.startsWith('https://')) throw new ApiError(400, 'Source link must start with https://');
  const name = await storeImage(file, 'cities');
  try {
    await query('INSERT INTO city_images (city_id, file_name, sort_order, credit, source_url) VALUES ($1, $2, $3, $4, $5)', [city.id, name, count, creditText, source]);
  } catch (e) {
    await deleteImage(name);
    throw e;
  }
  return cityRow(city);
}

export async function removeCityImage(slug: string, imageId: number) {
  const city = await findCity(slug);
  const image = await one<{ file_name: string }>('DELETE FROM city_images WHERE id = $1 AND city_id = $2 RETURNING file_name', [imageId, city.id]);
  if (!image) throw new ApiError(404, 'Image not found');
  await deleteImage(image.file_name);
  return cityRow(city);
}
