import { HomeClient } from '@/components/HomeClient';
import { JsonLd, pageMeta } from '@/lib/seo';
import { activeCities, indexableRoutes, tariff } from '@/lib/catalog';
import { fareConfig, siteUrl, supportEmail } from '@/lib/config';
import { googleEnabled } from '@/lib/google';
import { getSettings } from '@/lib/settings';

export const metadata = pageMeta({
  title: 'One Way Drop Taxi in Tamil Nadu, Bangalore & Pondicherry | droptaxi.com',
  description: 'Book one way drop taxis across Tamil Nadu, Bangalore and Pondicherry. See fares for every car type before you book.',
  path: '/',
});

export default async function HomePage() {
  const [cities, routes, t, settings] = await Promise.all([activeCities(), indexableRoutes(), tariff(), getSettings()]);
  return (
    <>
      <JsonLd data={[{
        '@context': 'https://schema.org',
        '@type': 'LocalBusiness',
        name: 'droptaxi.com',
        url: siteUrl,
        telephone: settings.supportPhone,
        email: supportEmail,
        areaServed: ['Tamil Nadu', 'Bangalore', 'Pondicherry'],
      }]} />
      <HomeClient cities={cities} routes={routes} tariff={t} packages={fareConfig.packages} placesConfigured={googleEnabled() && settings.placesEnabled} />
    </>
  );
}
