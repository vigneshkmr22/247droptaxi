import { api, requireAdmin } from '@/lib/http';
import { addCityImage } from '@/lib/admin-data';

export const POST = api<{ slug: string }>(async (req, { slug }) => {
  requireAdmin(req);
  const form = await req.formData();
  return addCityImage(slug, form.get('file'), form.get('credit'), form.get('sourceUrl'));
});
