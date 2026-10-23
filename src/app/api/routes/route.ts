import { api } from '@/lib/http';
import { indexableRoutes } from '@/lib/catalog';

export const GET = api(() => indexableRoutes());
