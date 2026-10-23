import 'server-only';
import { query } from './db';
import { SCHEMA_SQL } from './schema-sql';
import cities from '../../data/cities.json';
import vehicles from '../../data/vehicles.json';
import routes from '../../data/routes.json';
import cityImages from '../../data/city_images.json';
import faqs from '../../data/faqs.json';
import settings from '../../data/settings.json';

const LOADS: { table: string; rows: unknown[]; sql: string }[] = [
  {
    table: 'cities', rows: cities,
    sql: `INSERT INTO cities (id, name, slug, state, district, latitude, longitude, is_hub, is_active, description, popular_spots, details)
      SELECT id, name, slug, state, district, latitude, longitude, COALESCE(is_hub, false), COALESCE(is_active, true), description, popular_spots, details
      FROM jsonb_to_recordset($1::jsonb) AS x(id int, name text, slug text, state text, district text, latitude numeric, longitude numeric,
           is_hub boolean, is_active boolean, description text, popular_spots jsonb, details text)`,
  },
  {
    table: 'vehicle_types', rows: vehicles,
    sql: `INSERT INTO vehicle_types (id, name, seats, rate_per_km, driver_allowance, round_trip_rate_per_km, round_trip_driver_allowance, image_file, is_active)
      SELECT id, name, seats, rate_per_km, driver_allowance, round_trip_rate_per_km, round_trip_driver_allowance, image_file, is_active
      FROM jsonb_to_recordset($1::jsonb) AS x(id int, name text, seats int, rate_per_km numeric, driver_allowance numeric,
           round_trip_rate_per_km numeric, round_trip_driver_allowance numeric, image_file text, is_active boolean)`,
  },
  {
    table: 'routes', rows: routes,
    sql: `INSERT INTO routes (id, from_city_id, to_city_id, slug, distance_km, duration_minutes, highway, toll_plazas, toll_total, permit_fee, summary_text, is_indexable)
      SELECT id, from_city_id, to_city_id, slug, distance_km, duration_minutes, highway, COALESCE(toll_plazas, 0), COALESCE(toll_total, 0), COALESCE(permit_fee, 0), summary_text, COALESCE(is_indexable, false)
      FROM jsonb_to_recordset($1::jsonb) AS x(id int, from_city_id int, to_city_id int, slug text, distance_km numeric, duration_minutes int,
           highway text, toll_plazas int, toll_total numeric, permit_fee numeric, summary_text text, is_indexable boolean)`,
  },
  {
    table: 'city_images', rows: cityImages,
    sql: `INSERT INTO city_images (id, city_id, file_name, sort_order, credit, source_url)
      SELECT id, city_id, file_name, COALESCE(sort_order, 0), credit, source_url
      FROM jsonb_to_recordset($1::jsonb) AS x(id int, city_id int, file_name text, sort_order int, credit text, source_url text)`,
  },
  {
    table: 'route_faqs', rows: faqs,
    sql: `INSERT INTO route_faqs (id, route_id, question, answer, sort_order)
      SELECT id, route_id, question, answer, COALESCE(sort_order, 0)
      FROM jsonb_to_recordset($1::jsonb) AS x(id int, route_id int, question text, answer text, sort_order int)`,
  },
  {
    table: 'app_settings', rows: settings,
    sql: `INSERT INTO app_settings (setting_key, setting_value)
      SELECT key, value FROM jsonb_to_recordset($1::jsonb) AS x(key text, value text)`,
  },
];

/**
 * Creates any missing tables and fills the EMPTY ones with the starting data (cities, routes, vehicles, photos,
 * FAQs and settings). A table that already has rows is never touched, so running it again is harmless.
 */
export async function seedDatabase(): Promise<Record<string, string>> {
  const statements = SCHEMA_SQL.replace(/--.*$/gm, '').split(';').map((s) => s.trim()).filter(Boolean);
  for (const s of statements) await query(s);

  const report: Record<string, string> = {};
  for (const { table, rows, sql } of LOADS) {
    const n = Number((await query<{ n: number }>(`SELECT count(*)::int AS n FROM ${table}`))[0].n);
    if (n > 0) {
      report[table] = `kept ${n} existing rows`;
      continue;
    }
    await query(sql, [JSON.stringify(rows)]);
    report[table] = `loaded ${rows.length} rows`;
  }
  // rows were inserted with explicit ids, so move each sequence past the largest id
  for (const table of ['cities', 'vehicle_types', 'routes', 'city_images', 'route_faqs']) {
    await query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT max(id) FROM ${table}), 1))`);
  }
  return report;
}
