import 'server-only';
import { query } from './db';
import { clearCaches } from './cache';
import addedCityImages from '../../data/city_images_added.json';

// Bundled city photos added after launch (data/city_images_added.json). A photo is inserted when its file is not in
// city_images yet and the city has fewer than 3 photos; existing rows are never changed.
const INSERT = `INSERT INTO city_images (city_id, file_name, sort_order)
  SELECT c.id, x.file_name, COALESCE(x.sort_order, 0)
  FROM jsonb_to_recordset($1::jsonb) AS x(city_slug text, file_name text, sort_order int)
  JOIN cities c ON c.slug = x.city_slug
  WHERE NOT EXISTS (SELECT 1 FROM city_images i WHERE i.file_name = x.file_name)
    AND (SELECT count(*) FROM city_images i WHERE i.city_id = c.id) < 3`;

const LIST = JSON.stringify(addedCityImages);
// One marker row per photo (photo_added_<file name without extension>), so each photo is applied to a database exactly once
const MARKER_KEY = `'photo_added_' || split_part(x.file_name, '.', 1)`;

/** Used by the seed (the /admin setup button): adds any listed photo that is missing. Returns how many were added. */
export async function addBundledPhotos(): Promise<number> {
  const rows = await query(`${INSERT} RETURNING id`, [LIST]);
  if (rows.length) clearCaches();
  return rows.length;
}

let applied: Promise<void> | null = null;

/**
 * Applies the list with no admin action: the first city read on each server instance runs one statement that writes a
 * marker row in app_settings for every photo not seen before and inserts only those photos. A photo that already has
 * its marker is skipped, so one that staff remove later in /admin stays removed.
 */
export function addedPhotosReady(): Promise<void> {
  applied ??= query(
    `WITH x AS (
       SELECT * FROM jsonb_to_recordset($1::jsonb) AS x(city_slug text, file_name text, sort_order int)
     ), mark AS (
       INSERT INTO app_settings (setting_key, setting_value) SELECT ${MARKER_KEY}, 'done' FROM x
       ON CONFLICT (setting_key) DO NOTHING RETURNING setting_key
     )
     INSERT INTO city_images (city_id, file_name, sort_order)
     SELECT c.id, x.file_name, COALESCE(x.sort_order, 0)
     FROM x JOIN cities c ON c.slug = x.city_slug JOIN mark m ON m.setting_key = ${MARKER_KEY}
     WHERE NOT EXISTS (SELECT 1 FROM city_images i WHERE i.file_name = x.file_name)
       AND (SELECT count(*) FROM city_images i WHERE i.city_id = c.id) < 3
     RETURNING id`, [LIST])
    .then((rows) => { if (rows.length) clearCaches(); })
    .catch((e) => {
      applied = null; // e.g. tables not created yet: try again on a later request
      console.error('Could not add bundled city photos', e);
    });
  return applied;
}
