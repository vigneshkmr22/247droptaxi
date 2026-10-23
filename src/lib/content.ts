// Placeholder wording: replace with your reviewed policy and service text before launch.

export interface InfoPage {
  title: string;
  description: string;
  paragraphs: string[];
}

export const INFO_PAGES: Record<string, InfoPage> = {
  'about-us': {
    title: 'About us',
    description: 'About droptaxi.com, one way drop taxi service across Tamil Nadu, Bangalore and Pondicherry.',
    paragraphs: [
      'droptaxi.com offers one way drop taxis between cities in Tamil Nadu, Bangalore and Pondicherry, so you pay for the trip you take and not for the return.',
    ],
  },
  terms: {
    title: 'Terms and conditions',
    description: 'Terms and conditions for booking a one way drop taxi with droptaxi.com.',
    paragraphs: [
      'The fare shown at booking covers the billed distance and driver batta for the route and vehicle you choose.',
      'Waiting time, route changes and extra stops requested during the trip may be charged separately.',
    ],
  },
  cancellation: {
    title: 'Cancellation policy',
    description: 'How to cancel a one way drop taxi booking with droptaxi.com.',
    paragraphs: ['To cancel a booking, contact us with your booking reference as early as possible before the pickup time.'],
  },
  'refund-policy': {
    title: 'Refund policy',
    description: 'Refund policy for droptaxi.com bookings.',
    paragraphs: ['Refund eligibility depends on when the booking is cancelled. Contact us with your booking reference to check.'],
  },
};

export interface ServiceInfo {
  name: string;
  intro: string;
  points: string[];
  online: boolean;
}

export const SERVICES: Record<string, ServiceInfo> = {
  'drop-taxi': {
    name: 'One way drop taxi',
    intro: 'Travel from one city to another and pay only for the one way trip, with no charge for the return journey.',
    points: ['Fare shown before you book', 'Choose from sedan, SUV, MUV and Innova Crysta', 'Tolls and permit fees extra, as per actuals'],
    online: true,
  },
  'round-trip-taxi': {
    name: 'Round trip taxi',
    intro: 'Go to a city and come back with the same driver and vehicle.',
    points: ['Return date agreed at booking', 'Same vehicle for the whole trip'],
    online: false,
  },
  'package-trip': {
    name: 'Package trip',
    intro: 'A multi-day trip with a fixed number of days and a set distance allowance.',
    points: ['Plan sightseeing stops with your driver', 'Quoted for the days and distance you need'],
    online: false,
  },
  'local-trip': {
    name: 'Local trip',
    intro: 'A taxi within a city for a set number of hours.',
    points: ['Hourly use within the city', 'Quoted for the hours you need'],
    online: false,
  },
};

export const STATIC_PAGES = ['', 'tariff-chart', 'major-cities', 'faq', 'about-us', 'contact', 'terms', 'cancellation', 'refund-policy',
  'services/drop-taxi', 'services/round-trip-taxi', 'services/package-trip', 'services/local-trip'];
