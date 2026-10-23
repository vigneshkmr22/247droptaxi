import { api } from '@/lib/http';
import { cityDetail } from '@/lib/catalog';

export const GET = api<{ slug: string }>((_req, { slug }) => cityDetail(slug));
