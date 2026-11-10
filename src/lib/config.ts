// Fare settings that used to live in application.yml. Staff-editable switches are in the app_settings table.
export const fareConfig = {
  minKm: 130, // minimum billable km per one-way trip
  gstRate: 0.05, // applied only while the GST switch is on
  roundTripMinKmPerDay: 250,
  packageHourRate: 150, // rupees per package hour, on top of package km x vehicle rate
  packages: [
    { hours: 4, km: 40 },
    { hours: 8, km: 80 },
    { hours: 12, km: 120 },
  ],
  roadDistanceFactor: 1.25, // estimated road km = straight-line km x this
  averageSpeedKmph: 45,
};

export const CITY_MATCH_KM = 15;
export const MAX_KM = 2500;
export const MIN_KM = 0.5;
export const MAX_ROUND_TRIP_DAYS = 30;
export const PACKAGE_OFF_MESSAGE = 'Sorry for the inconvenience, for now this service is not available.';

const PRODUCTION_URL = 'https://www.247droptaxi.com';
const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() ?? '';
// In a production build a missing or localhost value would put localhost links in the sitemap, canonicals and emails
const useConfigured = configuredUrl && !(process.env.NODE_ENV === 'production' && /localhost|127\.0\.0\.1/.test(configuredUrl));
export const siteUrl = (useConfigured ? configuredUrl : process.env.NODE_ENV === 'production' ? PRODUCTION_URL : 'http://localhost:3000').replace(/\/$/, '');
export const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || '247droptaxii@gmail.com';
// The postal address, split so the structured data (JSON-LD) can use the parts
export const businessPostal = { street: '1/501, Loganathan Nagar', locality: 'Vandalur', region: 'Tamil Nadu', postalCode: '600048' };
export const businessAddress = process.env.NEXT_PUBLIC_BUSINESS_ADDRESS
  || `${businessPostal.street}, ${businessPostal.locality}, ${businessPostal.region} ${businessPostal.postalCode}`;
export const businessMapUrl = 'https://maps.app.goo.gl/bkS4ifR1kDgQtsZw8';
// The brand shown in titles, the footer and structured data, and the company that runs it
export const SITE_NAME = '247 Drop Taxi';
export const OPERATOR_NAME = 'Geodest Tours and Travels Group';
export const FOUNDED_YEAR = 2020;
