// Route page text built from real route data (no server imports, so it is safe anywhere). Wording varies with the
// distance and with what is known about the route, so pages are not word-for-word copies of each other.
import { formatDuration, inr } from './format';
import type { Faq, FareQuote } from './types';

export interface RouteTextInput {
  from: string;
  to: string;
  fromSlug: string;
  toSlug: string;
  distanceKm: number;
  durationMinutes: number;
  highway: string | null;
  tollPlazas: number;
  quotes: FareQuote[];
  gst: boolean;
  fromDetails: string | null;
  toDetails: string | null;
  toSpots: string[];
}

export interface RouteText {
  paragraphs: string[];
  spots: string[];
  faqs: Faq[];
}

const list = (items: string[]) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

export function buildRouteText(i: RouteTextInput): RouteText {
  const { from, to, distanceKm: km } = i;
  const time = formatDuration(i.durationMinutes);
  const fares = i.quotes.map((q) => q.total).filter((n) => n > 0);
  const low = fares.length ? Math.min(...fares) : 0;
  const high = fares.length ? Math.max(...fares) : 0;
  const range = !low ? '' : low === high ? inr(low) : `${inr(low)} to ${inr(high)}`;
  const cars = list(i.quotes.map((q) => `${q.vehicle} (${q.seats} seater)`));
  const kind = km < 150 ? 'short' : km < 350 ? 'medium' : 'long';

  const paragraphs: string[] = [];
  paragraphs.push(
    kind === 'short'
      ? `${from} to ${to} is a short drive of about ${km} km, which takes around ${time} depending on traffic. A one way drop taxi suits this trip when you want a door to door ride without arranging a return.`
      : kind === 'medium'
        ? `The road from ${from} to ${to} covers about ${km} km and usually takes ${time}. With a one way drop taxi you pay only for the ${from} to ${to} direction, and the driver returns on their own.`
        : `${from} to ${to} is a long trip of about ${km} km, around ${time} on the road. For a drive this length a one way drop taxi saves you from paying for the driver's empty return, and you can plan a comfortable break on the way.`,
  );
  if (i.highway) {
    paragraphs.push(
      `The usual route follows ${i.highway}${i.tollPlazas > 0 ? ` and passes about ${i.tollPlazas} toll plaza${i.tollPlazas === 1 ? '' : 's'}` : ''}. Toll and permit charges are not part of the fare and are paid as per actuals.`,
    );
  } else {
    paragraphs.push(`Toll and permit charges, where they apply on the way, are not part of the fare and are paid as per actuals. The distance shown is the road distance for the usual route.`);
  }
  if (range) {
    paragraphs.push(`One way fares from ${from} to ${to} run from ${range}, depending on the car you choose${i.gst ? ', and include driver batta and GST' : ' and include driver batta'}. The exact total for each car is shown above before you book.`);
  }
  if (i.fromDetails) paragraphs.push(`About ${from}: ${i.fromDetails}`);
  if (i.toDetails) paragraphs.push(`About ${to}: ${i.toDetails}`);

  const faqs: Faq[] = [
    { question: `What is the distance from ${from} to ${to}?`, answer: `The road distance from ${from} to ${to} is about ${km} km.` },
    { question: `How long does it take to travel from ${from} to ${to} by taxi?`, answer: `The drive usually takes about ${time}. Traffic, weather and rest stops can change this.` },
  ];
  if (range) {
    faqs.push({
      question: `What is the one way taxi fare from ${from} to ${to}?`,
      answer: `The fare is ${range} depending on the car. It includes driver batta${i.gst ? ' and GST' : ''}. Toll and permit charges are extra and paid as per actuals.`,
    });
  }
  faqs.push(
    { question: `Are toll and permit charges included in the ${from} to ${to} fare?`, answer: `No. Toll gates, state permits and hill station charges are extra and paid as per actuals during the trip.` },
  );
  if (cars) faqs.push({ question: `Which cars can I book from ${from} to ${to}?`, answer: `You can choose from ${cars}. The total for each is shown on this page.` });
  faqs.push(
    { question: `Can I book a round trip or a package from ${from}?`, answer: `Yes. Choose Round Trip or Package on the home page, enter ${from} as the pickup and you will see the fare for each car before you book.` },
    { question: `How do I book a taxi from ${from} to ${to}?`, answer: `Pick a car above and press Book now, then enter your name, mobile number, pickup date, time and address. We will contact you on your mobile number to confirm the trip.` },
  );
  return { paragraphs, spots: i.toSpots, faqs };
}
