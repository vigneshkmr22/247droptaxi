import { api, readJson, requireAdmin } from '@/lib/http';
import { updateBooking } from '@/lib/bookings';

export const PUT = api<{ reference: string }>(async (req, { reference }) => {
  requireAdmin(req);
  return updateBooking(reference, await readJson(req));
});
