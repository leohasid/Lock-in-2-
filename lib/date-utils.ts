/**
 * Format a Date to YYYY-MM-DD using LOCAL timezone.
 * Avoids toISOString() which uses UTC and can shift dates (e.g. Feb 10 midnight
 * in Sydney becomes Feb 9 in UTC).
 */
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
