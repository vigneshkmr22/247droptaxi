import 'server-only';
import { randomInt } from 'node:crypto';
import { after } from 'next/server';
import { sendBookingNotifications } from './notify';
import { ApiError } from './http';
import { query, one } from './db';
import { quote, findPackage } from './fare';
import { citiesOfRouteSlug, cheapestVehicleAndGst, routeBySlug, routeByCities, vehicleById } from './catalog';
import { resolveCities, resolvePlaces, type TripInfo } from './trips';
import { BOOKING_STATUSES, type BookingRequest, type BookingResponse, type TripKind } from './types';

const REF_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MOBILE = /^[6-9][0-9]{9}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const nonBlank = (s: unknown): s is string => typeof s === 'string' && s.trim() !== '';
const blankToNull = (s: unknown): string | null => (nonBlank(s) ? s.trim() : null);
const todayIst = (): string => new Date(Date.now() + 5.5 * 3_600_000).toISOString().slice(0, 10);

function bad(message: string): never {
  throw new ApiError(400, message);
}

/** Fields shared by a customer booking and a staff edit; throws a 400 with a readable message on the first problem. */
interface Common {
  customerName: string; mobile: string; email: string | null; pickupDate: string; pickupTime: string;
  passengers: number; luggage: number; pickupAddress: string; notes: string | null;
}

function validateCommon(b: Record<string, unknown>, opts: { futureOnly: boolean }): Common {
  const name = typeof b.customerName === 'string' ? b.customerName.trim() : '';
  if (!name || name.length > 100) bad('customerName must be filled in (up to 100 characters)');
  if (typeof b.mobile !== 'string' || !MOBILE.test(b.mobile)) bad('mobile must be a 10 digit Indian mobile number');
  const email = blankToNull(b.email);
  if (email && (email.length > 150 || !EMAIL.test(email))) bad('email must be a valid email address');
  if (typeof b.pickupDate !== 'string' || !DATE.test(b.pickupDate) || Number.isNaN(Date.parse(b.pickupDate))) bad('pickupDate must be a valid date');
  if (opts.futureOnly && b.pickupDate < todayIst()) bad('pickupDate must not be in the past');
  if (typeof b.pickupTime !== 'string' || !TIME.test(b.pickupTime)) bad('pickupTime must be a valid time');
  const passengers = Number(b.passengers);
  if (!Number.isInteger(passengers) || passengers < 1 || passengers > 12) bad('passengers must be between 1 and 12');
  const luggage = Number(b.luggage ?? 0);
  if (!Number.isInteger(luggage) || luggage < 0 || luggage > 20) bad('luggage must be between 0 and 20');
  const address = typeof b.pickupAddress === 'string' ? b.pickupAddress.trim() : '';
  if (!address || address.length > 300) bad('pickupAddress must be filled in (up to 300 characters)');
  const notes = blankToNull(b.notes);
  if (notes && notes.length > 500) bad('notes must be at most 500 characters');
  return { customerName: name, mobile: b.mobile as string, email, pickupDate: b.pickupDate as string, pickupTime: (b.pickupTime as string).slice(0, 5), passengers, luggage, pickupAddress: address, notes };
}

function newReference(): string {
  let s = 'DT';
  for (let i = 0; i < 8; i++) s += REF_CHARS[randomInt(REF_CHARS.length)];
  return s;
}

/** True when the request names Google places or dropdown cities rather than a stored route. */
export const usesPlaces = (r: Partial<BookingRequest>): boolean =>
  nonBlank(r.fromPlaceId) || nonBlank(r.toPlaceId) || nonBlank(r.fromCitySlug) || nonBlank(r.toCitySlug);

