import { after } from 'next/server';
import { api, ApiError, clientIp, rateLimit, readJson } from '@/lib/http';
import { sendEnquiryNotification } from '@/lib/notify';

interface Body {
  name?: string; mobile?: string; tripType?: string; from?: string; to?: string; pickupDate?: string; pickupTime?: string;
  returnDate?: string; packageHours?: number; distanceKm?: number; fares?: { vehicle?: string; total?: number }[];
}

const text = (v: unknown, max = 150) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

export const POST = api(async (req) => {
  const ip = clientIp(req);
  rateLimit(`enquiry:${ip}`, 10, 60_000);
  const b = await readJson<Body>(req);
  const mobile = text(b.mobile, 10);
  if (!/^[6-9][0-9]{9}$/.test(mobile)) throw new ApiError(400, 'Please enter a valid 10 digit mobile number.');
  const tripType = ['ONE_WAY', 'ROUND_TRIP', 'PACKAGE'].includes(b.tripType ?? '') ? b.tripType! : 'ONE_WAY';
  const date = text(b.pickupDate, 10);
  const time = text(b.pickupTime, 5);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) throw new ApiError(400, 'Invalid pickup date or time.');
  const alert = {
    name: text(b.name, 100), mobile, tripType, from: text(b.from), to: text(b.to), pickupDate: date, pickupTime: time,
    returnDate: tripType === 'ROUND_TRIP' ? text(b.returnDate, 10) || null : null,
    packageHours: tripType === 'PACKAGE' && Number(b.packageHours) > 0 ? Number(b.packageHours) : null,
    distanceKm: Number(b.distanceKm) > 0 ? Number(b.distanceKm) : null,
    fares: (Array.isArray(b.fares) ? b.fares : []).slice(0, 10)
      .map((f) => ({ vehicle: text(f?.vehicle, 50), total: Number(f?.total) }))
      .filter((f) => f.vehicle && Number.isFinite(f.total)),
    ip,
  };
  after(() => sendEnquiryNotification(alert));
  return { ok: true };
}, 201);
