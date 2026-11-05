/**
 * Nombres oficiales de los meses en español para períodos y almanaques gremiales.
 */
export const MONTHS_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

export type MonthNameES = typeof MONTHS_ES[number];

export const SALARY_PERIOD_KEYS = [
  'jan',
  'feb',
  'march',
  'april',
  'may',
  'june',
  'july',
  'aug',
  'sep',
  'oct',
  'nov',
  'dec',
] as const;

/**
 * Parsea una etiqueta de período "Mes AAAA" (ej. "Octubre 2026") a { year, monthIndex }.
 */
export function parsePeriodLabel(label: string): { year: number; monthIndex: number } | null {
  if (!label) return null;
  const parts = label.trim().split(' ');
  if (parts.length !== 2) return null;
  const [monthName, yearStr] = parts;
  const monthIndex = MONTHS_ES.indexOf(monthName as MonthNameES);
  const year = parseInt(yearStr, 10);
  if (monthIndex === -1 || isNaN(year)) return null;
  return { year, monthIndex };
}

/**
 * De una lista de períodos "Mes AAAA", devuelve el más reciente en el tiempo.
 */
export function getLatestPeriod(periods: (string | null | undefined)[]): string | null {
  let best: { label: string; order: number } | null = null;
  for (const label of periods) {
    if (!label) continue;
    const parsed = parsePeriodLabel(label);
    if (!parsed) continue;
    const order = parsed.year * 12 + parsed.monthIndex;
    if (!best || order > best.order) {
      best = { label, order };
    }
  }
  return best ? best.label : null;
}

