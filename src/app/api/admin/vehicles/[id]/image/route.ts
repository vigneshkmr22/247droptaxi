import { api, requireAdmin } from '@/lib/http';
import { setVehicleImage } from '@/lib/admin-data';

export const POST = api<{ id: string }>(async (req, { id }) => {
  requireAdmin(req);
  const form = await req.formData();
  return setVehicleImage(Number(id), form.get('file'));
});

export const DELETE = api<{ id: string }>(async (req, { id }) => {
  requireAdmin(req);
  return setVehicleImage(Number(id), null);
});
