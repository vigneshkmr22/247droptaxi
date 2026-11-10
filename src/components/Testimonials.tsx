'use client';

import { useEffect, useRef, useState } from 'react';
import { OPERATOR_NAME, businessMapUrl } from '@/lib/config';
import { GOOGLE_REVIEWS } from '@/lib/reviews';

const AUTO_MS = 5000;

/** Home page section: real Google reviews, shown word for word in a carousel, with a link to the full listing. */
export function Testimonials() {
  const track = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  /** Moves one card left or right; going past the last card returns to the first. */
  function move(dir: 1 | -1) {
    const el = track.current;
    const card = el?.querySelector<HTMLElement>('.review-card');
    if (!el || !card) return;
    const step = card.offsetWidth + 20; // card width plus the gap
    const atEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
    const atStart = el.scrollLeft <= 4;
    if (dir === 1 && atEnd) el.scrollTo({ left: 0, behavior: 'smooth' });
    else if (dir === -1 && atStart) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' });
    else el.scrollBy({ left: dir * step, behavior: 'smooth' });
  }

  // Slides on its own unless the visitor is hovering, touching or using the keyboard on it, or prefers reduced motion
  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => move(1), AUTO_MS);
    return () => window.clearInterval(id);
  }, [paused]);

  return (
    <section className="section reviews">
      <div className="wrap">
        <h2 className="section-title">What our customers say</h2>
        <p className="reviews-lead">Google reviews of {OPERATOR_NAME}, the company behind 247 Drop Taxi.</p>
        <div
          className="reviews-carousel"
          onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
          onTouchStart={() => setPaused(true)} onFocus={() => setPaused(true)} onBlur={() => setPaused(false)}
        >
          <button type="button" className="reviews-arrow prev" aria-label="Previous review" onClick={() => move(-1)}>‹</button>
          <div className="reviews-track" ref={track} tabIndex={0} role="region" aria-label="Customer reviews">
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
          <button type="button" className="reviews-arrow next" aria-label="Next review" onClick={() => move(1)}>›</button>
        </div>
        <p className="reviews-more"><a className="btn" href={businessMapUrl} target="_blank" rel="noopener">See all reviews on Google</a></p>
      </div>
    </section>
  );
}
