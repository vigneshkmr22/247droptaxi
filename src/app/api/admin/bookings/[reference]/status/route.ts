import { api, readJson, requireAdmin } from '@/lib/http';
import { setBookingStatus } from '@/lib/bookings';

export const PATCH = api<{ reference: string }>(async (req, { reference }) => {
  requireAdmin(req);
  const body = await readJson<{ status?: unknown }>(req);
  return setBookingStatus(reference, body.status);
});
