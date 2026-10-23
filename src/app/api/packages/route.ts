import { api } from '@/lib/http';
import { fareConfig } from '@/lib/config';

export const GET = api(() => fareConfig.packages);
