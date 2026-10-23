import { api, clientIp, rateLimit } from '@/lib/http';
import { autocomplete } from '@/lib/google';

export const GET = api(async (req) => {
  const input = (req.nextUrl.searchParams.get('q') ?? '').trim();
  if (input.length < 3) return [];
  rateLimit(`ac:${clientIp(req)}`, 60, 60_000);
  return autocomplete(input.slice(0, 100), req.nextUrl.searchParams.get('session'));
});
