import type { Metadata } from 'next';
import Link from 'next/link';
import { CityGallery } from '@/components/CityGallery';
import { JsonLd, pageMeta } from '@/lib/seo';
import { cityDetail } from '@/lib/catalog';
import { ApiError } from '@/lib/http';
import { siteUrl } from '@/lib/config';
import { getSettings } from '@/lib/settings';
import { inr, num } from '@/lib/format';
import type { CityDetail } from '@/lib/types';

async function load(slug: string): Promise<CityDetail | null> {
  try {
    return await cityDetail(slug);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const c = await load((await params).slug);
  if (!c) return pageMeta({ title: 'City not found | droptaxi.com', description: 'City not found.', path: '/major-cities', indexable: false });
  const description = `${c.description ?? `${c.name} in ${c.state}.`} One way drop taxi routes, fares and popular places in ${c.name}.`;
  return pageMeta({
    title: `${c.name} Drop Taxi - One Way Routes, Fares & Places to Visit | droptaxi.com`,
    description: description.length > 300 ? description.slice(0, 297) + '...' : description,
    path: `/city/${c.slug}`,
  });
}

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const c = await load((await params).slug);
  if (!c) {
    return (
      <div className="page-city">
        <h1>City not found</h1>
        <p>We could not find this city. <Link href="/major-cities">See all cities we serve</Link>.</p>
      </div>
    );
  }
  const { whatsappNumber } = await getSettings();
  const url = `${siteUrl}/city/${c.slug}`;
  const whatsapp = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi, I would like a quote for a one way drop taxi from ${c.name}.`)}`;
  const credited = c.images.filter((i) => i.credit);
  return (
    <div className="page-city">
      <JsonLd data={[
        {
          '@context': 'https://schema.org',
          '@type': 'TouristDestination',
          name: c.name,
          url,
          ...(c.description ? { description: c.description } : {}),
          containedInPlace: { '@type': 'AdministrativeArea', name: c.state },
          touristAttraction: c.popularSpots.map((name) => ({ '@type': 'TouristAttraction', name })),
        },
        {
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Home', item: siteUrl },
            { '@type': 'ListItem', position: 2, name: 'Cities we serve', item: `${siteUrl}/major-cities` },
            { '@type': 'ListItem', position: 3, name: c.name, item: url },
          ],
        },
      ]} />
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/">Home</Link> › <Link href="/major-cities">Cities we serve</Link> › {c.name}
      </nav>

      <div className="city-hero">
        <CityGallery images={c.images} slug={c.slug} alt={c.name}>
          <div className="city-hero-caption">
            <h1>{c.name}</h1>
            <span>{c.state}</span>
          </div>
        </CityGallery>
      </div>

      {c.description && <p className="lead">{c.description}</p>}
      {c.details && (
        <>
          <h2>About {c.name}</h2>
          <p>{c.details}</p>
        </>
      )}
      {c.popularSpots.length > 0 && (
        <>
          <h2>Popular places in {c.name}</h2>
          <ul className="spot-list">{c.popularSpots.map((s) => <li key={s}>{s}</li>)}</ul>
        </>
      )}

      <h2>One way drop taxi from {c.name}</h2>
      {c.routes.length ? (
        <>
          <p className="note">Choose a drop city to see the fare for every car.{c.routes.some((r) => r.estimated) && <span> Fares marked ~ are estimates until you open the route.</span>}</p>
          <ul className="route-links">
            {c.routes.map((r) => (
              <li key={r.slug}>
                <Link href={`/${r.slug}`}>
                  <span className="rl-name">{r.from} to {r.to} Drop Taxi</span>
                  <span className="rl-meta">{r.estimated ? '~' : ''}{num(r.distanceKm, 0)} km
                    {r.fromFare !== null && <> · from {r.estimated ? '~' : ''}{inr(r.fromFare, 0)}</>}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <>
          <p>We have not published routes from {c.name} yet. Message us your drop city and date and we will quote the trip.</p>
          <p><a className="btn" href={whatsapp}>Get a quote on WhatsApp</a></p>
        </>
      )}
      {credited.length > 0 && (
        <p className="note photo-credits">
          Photo credits:{' '}
          {credited.map((img, i) => (
            <span key={img.fileName}>
              {img.sourceUrl ? <a href={img.sourceUrl} target="_blank" rel="noopener noreferrer">{img.credit}</a> : img.credit}
              {i < credited.length - 1 && <span aria-hidden="true"> · </span>}
            </span>
          ))}
        </p>
      )}
      <p className="back-link"><Link href="/major-cities">← All cities we serve</Link></p>
    </div>
  );
}
