import { CityCard } from '@/components/CityCard';
import { pageMeta } from '@/lib/seo';
import { activeCities } from '@/lib/catalog';

export const metadata = pageMeta({
  title: 'Cities We Serve - One Way Drop Taxi | droptaxi.com',
  description: 'Cities we serve in Tamil Nadu, Bangalore and Pondicherry with popular places to visit and one way drop taxi routes.',
  path: '/major-cities',
});

export default async function CitiesPage() {
  // cities with routes first, then the rest alphabetically
  const cities = (await activeCities()).sort((a, b) => Number(b.hasRoutes) - Number(a.hasRoutes) || a.name.localeCompare(b.name));
  return (
    <div className="page-wide">
      <h1>Cities we serve</h1>
      <p>Cities across Tamil Nadu, Bangalore and Pondicherry, with the places most travellers visit. Select a city for details and routes.</p>
      <div className="grid cities-grid">
        {cities.map((c) => <CityCard key={c.slug} city={c} />)}
      </div>
    </div>
  );
}
