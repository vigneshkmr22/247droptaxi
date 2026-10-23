'use client';

import { useEffect, useRef, useState } from 'react';
import { cityGradient, cityIcon } from '@/lib/city-theme';
import { cityImageUrl, type CityImageInfo } from '@/lib/types';

/**
 * Cross-fading photo gallery for a city. Rotates every `interval` ms while it is on screen (not at all when the
 * visitor prefers reduced motion), and falls back to a generated banner when the city has no photos.
 */
export function CityGallery({ images, slug, alt = '', interval = 7500, children }: {
  images: CityImageInfo[];
  slug: string;
  alt?: string;
  interval?: number;
  children?: React.ReactNode;
}) {
  const [current, setCurrent] = useState(0);
  const host = useRef<HTMLDivElement>(null);
  const count = images.length;
  const index = current % Math.max(count, 1);

  useEffect(() => {
    const el = host.current;
    if (!el || count < 2 || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    let timer: ReturnType<typeof setInterval> | undefined;
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          timer ??= setInterval(() => setCurrent((i) => (i + 1) % count), interval);
        } else stop();
      },
      { threshold: 0.25 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      stop();
    };
  }, [count, interval]);

  return (
    <div className="city-gallery-host" ref={host}>
      <div className="gallery" style={{ background: cityGradient(slug) }}>
        {count ? (
          <>
            {images.map((f, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={f.fileName} className={`gallery-img${i === index ? ' active' : ''}`} src={cityImageUrl(f.fileName)}
                alt={i === index ? alt : ''} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" />
            ))}
            {count > 1 && (
              <span className="gallery-dots" aria-hidden="true">
                {images.map((f, i) => <i key={f.fileName} className={i === index ? 'on' : undefined} />)}
              </span>
            )}
          </>
        ) : (
          <span className="gallery-emoji" aria-hidden="true">{cityIcon(slug)}</span>
        )}
        {children}
      </div>
    </div>
  );
}
