import { api, requireAdmin } from '@/lib/http';
import { seedDatabase } from '@/lib/seed';
import { clearCaches } from '@/lib/cache';

/** One-time setup: creates the tables and loads the starting data into empty tables. Never overwrites existing rows. */
export const POST = api(async (req) => {
  requireAdmin(req);
  const report = await seedDatabase();
  clearCaches();
  return report;
});
