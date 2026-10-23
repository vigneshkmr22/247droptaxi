import { api, ApiError } from '@/lib/http';
import { routeQuote } from '@/lib/catalog';

export const GET = api((req) => {
  const from = req.nextUrl.searchParams.get('from');
  const to = req.nextUrl.searchParams.get('to');
  if (!from || !to) throw new ApiError(400, 'from and to are required');
  return routeQuote(from, to);
});
