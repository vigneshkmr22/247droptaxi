import type { Metadata } from 'next';

/** Title, description, robots and canonical for a page (the root layout sets metadataBase to the site URL). */
export function pageMeta(opts: { title: string; description: string; path: string; indexable?: boolean }): Metadata {
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: opts.path },
    robots: opts.indexable === false ? { index: false, follow: true } : { index: true, follow: true },
  };
}

/** JSON-LD structured data; "<" is escaped so the data cannot close the script tag. */
export function JsonLd({ data }: { data: object[] }) {
  return (
    <>
      {data.map((item, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(item).replace(/</g, '\u003c') }} />
      ))}
    </>
  );
}
