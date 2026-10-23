import { api } from '@/lib/http';
import { routePage } from '@/lib/trips';

export const GET = api<{ slug: string }>((_req, { slug }) => routePage(slug));
