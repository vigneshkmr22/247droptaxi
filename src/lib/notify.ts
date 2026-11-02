import 'server-only';
import { siteUrl } from './config';
import { sendWhatsApp, waNumber, whatsappEnabled } from './whatsapp';

// Booking messages, sent after the response has gone out: an email to the office, an email to the customer (when they gave
// one) and WhatsApp to the office and the customer, all with the same "Confirmed Booking" details. Emails go through Resend
// (https://resend.com), a plain HTTPS call with no extra package; RESEND_API_KEY switches them on. WhatsApp is in whatsapp.ts.
// Every send is independent and a failure only logs: it never fails the booking.

export interface BookingAlert {
  reference: string;
  tripType: string;
  from: string;
  to: string;
  vehicle: string;
  total: number;
  customerName: string;
  mobile: string;
  email: string | null;
  pickupDate: string;
  pickupTime: string;
  returnDate: string | null;
  packageHours: number | null;
  passengers: number;
  luggage: number;
  pickupAddress: string;
  notes: string | null;
  distanceKm?: number | null;
  durationMinutes?: number | null;
  ratePerKm?: number | null;
  ip?: string | null;
}

const OFFICE_EMAIL = '247droptaxii@gmail.com';
const OFFICE_PHONE = '7200345635';
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const TRIP_LABEL: Record<string, string> = { ONE_WAY: 'One Way', ROUND_TRIP: 'Round Trip', PACKAGE: 'Package' };
const rupees = (n: number) => `₹ ${n.toLocaleString('en-IN')}`;

const dateTime = (d: string, t: string) => {
  const [y, m, day] = d.split('-');
  const h = Number(t.slice(0, 2));
  return `${m}/${day}/${y} ${String(h % 12 || 12).padStart(2, '0')}:${t.slice(3, 5)} ${h < 12 ? 'AM' : 'PM'}`;
};
const duration = (min: number) =>
  (min >= 60 ? `${Math.floor(min / 60)} hr${min >= 120 ? 's' : ''}${min % 60 ? ` ${min % 60} mins` : ''}` : `${min} mins`) + ' (Approx)';

/** The booking message as label/value rows, the single source for both emails. */
function details(b: BookingAlert): [string, string][] {
  const rows: [string, string][] = [
    ['Booking ID', b.reference],
    ['Name', b.customerName],
    ['Email ID', b.email ?? '-'],
    ['Phone', b.mobile],
    ['Pickup Location', b.from],
    ['Drop Location', b.to],
    ['Vehicle Type', b.vehicle.toUpperCase()],
    ['Journey Type', TRIP_LABEL[b.tripType] ?? b.tripType],
    ['Travel Date & Time', dateTime(b.pickupDate, b.pickupTime)],
  ];
  if (b.returnDate) rows.push(['Return Date', b.returnDate]);
  if (b.packageHours) rows.push(['Package', `${b.packageHours} hours`]);
  if (b.distanceKm) rows.push(['Trip Distance', `${b.distanceKm} KM`]);
  if (b.durationMinutes) rows.push(['Trip Duration', duration(b.durationMinutes)]);
  if (b.ratePerKm) rows.push(['Extra per KM', rupees(b.ratePerKm)]);
  rows.push(['Driver Allowance', 'INCLUDED'], ['Toll', 'EXTRA'], ['Total Trip Fare', `${rupees(b.total)} (Inclusive of all charges)`]);
  return rows;
}

const FOOT = 'For Customer Intimation: Toll Gate, Permit, Hill Station Charges Extra';

function render(b: BookingAlert, office: boolean, rowsIn?: [string, string][], title = 'Confirmed Booking'): { html: string; text: string } {
  const rows = rowsIn ?? details(b);
  const html =
    `<h2 style="margin:0 0 4px">${esc(title)}</h2><p style="margin:0 0 12px">${b.reference ? `Booking ID# <strong>${esc(b.reference)}</strong><br>` : ''}Thanks for Choosing 247 Drop Taxi</p>` +
    `<h3 style="margin:0 0 6px">Booking Details</h3>` +
    `<table cellpadding="4" style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="color:#555">${esc(k)}:</td><td><strong>${esc(v)}</strong></td></tr>`).join('')}</table>` +
    `<p>${FOOT}</p><p>For Question Contact: ${OFFICE_PHONE}<br><a href="${siteUrl}">www.247droptaxi.com</a></p>` +
    (office ? `<p style="color:#777">IP ADDRESS: ${esc(b.ip || '-')}<br>Passengers / bags: ${b.passengers} / ${b.luggage}<br>Pickup address: ${esc(b.pickupAddress)}${b.notes ? `<br>Notes: ${esc(b.notes)}` : ''}<br><a href="${siteUrl}/admin">Open the admin page</a></p>` : '');
  const text =
    `${title}\n${b.reference ? `Booking ID# ${b.reference}\n` : ''}Thanks for Choosing 247 Drop Taxi\n\nBooking Details\n` +
    rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n${FOOT}\n\nFor Question Contact: ${OFFICE_PHONE}\nwww.247droptaxi.com` +
    (office ? `\n\nIP ADDRESS: ${b.ip || '-'}\nPassengers / bags: ${b.passengers} / ${b.luggage}\nPickup address: ${b.pickupAddress}${b.notes ? `\nNotes: ${b.notes}` : ''}\nAdmin: ${siteUrl}/admin` : '');
  return { html, text };
}

