import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RouteVehicles } from '@/components/RouteVehicles';
import { RouteDetails } from '@/components/RouteDetails';
import { buildRouteText } from '@/lib/route-content';
import { JsonLd, pageMeta } from '@/lib/seo';
import { routePage } from '@/lib/trips';
import { tariff, citiesOfRouteSlug } from '@/lib/catalog';
import { ApiError } from '@/lib/http';
import { siteUrl } from '@/lib/config';
import { formatDuration, inr } from '@/lib/format';
import type { RouteResponse } from '@/lib/types';

// Matches clean URLs such as /chennai-to-coimbatore-taxi; anything else is a 404
const ROUTE_SLUG = /^[a-z0-9-]+-to-[a-z0-9-]+-taxi$/;

async function load(slug: string): Promise<RouteResponse | null> {
  if (!ROUTE_SLUG.test(slug)) notFound();
  try {
    return await routePage(slug);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const r = await load(slug);
  if (!r) return pageMeta({ title: 'Route not found | 247 Drop Taxi', description: 'Route not found.', path: '/', indexable: false });
  return pageMeta({
    title: `${r.from} to ${r.to} Drop Taxi - One Way Cab Fare${r.quotes.length ? ` from ${inr(Math.min(...r.quotes.map((q) => q.total)))}` : ""} & Booking | 247 Drop Taxi`,
    description: `Book a ${r.from} to ${r.to} drop taxi or one way outstation cab. Distance ${r.distanceKm} km, about ${formatDuration(r.durationMinutes)}. See fares for every car type.`,
    path: `/${r.slug}`,
    indexable: r.indexable,
  });
}

export default async function RoutePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [r, t, pair] = await Promise.all([load(slug), tariff(), citiesOfRouteSlug(slug)]);
  if (!r) notFound();
  const text = pair ? buildRouteText({
    from: r.from, to: r.to, fromSlug: pair[0].slug, toSlug: pair[1].slug, distanceKm: r.distanceKm, durationMinutes: r.durationMinutes,
    highway: r.highway, tollPlazas: r.tollPlazas, quotes: r.quotes, gst: t.gstEnabled,
    fromDetails: pair[0].details, toDetails: pair[1].details, toSpots: Array.isArray(pair[1].popular_spots) ? pair[1].popular_spots : [],
  }) : null;
  const prices = r.quotes.map((q) => q.total);
  const url = `${siteUrl}/${r.slug}`;
  return (
    <>
    <div className="book-bg" aria-hidden="true" />
    <div className="page-narrow book-page">
      <JsonLd data={[
        {
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: `${r.from} to ${r.to} one way drop taxi`,
          serviceType: 'One way taxi',
          url,
          provider: { '@type': 'TaxiService', '@id': `${siteUrl}/#business`, name: '247 Drop Taxi', url: siteUrl },
          areaServed: [r.from, r.to],
          ...(prices.length ? { offers: { '@type': 'AggregateOffer', priceCurrency: 'INR', lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length } } : {}),
        },
        ...(text ? [{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: text.faqs.map((f) => ({ '@type': 'Question', name: f.question, acceptedAnswer: { '@type': 'Answer', text: f.answer } })),
        }] : []),
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
            { '@type': 'ListItem', position: 2, name: `${r.from} to ${r.to} taxi`, item: url },
          ],
        },
      ]} />
      <h1>{r.from} to {r.to} One Way Drop Taxi</h1>
      {r.summary && !/^placeholder/i.test(r.summary) && <p>{r.summary}</p>}
      <ul className="facts">
        <li><strong>Distance</strong>{r.distanceKm} km</li>
        <li><strong>Travel time</strong>{formatDuration(r.durationMinutes)}</li>
        {r.highway && <li><strong>Highway</strong>{r.highway}</li>}
      </ul>
      <h2>Choose your cab: {r.from} to {r.to}</h2>
      <RouteVehicles route={r} gst={t.gstEnabled} />
      {r.estimated && (
        <p className="note city-note">Due to a problem in Google Maps, the kms may be higher. Please contact the office for the exact price range. Thank you.</p>
      )}
      <p className="note">Total includes driver batta{t.gstEnabled ? ' and GST' : ''}. Toll and permit charges are extra, paid as per actuals.</p>
      {text && pair && <RouteDetails text={text} from={r.from} to={r.to} fromSlug={pair[0].slug} toSlug={pair[1].slug} />}
      <p><Link href="/">Check another route</Link></p>
    </div>
    </>
  );
}
