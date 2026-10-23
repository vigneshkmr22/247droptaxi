import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="page-narrow">
      <h1>Page not found</h1>
      <p>We could not find that page. <Link href="/">Back to home</Link> or <Link href="/major-cities">see the cities we serve</Link>.</p>
    </div>
  );
}
