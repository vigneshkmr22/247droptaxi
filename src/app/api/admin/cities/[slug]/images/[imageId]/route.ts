import { api, requireAdmin } from '@/lib/http';
import { removeCityImage } from '@/lib/admin-data';

export const DELETE = api<{ slug: string; imageId: string }>(async (req, { slug, imageId }) => {
  requireAdmin(req);
  return removeCityImage(slug, Number(imageId));
});