/** The total is always recomputed here; the client never supplies the price. */
export async function createBooking(req: BookingRequest, ip?: string): Promise<BookingResponse> {
  const type: TripKind = req.tripType ?? 'ONE_WAY';
  if (!['ONE_WAY', 'ROUND_TRIP', 'PACKAGE'].includes(type)) bad('Unknown trip type');
  let byRoute = nonBlank(req.routeSlug);
  const byPlaces = nonBlank(req.fromPlaceId) || nonBlank(req.toPlaceId);
  let byCities = nonBlank(req.fromCitySlug) || nonBlank(req.toCitySlug);
  let fromCity = req.fromCitySlug;
  let toCity = req.toCitySlug;
  if (Number(byRoute) + Number(byPlaces) + Number(byCities) !== 1) bad('Choose either a route, a pickup and drop place, or a pickup and drop city');
  if (byRoute && type !== 'ONE_WAY') bad('Round trips and packages are booked from a pickup place');
  const common = validateCommon(req as unknown as Record<string, unknown>, { futureOnly: true });
  if (typeof req.vehicleId !== 'number') bad('vehicleId is required');

  // a route page for a pair with no stored route (e.g. ambur-to-chennai-taxi) is booked as a city to city trip
  const storedRoute = byRoute ? await routeBySlug(req.routeSlug!) : null;
  if (byRoute && !storedRoute) {
    const pair = await citiesOfRouteSlug(req.routeSlug!);
    if (pair) { byRoute = false; byCities = true; fromCity = pair[0].slug; toCity = pair[1].slug; }
  }
  const pickup = byCities ? fromCity : req.fromPlaceId;
  const drop = byCities ? toCity : req.toPlaceId;
  if (!byRoute && type !== 'PACKAGE' && !(nonBlank(pickup) && nonBlank(drop))) bad('Choose both a pickup and a drop');
  if (type === 'PACKAGE' && (!nonBlank(pickup) || nonBlank(drop))) bad('A package needs a pickup only');

  const vehicle = await vehicleById(req.vehicleId);
  if (!vehicle || !vehicle.active) bad('Unknown vehicle');
  if (common.passengers > vehicle!.seats) bad(`This vehicle seats ${vehicle!.seats} passengers`);
  if (type === 'ROUND_TRIP' && (!req.returnDate || !DATE.test(req.returnDate) || req.returnDate < common.pickupDate)) bad('Choose a return date on or after the pickup date');

  let trip: TripInfo;
  let total: number;
  let packageKm: number | null = null;
  if (byRoute) {
    const { gstRate } = await cheapestVehicleAndGst();
    total = quote(Number(storedRoute!.distance_km), vehicle!, gstRate).total;
    trip = { routeId: Number(storedRoute!.id), fromLabel: storedRoute!.from_name, toLabel: storedRoute!.to_name, fromPlaceId: null, toPlaceId: null, distanceKm: Number(storedRoute!.distance_km), durationMinutes: Number(storedRoute!.duration_minutes) };
  } else {
    const spec = { tripType: type, pickupDate: common.pickupDate, returnDate: req.returnDate, packageHours: req.packageHours };
    const resolved = byCities ? await resolveCities(fromCity!, toCity, spec) : await resolvePlaces(req.fromPlaceId!, req.toPlaceId, null, spec);
    const q = resolved.quote.quotes.find((x) => x.vehicleId === vehicle!.id);
    if (!q) bad('Unknown vehicle');
    total = q!.total;
    trip = resolved.trip;
    packageKm = resolved.quote.packageKm;
  }

  for (let attempt = 0; attempt < 5; attempt++) {
    const ref = newReference();
    const rows = await query<{ reference: string; status: string }>(
      `INSERT INTO bookings (reference, trip_type, route_id, from_label, to_label, from_place_id, to_place_id, distance_km, vehicle_type_id,
         customer_name, mobile, email, pickup_date, pickup_time, return_date, package_hours, package_km, passengers, luggage, pickup_address, notes, total_amount)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
       ON CONFLICT (reference) DO NOTHING RETURNING reference, status`,
      [ref, type, trip.routeId, trip.fromLabel, trip.toLabel, trip.fromPlaceId, trip.toPlaceId, trip.distanceKm, vehicle!.id,
        common.customerName, common.mobile, common.email, common.pickupDate, common.pickupTime,
        type === 'ROUND_TRIP' ? req.returnDate : null, type === 'PACKAGE' ? req.packageHours : null, type === 'PACKAGE' ? packageKm : null,
        common.passengers, common.luggage, common.pickupAddress, common.notes, total],
    );
    if (rows[0]) {
      // email and WhatsApp the office and the customer after the response has gone out, so the customer never waits for it
      after(() => sendBookingNotifications({
        reference: rows[0].reference, tripType: type, from: trip.fromLabel, to: trip.toLabel, vehicle: vehicle!.name, total,
        customerName: common.customerName, mobile: common.mobile, email: common.email, pickupDate: common.pickupDate, pickupTime: common.pickupTime,
        returnDate: type === 'ROUND_TRIP' ? (req.returnDate ?? null) : null, packageHours: type === 'PACKAGE' ? (req.packageHours ?? null) : null,
        passengers: common.passengers, luggage: common.luggage, pickupAddress: common.pickupAddress, notes: common.notes,
        distanceKm: trip.distanceKm, durationMinutes: trip.durationMinutes ?? null, ip: ip ?? null,
        ratePerKm: type === 'ROUND_TRIP' ? vehicle!.roundTripRatePerKm : vehicle!.ratePerKm,
      }));
      return { reference: rows[0].reference, status: rows[0].status, from: trip.fromLabel, to: trip.toLabel, vehicle: vehicle!.name, total };
    }
  }
  throw new ApiError(500, 'Could not create the booking. Please try again.');
}

