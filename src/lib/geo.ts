import { fareConfig, MAX_KM, MIN_KM } from './config';
import { ApiError } from './http';

export interface Point {
  latitude: number;
  longitude: number;
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(lat2 - lat1);
  const dLon = rad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Rejects trips that are too short or too long to price automatically. */
export function checkedKm(km: number): number {
  if (km < MIN_KM) throw new ApiError(400, 'Pickup and drop are too close together');
  if (km > MAX_KM) throw new ApiError(400, 'Trips this long are quoted by our team. Please contact us.');
  return km;
}

/** Road distance and travel time worked out from two locations, with no Google call. */
export function roughDistance(a: Point, b: Point): { km: number; minutes: number } {
  const straight = haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
  const km = checkedKm(Math.round(straight * fareConfig.roadDistanceFactor * 10) / 10);
  return { km, minutes: Math.max(1, Math.round((km / fareConfig.averageSpeedKmph) * 60)) };
}
