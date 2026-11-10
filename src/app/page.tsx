import { HomeClient } from '@/components/HomeClient';
import { JsonLd, pageMeta } from '@/lib/seo';
import { activeCities, indexableRoutes, tariff } from '@/lib/catalog';
import { FOUNDED_YEAR, OPERATOR_NAME, SITE_NAME, businessMapUrl, businessPostal, fareConfig, siteUrl, supportEmail } from '@/lib/config';
import { googleEnabled } from '@/lib/google';
import { getSettings } from '@/lib/settings';

export const metadata = pageMeta({
  title: 'Drop Taxi & Outstation Cabs - One Way Taxi in Tamil Nadu, Bangalore & Pondicherry | 247 Drop Taxi',
  description: 'Book a one way drop taxi or outstation cab across Tamil Nadu, Bangalore and Pondicherry. Pay only for one way, with the fare for every car type shown before you book. 50+ cars, 24x7.',
  path: '/',
});

export default async function HomePage() {
  const [cities, routes, t, settings] = await Promise.all([activeCities(), indexableRoutes(), tariff(), getSettings()]);
  return (
    <>
      <JsonLd data={[{
        '@context': 'https://schema.org',
        '@type': 'TaxiService',
        '@id': `${siteUrl}/#business`,
        name: SITE_NAME,
        legalName: OPERATOR_NAME,
        description: 'One way drop taxi and outstation cab service across Tamil Nadu, Puducherry and Bangalore.',
        url: siteUrl,
        logo: `${siteUrl}/logo-full.png`,
        image: `${siteUrl}/logo-full.png`,
        telephone: settings.supportPhone,
        email: supportEmail,
        foundingDate: String(FOUNDED_YEAR),
        address: {
          '@type': 'PostalAddress',
          streetAddress: businessPostal.street,
          addressLocality: businessPostal.locality,
          addressRegion: businessPostal.region,
          postalCode: businessPostal.postalCode,
          addressCountry: 'IN',
        },
        hasMap: businessMapUrl,
        openingHoursSpecification: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
          opens: '00:00',
          closes: '23:59',
        },
        areaServed: ['Tamil Nadu', 'Bangalore', 'Puducherry'],
      }]} />
      <HomeClient cities={cities} routes={routes} tariff={t} packages={fareConfig.packages} placesConfigured={googleEnabled() && settings.placesEnabled} />
    </>
  );
}
