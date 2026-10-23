import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { RouteVehicles } from '@/components/RouteVehicles';
import { JsonLd, pageMeta } from '@/lib/seo';
import { routePage } from '@/lib/trips';
import { tariff } from '@/lib/catalog';
import { ApiError } from '@/lib/http';
import { siteUrl } from '@/lib/config';
import { formatDuration } from '@/lib/format';
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
  if (!r) return pageMeta({ title: 'Route not found | droptaxi.com', description: 'Route not found.', path: '/', indexable: false });
  return pageMeta({
    title: `${r.from} to ${r.to} One Way Drop Taxi - Fare, Distance & Booking | droptaxi.com`,
    description: `Book a one way drop taxi from ${r.from} to ${r.to}. Distance ${r.distanceKm} km, about ${formatDuration(r.durationMinutes)}. See fares for every car type.`,
    path: `/${r.slug}`,
    indexable: r.indexable,
  });
}

export default async function RoutePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [r, t] = await Promise.all([load(slug), tariff()]);
  if (!r) notFound();
  const prices = r.quotes.map((q) => q.total);
  const url = `${siteUrl}/${r.slug}`;
  return (
    <div className="page-narrow">
      <JsonLd data={[
        {
          '@context': 'https://schema.org',
          '@type': 'Service',
          name: `${r.from} to ${r.to} one way drop taxi`,
          serviceType: 'One way taxi',
          url,
          provider: { '@type': 'Organization', name: 'droptaxi.com', url: siteUrl },
          areaServed: [r.from, r.to],
          ...(prices.length ? { offers: { '@type': 'AggregateOffer', priceCurrency: 'INR', lowPrice: Math.min(...prices), highPrice: Math.max(...prices), offerCount: prices.length } } : {}),
        },
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
      {r.summary && <p>{r.summary}</p>}
      <ul className="facts">
        <li><strong>Distance</strong>{r.distanceKm} km</li>
        <li><strong>Travel time</strong>{formatDuration(r.durationMinutes)}</li>
        {r.highway && <li><strong>Highway</strong>{r.highway}</li>}
      </ul>
      <h2>Choose your vehicle: {r.from} to {r.to}</h2>
      <RouteVehicles route={r} gst={t.gstEnabled} />
      {r.estimated && (
        <p className="note city-note">Due to a problem in Google Maps, the kms may be higher. Please contact the office for the exact price range. Thank you.</p>
      )}
      <p className="note">Total includes driver batta{t.gstEnabled ? ' and GST' : ''}. Toll and permit charges are extra, paid as per actuals.</p>
      <p><Link href="/">Check another route</Link></p>
    </div>
  );
}
