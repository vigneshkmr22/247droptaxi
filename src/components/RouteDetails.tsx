import Link from 'next/link';
import type { RouteText } from '@/lib/route-content';

/** Route-specific text, places to visit, FAQs (plain details elements, no script needed) and links to related pages. */
export function RouteDetails({ text, from, to, fromSlug, toSlug }: { text: RouteText; from: string; to: string; fromSlug: string; toSlug: string }) {
  return (
    <>
      <section className="route-about">
        <h2>About the {from} to {to} taxi</h2>
        {text.paragraphs.map((p) => <p key={p}>{p}</p>)}
        {text.spots.length > 0 && (
          <>
            <h3>Places to visit in {to}</h3>
            <ul>{text.spots.map((s) => <li key={s}>{s}</li>)}</ul>
          </>
        )}
      </section>
      <section className="route-faq">
        <h2>{from} to {to} taxi: frequently asked questions</h2>
        {text.faqs.map((f) => (
          <details key={f.question}>
            <summary>{f.question}</summary>
            <p>{f.answer}</p>
          </details>
        ))}
      </section>
      <p className="route-links">
        <Link href={`/${toSlug}-to-${fromSlug}-taxi`}>{to} to {from} taxi</Link> · <Link href={`/city/${fromSlug}`}>Taxi from {from}</Link> · <Link href={`/city/${toSlug}`}>Taxi from {to}</Link>
      </p>
    </>
  );
}
