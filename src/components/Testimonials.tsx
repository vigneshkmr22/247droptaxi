import { OPERATOR_NAME, businessMapUrl } from '@/lib/config';
import { GOOGLE_REVIEWS } from '@/lib/reviews';

/** Home page section: real Google reviews, shown word for word, with a link to the full listing. */
export function Testimonials() {
  return (
    <section className="section reviews">
      <div className="wrap">
        <h2 className="section-title">What our customers say</h2>
        <p className="reviews-lead">Google reviews of {OPERATOR_NAME}, the company behind 247 Drop Taxi.</p>
        <div className="reviews-grid">
          {GOOGLE_REVIEWS.map((r) => (
            <figure className="review-card" key={r.name}>
              <div className="review-stars" role="img" aria-label={`${r.rating} out of 5 stars`}>{'★'.repeat(r.rating)}</div>
              <blockquote>{r.text}</blockquote>
              <figcaption>
                <span className="review-avatar" aria-hidden="true">{r.name.charAt(0).toUpperCase()}</span>
                <span><strong>{r.name}</strong><small>Google review</small></span>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className="reviews-more"><a className="btn" href={businessMapUrl} target="_blank" rel="noopener">See all reviews on Google</a></p>
      </div>
    </section>
  );
}
