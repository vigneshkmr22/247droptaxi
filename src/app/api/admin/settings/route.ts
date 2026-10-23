import { api, ApiError, readJson, requireAdmin } from '@/lib/http';
import { fareConfig } from '@/lib/config';
import { getSettings, saveSetting } from '@/lib/settings';

async function view() {
  return { ...(await getSettings()), gstRate: fareConfig.gstRate };
}

export const GET = api(async (req) => {
  requireAdmin(req);
  return view();
});

/** Only the switches that are present are changed. */
export const PUT = api(async (req) => {
  requireAdmin(req);
  const b = await readJson<Record<string, unknown>>(req);
  for (const k of ['gstEnabled', 'packageEnabled', 'placesEnabled'] as const) {
    if (b[k] === undefined || b[k] === null) continue;
    if (typeof b[k] !== 'boolean') throw new ApiError(400, `${k} must be true or false`);
    await saveSetting(k, b[k] as boolean);
  }
  if (typeof b.supportPhone === 'string') {
    const phone = b.supportPhone.trim();
    if (!/^\+?[0-9][0-9 \-]{5,18}$/.test(phone)) throw new ApiError(400, 'Enter a valid phone number, for example +91 98765 43210.');
    await saveSetting('supportPhone', phone);
  }
  if (typeof b.whatsappNumber === 'string') {
    if (!/^[0-9]{8,15}$/.test(b.whatsappNumber)) {
      throw new ApiError(400, 'WhatsApp number must be digits only with the country code, for example 919876543210.');
    }
    await saveSetting('whatsappNumber', b.whatsappNumber);
  }
  return view();
});
