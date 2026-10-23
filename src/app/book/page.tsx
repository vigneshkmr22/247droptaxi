import { BookingForm } from '@/components/BookingForm';
import { pageMeta } from '@/lib/seo';
import { tariff } from '@/lib/catalog';

export const metadata = pageMeta({
  title: 'Book a One Way Drop Taxi | droptaxi.com',
  description: 'Book your one way drop taxi online.',
  path: '/book',
  indexable: false,
});

export default async function BookPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = await searchParams;
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) if (typeof v === 'string') params[k] = v;
  const t = await tariff();
  return (
    <div className="page-narrow">
      <BookingForm params={params} gst={t.gstEnabled} />
    </div>
  );
}
