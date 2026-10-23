import { api } from '@/lib/http';
import { sharedFaqs } from '@/lib/catalog';

export const GET = api(() => sharedFaqs());
