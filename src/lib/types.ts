// Shapes shared by the API routes and the pages (same JSON the old Spring backend returned).

export interface FareQuote {
  vehicleId: number;
  vehicle: string;
  seats: number;
  /** Stored file name or full URL of the car photo, or null when none was uploaded. */
  image: string | null;
  billableKm: number;
  ratePerKm: number;
  baseFare: number;
  driverAllowance: number;
  tolls: number;
  permitFee: number;
  gst: number;
  total: number;
}

export interface RouteResponse {
  slug: string;
  from: string;
  to: string;
  distanceKm: number;
  durationMinutes: number;
  highway: string | null;
  tollPlazas: number;
  summary: string | null;
  indexable: boolean;
  quotes: FareQuote[];
  /** True when there is no stored route and the distance was estimated. */
  estimated?: boolean;
}

export interface CityImageInfo {
  fileName: string;
  credit: string | null;
  sourceUrl: string | null;
}

export interface City {
  name: string;
  slug: string;
  state: string;
  description: string | null;
  popularSpots: string[];
  images: CityImageInfo[];
  hasRoutes: boolean;
}

export interface RouteItem {
  slug: string;
  from: string;
  to: string;
  distanceKm: number;
  fromFare: number | null;
  /** True when the distance (and so the fare) is a rough figure worked out from the map, not a stored route. */
  estimated?: boolean;
}

export interface CityDetail extends City {
  details: string | null;
  routes: RouteItem[];
}

export interface VehicleRate {
  id: number;
  name: string;
  seats: number;
  ratePerKm: number;
  driverAllowance: number;
  roundTripRatePerKm: number;
  roundTripDriverAllowance: number;
  image: string | null;
}

export interface Tariff {
  minKm: number;
  roundTripMinKmPerDay: number;
  gstEnabled: boolean;
  packageEnabled: boolean;
  gstRate: number;
  vehicles: VehicleRate[];
}

export interface Faq {
  question: string;
  answer: string;
}

export type TripKind = 'ONE_WAY' | 'ROUND_TRIP' | 'PACKAGE';

export interface TripPackage {
  hours: number;
  km: number;
}

export interface BookingRequest {
  routeSlug?: string;
  fromPlaceId?: string;
  toPlaceId?: string;
  fromCitySlug?: string;
  toCitySlug?: string;
  tripType?: TripKind;
  returnDate?: string;
  packageHours?: number;
  vehicleId: number;
  customerName: string;
  mobile: string;
  email: string;
  pickupDate: string;
  pickupTime: string;
  passengers: number;
  luggage: number;
  pickupAddress: string;
  notes: string;
}

export interface BookingResponse {
  reference: string;
  status: string;
  from: string;
  to: string;
  vehicle: string;
  total: number;
}

export interface PlaceSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

/** ROUTE: a stored route; DISTANCE: Google road distance; ESTIMATE: worked out from city locations. */
export interface TripQuote {
  mode: 'ROUTE' | 'DISTANCE' | 'ESTIMATE';
  routeSlug: string | null;
  from: string;
  to: string;
  fromAddress: string;
  toAddress: string;
  fromPlaceId: string | null;
  toPlaceId: string | null;
  distanceKm: number;
  durationMinutes: number;
  tollsExtra: boolean;
  quotes: FareQuote[];
  tripType: TripKind;
  days: number;
  packageHours: number | null;
  packageKm: number | null;
}

export interface TripSpec {
  tripType?: TripKind;
  pickupDate?: string;
  returnDate?: string;
  packageHours?: number;
}

export const BOOKING_STATUSES = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

/** Public URL of an uploaded photo: a bundled file name lives under /media, an uploaded one is a full URL. */
export function mediaUrl(kind: 'cities' | 'vehicles', fileName: string): string {
  return /^https?:\/\//.test(fileName) ? fileName : `/media/${kind}/${encodeURIComponent(fileName)}`;
}
export const cityImageUrl = (fileName: string) => mediaUrl('cities', fileName);
export const vehicleImageUrl = (fileName: string) => mediaUrl('vehicles', fileName);
