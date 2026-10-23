import { api } from '@/lib/http';
import { activeCities } from '@/lib/catalog';

export const GET = api(() => activeCities());
