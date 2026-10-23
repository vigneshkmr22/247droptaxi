import { api } from '@/lib/http';
import { tariff } from '@/lib/catalog';

export const GET = api(() => tariff());