async function sendEmail(to: string[], subject: string, html: string, text: string): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key || to.length === 0) return;
  const from = process.env.BOOKING_ALERT_FROM?.trim() || 'droptaxi bookings <onboarding@resend.dev>';
  try {
    const res = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject, html, text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.warn(`Booking email rejected: HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}`);
  } catch (e) {
    console.warn('Booking email failed:', (e as Error).message);
  }
}

/** WhatsApp template variables, in the order the template body uses them ({{1}} to {{13}}). */
function bookingParams(b: BookingAlert): string[] {
  return [
    b.reference, b.customerName, b.mobile, b.email ?? '-', b.from, b.to, b.vehicle.toUpperCase(), TRIP_LABEL[b.tripType] ?? b.tripType,
    dateTime(b.pickupDate, b.pickupTime), b.distanceKm ? `${b.distanceKm} KM` : '-', b.durationMinutes ? duration(b.durationMinutes) : '-',
    b.ratePerKm ? rupees(b.ratePerKm) : '-', rupees(b.total),
  ];
}

export async function sendBookingNotifications(b: BookingAlert): Promise<void> {
  const officeTo = (process.env.BOOKING_ALERT_EMAIL ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (officeTo.length === 0) officeTo.push(OFFICE_EMAIL);
  const sends: Promise<void>[] = [];

  const o = render(b, true);
  sends.push(sendEmail(officeTo, `New booking ${b.reference}: ${b.from} to ${b.to} (${rupees(b.total)})`, o.html, o.text));
  if (b.email) {
    const c = render(b, false);
    sends.push(sendEmail([b.email], `Confirmed Booking ${b.reference}: ${b.from} to ${b.to}`, c.html, c.text));
  }
  if (whatsappEnabled()) {
    const params = bookingParams(b);
    const office = waNumber(process.env.OFFICE_WHATSAPP?.trim() || OFFICE_PHONE);
    const customer = waNumber(b.mobile);
    if (office) sends.push(sendWhatsApp(office, params));
    if (customer && customer !== office) sends.push(sendWhatsApp(customer, params));
  }
  await Promise.allSettled(sends);
}

export interface EnquiryAlert {
  mobile: string;
  tripType: string;
  from: string;
  to: string;
  pickupDate: string;
  pickupTime: string;
  returnDate: string | null;
  packageHours: number | null;
  distanceKm: number | null;
  fares: { vehicle: string; total: number }[];
  ip: string | null;
}

/** "Booking Enquiry" email to the office when a customer taps Explore cabs, in the same layout as the booking email. */
export async function sendEnquiryNotification(e: EnquiryAlert): Promise<void> {
  const officeTo = (process.env.BOOKING_ALERT_EMAIL ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (officeTo.length === 0) officeTo.push(OFFICE_EMAIL);
  const rows: [string, string][] = [
    ['Phone', e.mobile],
    ['Pickup Location', e.from],
    ['Drop Location', e.to || '-'],
    ['Journey Type', TRIP_LABEL[e.tripType] ?? e.tripType],
    ['Travel Date & Time', dateTime(e.pickupDate, e.pickupTime)],
  ];
  if (e.returnDate) rows.push(['Return Date', e.returnDate]);
  if (e.packageHours) rows.push(['Package', `${e.packageHours} hours`]);
  if (e.distanceKm) rows.push(['Trip Distance', `${e.distanceKm} KM`]);
  for (const f of e.fares) rows.push([f.vehicle.toUpperCase(), rupees(f.total)]);
  rows.push(['Toll', 'EXTRA']);
  const stub = { reference: '' } as BookingAlert;
  const o = render(stub, false, rows, 'Booking Enquiry');
  await sendEmail(
    officeTo,
    `Booking enquiry ${e.mobile}: ${e.from} to ${e.to || '-'}`,
    `${o.html}<p style="color:#777">IP ADDRESS: ${esc(e.ip || '-')}</p>`,
    `${o.text}\nIP ADDRESS: ${e.ip || '-'}`,
  );
}
