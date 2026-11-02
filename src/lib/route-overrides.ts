// Hand-written route details for the busiest corridors. Each entry covers a city pair in both directions: `via` lists the
// towns on the usual road from `a` to `b` (reversed automatically when the page runs b to a), and `notes` are extra
// paragraphs. {from} and {to} are filled in for the direction of the page. Keep claims general (towns, roads, seasons):
// distances, times and fares always come from the database. Review the wording before adding more pairs.
import type { Faq } from './types';

interface Pair {
  a: string;
  b: string;
  road: string;
  via: string[];
  notes: string[];
  faq?: Faq;
}

const PAIRS: Pair[] = [
  {
    a: 'chennai', b: 'bangalore', road: 'NH48',
    via: ['Sriperumbudur', 'Ranipet', 'Vellore', 'Krishnagiri', 'Hosur'],
    notes: [
      'This is the busiest corridor we run. Most customers start early in the morning or late at night to avoid city traffic at both ends, and the drive is mostly a wide highway.',
      'Allow extra time near Hosur and the Bangalore city limits during office hours, and near Sriperumbudur on weekday evenings.',
    ],
  },
  {
    a: 'bangalore', b: 'coimbatore', road: 'NH44 and NH544',
    via: ['Hosur', 'Krishnagiri', 'Dharmapuri', 'Salem', 'Erode', 'Perundurai', 'Avinashi'],
    notes: [
      'The trip is a full day drive on national highways. Many travellers break the journey near Salem or Erode for a meal, and a one way taxi lets you stop whenever you need to.',
    ],
  },
  {
    a: 'bangalore', b: 'salem', road: 'NH44',
    via: ['Hosur', 'Krishnagiri', 'Dharmapuri'],
    notes: [
      'Salem is also the gateway to Yercaud, so many customers take a drop in Salem and continue to the hills the next day. Tell us if you want to go straight to Yercaud.',
    ],
  },
  {
    a: 'bangalore', b: 'pondicherry', road: 'NH44 and state highways',
    via: ['Hosur', 'Krishnagiri', 'Tiruvannamalai', 'Tindivanam'],
    notes: [
      'Pondicherry is a popular weekend trip from Bangalore. The exact road can change with traffic and road works, and your driver will pick the better option on the day.',
    ],
  },
  {
    a: 'bangalore', b: 'madurai', road: 'NH44',
    via: ['Hosur', 'Krishnagiri', 'Dharmapuri', 'Salem', 'Namakkal', 'Karur', 'Dindigul'],
    notes: [
      'This is one of our longer trips from Bangalore. It is best started early in the morning so that you reach the other end in daylight, with a rest stop around Salem or Karur.',
    ],
  },
  {
    a: 'bangalore', b: 'ooty', road: 'the Mysuru road and NH766 / NH181',
    via: ['Mysuru', 'Gundlupet', 'Bandipur', 'Gudalur'],
    notes: [
      'The usual road passes through the Bandipur forest area, where there are night travel restrictions and animal crossings, so plan to cross it in daylight. The last stretch to Ooty has hill bends and slower driving.',
      'Weekends and holiday seasons are busy in Ooty, so allow extra time on the hill road.',
    ],
  },
  {
    a: 'bangalore', b: 'vellore', road: 'NH48',
    via: ['Hosur', 'Krishnagiri', 'Ambur'],
    notes: [
      'Vellore is a common drop for hospital visits, and for people continuing to Chennai or Tirupati by train.',
    ],
  },
  {
    a: 'chennai', b: 'coimbatore', road: 'NH48 and NH544',
    via: ['Vellore', 'Krishnagiri', 'Dharmapuri', 'Salem', 'Erode'],
    notes: [
      'This is a long drive, and many customers split it with a break at Salem or Erode. If you want to travel overnight, tell us when you book so we can plan the driver.',
    ],
  },
  {
    a: 'chennai', b: 'madurai', road: 'NH38',
    via: ['Chengalpattu', 'Tindivanam', 'Villupuram', 'Perambalur', 'Trichy', 'Dindigul'],
    notes: [
      'Most of the road is a four lane national highway. Many customers use this route for temple visits and weddings, and a night departure from Chennai gets you to Madurai in the morning.',
    ],
  },
  {
    a: 'chennai', b: 'pondicherry', road: 'the East Coast Road (ECR) or NH32',
    via: ['Mahabalipuram', 'Marakkanam'],
    notes: [
      'There are two usual roads: the scenic East Coast Road along the sea, and the inland road through Tindivanam. The ECR is popular for weekend trips and passes Mahabalipuram, while the inland road is often quicker at busy times.',
    ],
  },
  {
    a: 'chennai', b: 'trichy', road: 'NH38',
    via: ['Chengalpattu', 'Tindivanam', 'Villupuram', 'Ulundurpet', 'Perambalur'],
    notes: [
      'Trichy is a common stop on the way to Madurai, Thanjavur and the delta towns. Tell us in the booking notes if you need to continue from Trichy.',
    ],
  },
];

export interface RouteOverride {
  paragraphs: string[];
  faq: Faq;
}

/** The hand-written text for a route in either direction, or null when the pair has none. */
export function routeOverride(fromSlug: string, toSlug: string, from: string, to: string): RouteOverride | null {
  const p = PAIRS.find((x) => (x.a === fromSlug && x.b === toSlug) || (x.a === toSlug && x.b === fromSlug));
  if (!p) return null;
  const via = p.a === fromSlug ? p.via : [...p.via].reverse();
  const fill = (s: string) => s.replace(/\{from\}/g, from).replace(/\{to\}/g, to);
  const towns = via.length <= 1 ? via.join('') : `${via.slice(0, -1).join(', ')} and ${via[via.length - 1]}`;
  return {
    paragraphs: [`The usual road from ${from} to ${to} is ${p.road}, passing ${towns}.`, ...p.notes.map(fill)],
    faq: p.faq ?? {
      question: `Which road does the ${from} to ${to} taxi take?`,
      answer: `The usual route is ${p.road}, via ${towns}. The driver may choose another road depending on traffic, road works or weather.`,
    },
  };
}
