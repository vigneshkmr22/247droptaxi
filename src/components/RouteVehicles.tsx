'use client';

import Link from 'next/link';
import { useState } from 'react';
import { inr, num } from '@/lib/format';
import { vehicleImageUrl, type RouteResponse } from '@/lib/types';

/** One card per vehicle with photo, fare, Show details and Book now; the split-up opens below the same card. */
export function RouteVehicles({ route: r, gst }: { route: RouteResponse; gst: boolean }) {
  const [open, setOpen] = useState<ReadonlySet<number>>(new Set());
  const toggle = (id: number) => {
    const next = new Set(open);
    if (!next.delete(id)) next.add(id);
    setOpen(next);
  };
  return (
    <div className="vehicle-list">
      {r.quotes.map((q) => {
        const isOpen = open.has(q.vehicleId);
        return (
          <div key={q.vehicleId} className={`vehicle-card${isOpen ? ' open' : ''}`}>
            <div className="vehicle-row">
              {q.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="vehicle-photo" src={vehicleImageUrl(q.image)} alt={q.vehicle} loading="lazy" />
              ) : (
                <span className="vehicle-photo vehicle-emoji" aria-hidden="true">{q.seats > 4 ? '🚐' : '🚗'}</span>
              )}
              <div className="vehicle-name"><strong>{q.vehicle}</strong><span className="note">{q.seats}+1 seats</span></div>
              <div className="vehicle-fare"><small>Estimated fare</small><span className="price">{inr(q.total, 0)}</span></div>
              <div className="vehicle-actions">
                <button type="button" className="vehicle-details-btn" aria-expanded={isOpen} aria-controls={`split-${q.vehicleId}`} onClick={() => toggle(q.vehicleId)}>
                  {isOpen ? 'Hide details' : 'Show details'}
                </button>
                <Link className="btn" href={{ pathname: '/book', query: { route: r.slug, vehicle: q.vehicleId } }}>Book now</Link>
              </div>
            </div>
            {isOpen && (
              <div className="vehicle-split" id={`split-${q.vehicleId}`}>
                <dl>
                  <div><dt>Distance charged</dt><dd>{num(q.billableKm, 0, 1)} km</dd></div>
                  <div><dt>Rate per km</dt><dd>{inr(q.ratePerKm, 2)}</dd></div>
                  <div><dt>Base charge</dt><dd>{inr(q.baseFare, 2)}</dd></div>
                  <div><dt>Driver batta</dt><dd>{inr(q.driverAllowance, 2)}</dd></div>
                  {gst && <div><dt>GST</dt><dd>{inr(q.gst, 2)}</dd></div>}
                  <div className="split-total"><dt>Estimated fare</dt><dd>{inr(q.total, 2)}</dd></div>
                </dl>
                <p className="split-note">Toll and permit charges are extra and paid as per actuals. The final bill may vary with waiting time and night charges.</p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
