import Link from 'next/link';
import { CityGallery } from './CityGallery';
import type { City } from '@/lib/types';

/** A whole-card link to the city page, with the rotating photo gallery on top. */
export function CityCard({ city }: { city: City }) {
  return (
    <div className="city-card-host">
      <Link className="tile city-card" href={`/city/${city.slug}`} aria-label={`Details and drop taxi routes for ${city.name}`}>
        <div className="city-visual">
          <CityGallery images={city.images} slug={city.slug} alt={city.name}>
            <div className="city-caption">
              <strong>{city.name}</strong>
              <span>{city.state}</span>
            </div>
          </CityGallery>
        </div>
        <div className="city-body">
          {city.description && <p>{city.description}</p>}
          {city.popularSpots.length > 0 && (
            <>
              <h4>Popular spots</h4>
              <ul className="chips">{city.popularSpots.map((s) => <li key={s}>{s}</li>)}</ul>
            </>
          )}
          <span className="card-more">View details →</span>
        </div>
      </Link>
    </div>
  );
}