// ---------------------------------------------------------------- admin

export interface BookingRow {
  reference: string; status: string; tripType: TripKind; from: string; to: string; fromSlug: string | null; toSlug: string | null;
  vehicleId: number; vehicle: string; customerName: string; mobile: string; email: string | null; pickupDate: string; pickupTime: string;
  passengers: number; luggage: number; pickupAddress: string; notes: string | null; total: number; createdAt: string;
  returnDate: string | null; packageHours: number | null; packageKm: number | null;
}

const BOOKING_SELECT = `SELECT b.reference, b.status, b.trip_type, COALESCE(b.from_label, fc.name) AS from_label, COALESCE(b.to_label, tc.name) AS to_label,
  fc.slug AS from_slug, tc.slug AS to_slug, b.vehicle_type_id, v.name AS vehicle, b.customer_name, b.mobile, b.email,
  b.pickup_date::text AS pickup_date, substr(b.pickup_time::text, 1, 5) AS pickup_time, b.return_date::text AS return_date,
  b.package_hours, b.package_km, b.passengers, b.luggage, b.pickup_address, b.notes, b.total_amount::float8 AS total_amount,
  to_char(b.created_at, 'YYYY-MM-DD"T"HH24:MI:SS') AS created_at
  FROM bookings b JOIN vehicle_types v ON v.id = b.vehicle_type_id
  LEFT JOIN routes r ON r.id = b.route_id LEFT JOIN cities fc ON fc.id = r.from_city_id LEFT JOIN cities tc ON tc.id = r.to_city_id`;

function toRow(r: Record<string, any>): BookingRow {
  return {
    reference: r.reference, status: r.status, tripType: r.trip_type, from: r.from_label ?? '', to: r.to_label ?? '',
    fromSlug: r.from_slug, toSlug: r.to_slug, vehicleId: Number(r.vehicle_type_id), vehicle: r.vehicle, customerName: r.customer_name,
    mobile: r.mobile, email: r.email, pickupDate: r.pickup_date, pickupTime: r.pickup_time, passengers: Number(r.passengers),
    luggage: Number(r.luggage), pickupAddress: r.pickup_address, notes: r.notes, total: Number(r.total_amount), createdAt: r.created_at,
    returnDate: r.return_date, packageHours: r.package_hours == null ? null : Number(r.package_hours),
    packageKm: r.package_km == null ? null : Number(r.package_km),
  };
}

async function bookingByReference(reference: string): Promise<BookingRow> {
  const r = await one(`${BOOKING_SELECT} WHERE b.reference = $1`, [reference]);
  if (!r) throw new ApiError(404, 'Booking not found');
  return toRow(r);
}

