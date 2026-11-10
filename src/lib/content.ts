// About and service text. The terms, cancellation and refund wording is still general: replace it with your reviewed policy text.

export interface InfoPage {
  title: string;
  description: string;
  paragraphs: string[];
}

export const INFO_PAGES: Record<string, InfoPage> = {
  'about-us': {
    title: 'About us',
    description: '247 Drop Taxi is the one way drop taxi and outstation cab service of Geodest Tours and Travels Group, Vandalur, Chennai. Running since 2020 with 50+ cars.',
    paragraphs: [
      '247 Drop Taxi is the one way drop taxi and outstation cab service of Geodest Tours and Travels Group, based in Vandalur, Chennai. We have been on the road since 2020.',
      'A one way drop taxi means you pay only for the direction you travel. If you go from Chennai to Coimbatore, you pay for Chennai to Coimbatore, and not for the driver coming back empty. That makes an outstation cab far cheaper than a regular round trip booking when you are not returning the same day.',
      'We run a fleet of 50+ cars, from sedans for small families to SUVs and the Innova Crysta for larger groups and extra luggage, and we cover 200+ cities and towns across Tamil Nadu, Puducherry and Bangalore. Along with one way drops we take round trips and hourly local packages.',
      'The fare for every car type is shown before you book, and it already includes the driver batta. Tolls and state permit fees are extra and paid as per actuals. There is no advance payment to check a fare.',
      'You can book online at any hour, or call or WhatsApp us and we will arrange the cab for you. Our office is at 1/501, Loganathan Nagar, Vandalur, Tamil Nadu 600048.',
    ],
  },
  terms: {
    title: 'Terms and conditions',
    description: 'Terms and conditions for booking a one way drop taxi with 247 Drop Taxi.',
    paragraphs: [
      'The fare shown at booking covers the billed distance and driver batta for the route and vehicle you choose.',
      'Waiting time, route changes and extra stops requested during the trip may be charged separately.',
    ],
  },
  cancellation: {
    title: 'Cancellation policy',
    description: 'How to cancel a one way drop taxi booking with 247 Drop Taxi.',
    paragraphs: ['To cancel a booking, contact us with your booking reference as early as possible before the pickup time.'],
  },
  'refund-policy': {
    title: 'Refund policy',
    description: 'Refund policy for 247 Drop Taxi bookings.',
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
    intro: 'Book an outstation cab from one city to another and pay only for the one way trip, with no charge for the return journey.',
    points: ['One way cabs between 200+ cities and towns in Tamil Nadu, Puducherry and Bangalore', 'Fare shown before you book', 'Choose from sedan, SUV, MUV and Innova Crysta', 'Tolls and permit fees extra, as per actuals'],
    online: true,
  },
  'round-trip-taxi': {
    name: 'Round trip taxi',
    intro: 'An outstation round trip cab: go to a city and come back with the same driver and vehicle.',
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
    intro: 'A local cab within a city for a set number of hours.',
    points: ['Hourly use within the city', 'Quoted for the hours you need'],
    online: false,
  },
};

export const STATIC_PAGES = ['', 'tariff-chart', 'major-cities', 'faq', 'about-us', 'contact', 'terms', 'cancellation', 'refund-policy',
  'services/drop-taxi', 'services/round-trip-taxi', 'services/package-trip', 'services/local-trip'];
