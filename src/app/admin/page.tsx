import { AdminPanel } from '@/components/AdminPanel';
import { pageMeta } from '@/lib/seo';
import { activeCities } from '@/lib/catalog';
import { fareConfig } from '@/lib/config';

export const metadata = pageMeta({ title: 'Admin | droptaxi.com', description: 'Staff admin.', path: '/admin', indexable: false });

export default async function AdminPage() {
  const cities = (await activeCities()).filter((c) => c.hasRoutes).map((c) => ({ slug: c.slug, name: c.name }));
  return (
    <div className="page-wide">
      <AdminPanel routeCities={cities} packages={fareConfig.packages} />
    </div>
  );
}
