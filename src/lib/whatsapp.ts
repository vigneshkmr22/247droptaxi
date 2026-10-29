import 'server-only';

// WhatsApp booking messages through Meta's WhatsApp Cloud API (https://developers.facebook.com/docs/whatsapp/cloud-api).
// Needs WHATSAPP_TOKEN, WHATSAPP_PHONE_ID and WHATSAPP_TEMPLATE (an approved template whose body has the 13 variables in
// the order of `bookingParams` in notify.ts); without them nothing is sent. WHATSAPP_LANG defaults to en. A failed message
// never fails the booking.

export const whatsappEnabled = () =>
  !!(process.env.WHATSAPP_TOKEN?.trim() && process.env.WHATSAPP_PHONE_ID?.trim() && process.env.WHATSAPP_TEMPLATE?.trim());

/** 10 digit Indian mobile (or one already carrying 91) to the international digits WhatsApp wants. */
export const waNumber = (mobile: string): string | null => {
  const d = mobile.replace(/\D/g, '');
  if (/^[6-9]\d{9}$/.test(d)) return `91${d}`;
  return /^91[6-9]\d{9}$/.test(d) ? d : null;
};

/** Template variables cannot be empty or contain line breaks. */
const clean = (s: string) => s.replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim() || '-';

export async function sendWhatsApp(to: string, params: string[]): Promise<void> {
  if (!whatsappEnabled()) return;
  try {
    const res = await fetch(`https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_ID!.trim()}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN!.trim()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messaging_product: 'whatsapp', to, type: 'template',
        template: {
          name: process.env.WHATSAPP_TEMPLATE!.trim(), language: { code: process.env.WHATSAPP_LANG?.trim() || 'en' },
          components: [{ type: 'body', parameters: params.map((text) => ({ type: 'text', text: clean(text) })) }],
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) console.warn(`WhatsApp message to ${to.slice(0, 4)}… rejected: HTTP ${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}`);
  } catch (e) {
    console.warn('WhatsApp message failed:', (e as Error).message);
  }
}
