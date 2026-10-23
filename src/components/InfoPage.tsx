import { INFO_PAGES } from '@/lib/content';
import { pageMeta } from '@/lib/seo';

/** Metadata for one of the simple text pages (about-us, terms, cancellation, refund-policy). */
export function infoMeta(kind: string) {
  const page = INFO_PAGES[kind];
  return pageMeta({ title: `${page.title} | droptaxi.com`, description: page.description, path: `/${kind}` });
}

export function InfoPage({ kind }: { kind: string }) {
  const page = INFO_PAGES[kind];
  return (
    <div className="page-narrow">
      <h1>{page.title}</h1>
      {page.paragraphs.map((p) => <p key={p}>{p}</p>)}
    </div>
  );
}
