import { api, requireAdmin } from '@/lib/http';
import { vehicleRows } from '@/lib/admin-data';

export const GET = api(async (req) => {
  requireAdmin(req);
  return vehicleRows();
});