/** Latest bookings first; `q` matches reference, name, mobile or email, `status` filters exactly. */
export async function searchBookings(q: string, status: string, max = 200): Promise<BookingRow[]> {
  if (status && !(BOOKING_STATUSES as readonly string[]).includes(status)) bad('Unknown status');
  const text = q.trim().slice(0, 100).toLowerCase().replace(/[\\%_]/g, (c) => `\\${c}`);
  const rows = await query(
    `${BOOKING_SELECT}
     WHERE ($1 = '' OR lower(b.reference) LIKE $2 OR lower(b.customer_name) LIKE $2 OR lower(b.mobile) LIKE $2 OR lower(COALESCE(b.email, '')) LIKE $2)
       AND ($3 = '' OR b.status = $3)
     ORDER BY b.created_at DESC, b.id DESC LIMIT ${Number(max)}`,
    [text, `%${text}%`, status],
  );
  return rows.map(toRow);
}

export async function setBookingStatus(reference: string, status: unknown): Promise<BookingRow> {
  if (typeof status !== 'string' || !(BOOKING_STATUSES as readonly string[]).includes(status)) bad('status must be one of ' + BOOKING_STATUSES.join(', '));
  const rows = await query('UPDATE bookings SET status = $2 WHERE reference = $1 RETURNING id', [reference, status]);
  if (!rows[0]) throw new ApiError(404, 'Booking not found');
  return bookingByReference(reference);
}

/** Staff edit: replaces every editable field including the total, which is entered by staff and not recomputed. */
export async function updateBooking(reference: string, u: Record<string, any>): Promise<BookingRow> {
  await bookingByReference(reference); // 404 first
  const hasFrom = nonBlank(u.fromSlug);
  const hasTo = nonBlank(u.toSlug);
  if (hasFrom !== hasTo) bad('Choose both a pickup and a drop city');
  const common = validateCommon(u, { futureOnly: false });
  const type = u.tripType as TripKind;
  if (!['ONE_WAY', 'ROUND_TRIP', 'PACKAGE'].includes(type)) bad('tripType is required');
  const vehicle = typeof u.vehicleId === 'number' ? await vehicleById(u.vehicleId) : null;
  if (!vehicle) bad('Unknown vehicle');
  if (common.passengers > vehicle!.seats) bad(`This vehicle seats ${vehicle!.seats} passengers`);
  const total = Number(u.total);
  if (!Number.isFinite(total) || total < 0 || total > 99_999_999.99) bad('total must be between 0 and 99999999.99');
  if (type === 'ROUND_TRIP' && (!u.returnDate || !DATE.test(u.returnDate) || u.returnDate < common.pickupDate)) {
    bad('A round trip needs a return date on or after the pickup date');
  }
  let pkg: { hours: number; km: number } | null = null;
  if (type === 'PACKAGE') {
    pkg = u.packageHours ? findPackage(Number(u.packageHours)) : null;
    if (!pkg) bad('Choose one of the available packages');
  }
  let route: Awaited<ReturnType<typeof routeByCities>> = null;
  if (hasFrom) {
    if (u.fromSlug === u.toSlug) bad('Choose different pickup and drop cities');
    route = await routeByCities(u.fromSlug, u.toSlug);
    if (!route) bad('No route exists between these cities');
  }
  await query(
    `UPDATE bookings SET
       route_id = COALESCE($2, route_id),
       from_label = COALESCE($3, from_label), to_label = COALESCE($4, to_label),
       from_place_id = CASE WHEN $2::int IS NULL THEN from_place_id ELSE NULL END,
       to_place_id = CASE WHEN $2::int IS NULL THEN to_place_id ELSE NULL END,
       distance_km = COALESCE($5, distance_km),
       trip_type = $6, vehicle_type_id = $7, customer_name = $8, mobile = $9, email = $10, pickup_date = $11, pickup_time = $12,
       return_date = $13, package_hours = $14, package_km = $15, passengers = $16, luggage = $17, pickup_address = $18, notes = $19, total_amount = $20
     WHERE reference = $1`,
    [reference, route ? route.id : null, route ? route.from_name : null, route ? route.to_name : null, route ? route.distance_km : null,
      type, vehicle!.id, common.customerName, common.mobile, common.email, common.pickupDate, common.pickupTime,
      type === 'ROUND_TRIP' ? u.returnDate : null, pkg ? pkg.hours : null, pkg ? pkg.km : null,
      common.passengers, common.luggage, common.pickupAddress, common.notes, total],
  );
  return bookingByReference(reference);
}

