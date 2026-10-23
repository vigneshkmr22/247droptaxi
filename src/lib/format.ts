/** Rupee amount like the old Angular currency pipe: ₹1,234.50. */
export function inr(value: number, minFraction = 0, maxFraction = minFraction): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'INR', minimumFractionDigits: minFraction, maximumFractionDigits: maxFraction }).format(value);
}

/** Plain number with grouping, e.g. 1,234.5. */
export function num(value: number, minFraction = 0, maxFraction = minFraction): string {
  return new Intl.NumberFormat('en-US', { minimumFractionDigits: minFraction, maximumFractionDigits: maxFraction }).format(value);
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

const two = (n: number) => String(n).padStart(2, '0');

/** Today's date in the visitor's own time zone, as yyyy-mm-dd (toISOString would give the UTC date). */
export function localDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`;
}

/** The current time in the visitor's own time zone, as hh:mm. */
export function localTime(d: Date = new Date()): string {
  return `${two(d.getHours())}:${two(d.getMinutes())}`;
}
