// Fallback banner for a city with no uploaded photos: a landmark icon on a colour derived from the slug.
const ICONS: Record<string, string> = {
  chennai: '🏖️',
  coimbatore: '🌿',
  madurai: '🛕',
  trichy: '🏰',
  pondicherry: '🌊',
  bangalore: '🏙️',
  kumbakonam: '🛕',
  vellore: '🏰',
  thiruvannamalai: '⛰️',
  thanjavur: '🛕',
  salem: '🏭',
  tirunelveli: '🛕',
  ooty: '⛰️',
  rameswaram: '🌉',
  karaikudi: '🏛️',
  erode: '🏭',
  tiruppur: '🧵',
  kanniyakumari: '🌅',
  kanchipuram: '🛕',
  dindigul: '🏰',
  pollachi: '🌴',
  tenkasi: '💧',
  mahabalipuram: '🏛️',
  yercaud: '☕',
};

export function cityIcon(slug: string): string {
  return ICONS[slug] ?? '📍';
}

/** Stable per-city gradient, so a city keeps the same banner on every page. */
export function cityGradient(slug: string): string {
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `linear-gradient(135deg, hsl(${h} 55% 32%), hsl(${(h + 35) % 360} 70% 52%))`;
}