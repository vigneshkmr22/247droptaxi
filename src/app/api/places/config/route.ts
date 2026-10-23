import { api } from '@/lib/http';
import { googleEnabled } from '@/lib/google';
import { getSettings } from '@/lib/settings';

/** Lets the pages choose between Google search and the plain city dropdowns (staff can force the dropdowns). */
export const GET = api(async () => ({ enabled: googleEnabled() && (await getSettings()).placesEnabled }));
