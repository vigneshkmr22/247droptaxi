import { api, requireAdmin } from '@/lib/http';
import { adminCities } from '@/lib/admin-data';

export const GET = api(async (req) => {
  requireAdmin(req);
  return adminCities();
});
