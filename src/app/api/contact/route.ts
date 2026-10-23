import { api } from '@/lib/http';
import { contactInfo } from '@/lib/catalog';

export const GET = api(() => contactInfo());
