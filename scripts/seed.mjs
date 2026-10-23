// Creates the tables and loads the starting data (cities, routes, vehicles, photos, FAQs, settings).
//   npm run seed          creates anything missing and fills empty tables
//   npm run seed:reset    drops everything first (this deletes bookings!)
// Uses DATABASE_URL (Neon / Vercel Postgres) when set, otherwise a local PGlite database in .data/.
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
loadEnvFile(join(root, '.env.local'));
const reset = process.argv.includes('--reset');

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

async function open() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (url) {
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(url);
    console.log('Using the database at DATABASE_URL');
    return { query: (text, params = []) => sql(text, params) };
  }
  const { PGlite } = await import('@electric-sql/pglite');
  const dir = join(root, '.data', 'pglite');
  mkdirSync(dir, { recursive: true });
  const db = new PGlite(dir);
  await db.waitReady;
  console.log('Using the local PGlite database in .data/pglite');
  return {
    query: async (text, params = []) => (await db.query(text, params)).rows,
    exec: (text) => db.exec(text),
  };
}

const read = (name) => JSON.parse(readFileSync(join(root, 'data', `${name}.json`), 'utf8'));

const db = await open();
// the schema has many statements: send them one at a time (the Neon HTTP driver takes one per call)
const runScript = async (text) => {
  if (db.exec) return db.exec(text);
  const statements = text.replace(/--.*$/gm, '').split(';').map((s) => s.trim()).filter(Boolean);
  for (const s of statements) await db.query(s);
};

if (reset) {
  console.log('Dropping existing tables...');
  for (const t of ['bookings', 'route_faqs', 'routes', 'city_images', 'vehicle_types', 'cities', 'app_settings']) {
    await db.query(`DROP TABLE IF EXISTS ${t} CASCADE`);
  }
}
await runScript(readFileSync(join(root, 'db', 'schema.sql'), 'utf8'));
console.log('Schema ready.');

const count = async (t) => Number((await db.query(`SELECT count(*)::int AS n FROM ${t}`))[0].n);
async function load(table, file, insert) {
  if ((await count(table)) > 0) return console.log(`${table}: already has data, skipped`);
  const rows = read(file);
  await db.query(insert, [JSON.stringify(rows)]);
  console.log(`${table}: loaded ${rows.length} rows`);
}

await load('cities', 'cities', `
  INSERT INTO cities (id, name, slug, state, district, latitude, longitude, is_hub, is_active, description, popular_spots, details)
  SELECT id, name, slug, state, district, latitude, longitude, COALESCE(is_hub, false), COALESCE(is_active, true), description, popular_spots, details
  FROM jsonb_to_recordset($1::jsonb) AS x(id int, name text, slug text, state text, district text, latitude numeric, longitude numeric,
       is_hub boolean, is_active boolean, description text, popular_spots jsonb, details text)`);
await load('vehicle_types', 'vehicles', `
  INSERT INTO vehicle_types (id, name, seats, rate_per_km, driver_allowance, round_trip_rate_per_km, round_trip_driver_allowance, image_file, is_active)
  SELECT id, name, seats, rate_per_km, driver_allowance, round_trip_rate_per_km, round_trip_driver_allowance, image_file, is_active
  FROM jsonb_to_recordset($1::jsonb) AS x(id int, name text, seats int, rate_per_km numeric, driver_allowance numeric,
       round_trip_rate_per_km numeric, round_trip_driver_allowance numeric, image_file text, is_active boolean)`);
await load('routes', 'routes', `
  INSERT INTO routes (id, from_city_id, to_city_id, slug, distance_km, duration_minutes, highway, toll_plazas, toll_total, permit_fee, summary_text, is_indexable)
  SELECT id, from_city_id, to_city_id, slug, distance_km, duration_minutes, highway, COALESCE(toll_plazas, 0), COALESCE(toll_total, 0), COALESCE(permit_fee, 0), summary_text, COALESCE(is_indexable, false)
  FROM jsonb_to_recordset($1::jsonb) AS x(id int, from_city_id int, to_city_id int, slug text, distance_km numeric, duration_minutes int,
       highway text, toll_plazas int, toll_total numeric, permit_fee numeric, summary_text text, is_indexable boolean)`);
await load('city_images', 'city_images', `
  INSERT INTO city_images (id, city_id, file_name, sort_order, credit, source_url)
  SELECT id, city_id, file_name, COALESCE(sort_order, 0), credit, source_url
  FROM jsonb_to_recordset($1::jsonb) AS x(id int, city_id int, file_name text, sort_order int, credit text, source_url text)`);
await load('route_faqs', 'faqs', `
  INSERT INTO route_faqs (id, route_id, question, answer, sort_order)
  SELECT id, route_id, question, answer, COALESCE(sort_order, 0)
  FROM jsonb_to_recordset($1::jsonb) AS x(id int, route_id int, question text, answer text, sort_order int)`);
await load('app_settings', 'settings', `
  INSERT INTO app_settings (setting_key, setting_value)
  SELECT key, value FROM jsonb_to_recordset($1::jsonb) AS x(key text, value text)`);

// rows were inserted with explicit ids, so move each sequence past the largest id
for (const [table, col] of [['cities', 'id'], ['vehicle_types', 'id'], ['routes', 'id'], ['city_images', 'id'], ['route_faqs', 'id']]) {
  await db.query(`SELECT setval(pg_get_serial_sequence('${table}', '${col}'), COALESCE((SELECT max(${col}) FROM ${table}), 1))`);
}
console.log('Done.');
process.exit(0);
