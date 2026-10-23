import type { Metadata } from 'next';
import Link from 'next/link';
import { pageMeta } from '@/lib/seo';
import { SERVICES } from '@/lib/content';
import { getSettings } from '@/lib/settings';

const find = (type: string) => (Object.prototype.hasOwnProperty.call(SERVICES, type) ? SERVICES[type] : undefined);

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const { type } = await params;
  const info = find(type);
  return pageMeta({
    title: `${info?.name ?? 'Service'} | droptaxi.com`,
    description: info?.intro ?? 'Taxi services from droptaxi.com.',
    path: `/services/${type}`,
    indexable: !!info,
  });
}

export default async function ServicePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params;
  const info = find(type);
  const { whatsappNumber } = await getSettings();
  if (!info) {
    return (
      <div className="page-narrow">
        <h1>Service not found</h1>
        <p><Link href="/">Back to home</Link></p>
      </div>
    );
  }
  const whatsapp = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi, I would like a quote for a ${info.name.toLowerCase()}.`)}`;
  return (
    <div className="page-narrow">
      <h1>{info.name}</h1>
      <p>{info.intro}</p>
      <ul>{info.points.map((p) => <li key={p}>{p}</li>)}</ul>
      {info.online ? (
        <>
          <p><Link className="btn" href="/">Check a fare and book</Link></p>
          <p><Link href="/tariff-chart">See the tariff</Link></p>
        </>
      ) : (
        <>
          <p>Online booking is not available for this service yet. Contact us and we will quote your trip.</p>
          <p><a className="btn" href={whatsapp}>Ask on WhatsApp</a></p>
        </>
      )}
    </div>
  );
}
