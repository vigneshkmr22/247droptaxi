import { pageMeta } from '@/lib/seo';
import { sharedFaqs } from '@/lib/catalog';

export const metadata = pageMeta({
  title: 'FAQ - One Way Drop Taxi | droptaxi.com',
  description: 'Answers to common questions about one way drop taxi fares, inclusions and cancellations.',
  path: '/faq',
});

export default async function FaqPage() {
  const faqs = await sharedFaqs();
  return (
    <div className="page-narrow">
      <h1>Frequently asked questions</h1>
      {faqs.map((f) => (
        <div key={f.question}>
          <h2>{f.question}</h2>
          <p>{f.answer}</p>
        </div>
      ))}
    </div>
  );
}
