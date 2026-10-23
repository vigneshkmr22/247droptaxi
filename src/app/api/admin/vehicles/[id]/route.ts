import { api, readJson, requireAdmin } from '@/lib/http';
import { updateRates } from '@/lib/admin-data';

export const PATCH = api<{ id: string }>(async (req, { id }) => {
  requireAdmin(req);
  return updateRates(Number(id), await readJson(req));
});
