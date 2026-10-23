import 'server-only';
import { siteUrl } from './config';

// Emails the owner when a booking arrives, through Resend (https://resend.com), a plain HTTPS call with no extra package.
// Set RESEND_API_KEY and BOOKING_ALERT_EMAIL (comma separated for several people) to switch it on. Without them
// nothing is sent. A failed email never fails the booking.

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
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const TRIP_LABEL: Record<string, string> = { ONE_WAY: 'One way', ROUND_TRIP: 'Round trip', PACKAGE: 'Package' };

export async function sendBookingAlert(b: BookingAlert): Promise<void> {
  const key = process.env.RESEND_API_KEY?.trim();
  const to = (process.env.BOOKING_ALERT_EMAIL ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (!key || to.length === 0) return;
  const from = process.env.BOOKING_ALERT_FROM?.trim() || 'droptaxi bookings <onboarding@resend.dev>';
  const trip = TRIP_LABEL[b.tripType] ?? b.tripType;
  const rows: [string, string][] = [
    ['Reference', b.reference],
    ['Trip', `${trip}: ${b.from} to ${b.to}`],
    ['Vehicle', b.vehicle],
    ['Total', `Rs. ${b.total.toLocaleString('en-IN')}`],
    ['Pickup', `${b.pickupDate} at ${b.pickupTime}`],
    ...(b.returnDate ? ([['Return date', b.returnDate]] as [string, string][]) : []),
    ...(b.packageHours ? ([['Package', `${b.packageHours} hours`]] as [string, string][]) : []),
    ['Customer', `${b.customerName}, ${b.mobile}${b.email ? `, ${b.email}` : ''}`],
    ['Passengers / bags', `${b.passengers} / ${b.luggage}`],
    ['Pickup address', b.pickupAddress],
    ...(b.notes ? ([['Notes', b.notes]] as [string, string][]) : []),
  ];
  const html =
    `<p><strong>New booking ${esc(b.reference)}</strong></p>` +
    `<table cellpadding="6" style="border-collapse:collapse">${rows.map(([k, v]) => `<tr><td style="color:#555">${esc(k)}</td><td><strong>${esc(v)}</strong></td></tr>`).join('')}</table>` +
    `<p><a href="${siteUrl}/admin">Open the admin page</a> to confirm it.</p>`;
  const text = rows.map(([k, v]) => `${k}: ${v}`).join('\n') + `\n\nAdmin: ${siteUrl}/admin`;

  try {
    const res = await fetch(process.env.RESEND_API_URL || 'https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to, subject: `New booking ${b.reference}: ${b.from} to ${b.to} (Rs. ${b.total.toLocaleString('en-IN')})`, html, text }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.warn(`Booking alert email rejected: HTTP ${res.status}`);
  } catch (e) {
    console.warn('Booking alert email failed:', (e as Error).message);
  }
}
