import { api, readJson, requireAdmin } from '@/lib/http';
import { updateCity } from '@/lib/admin-data';

export const PUT = api<{ slug: string }>(async (req, { slug }) => {
  requireAdmin(req);
  return updateCity(slug, await readJson(req));
});
