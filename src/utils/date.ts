export const WEEKDAYS_ES_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'] as const;

export const WEEKDAYS_ES_LONG = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
] as const;

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

export type CalendarCell = {
  iso: string;
  day: number;
  month: number;
  year: number;
  inMonth: boolean;
  isToday: boolean;
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function pad4(n: number): string {
  return String(n).padStart(4, '0');
}

export function buildIsoDate(year: number, monthIndex: number, day: number): string {
  return `${pad4(year)}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

export function todayIsoLocal(now: Date = new Date()): string {
  return buildIsoDate(now.getFullYear(), now.getMonth(), now.getDate());
}

export function parseIsoParts(iso: string): { year: number; monthIndex: number; day: number } | null {
  if (typeof iso !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const check = new Date(year, month - 1, day);
  if (
    check.getFullYear() !== year ||
    check.getMonth() !== month - 1 ||
    check.getDate() !== day
  ) {
    return null;
  }
  return { year, monthIndex: month - 1, day };
}

export function isValidIsoDate(iso: string): boolean {
  return parseIsoParts(iso) !== null;
}

export function formatIsoToUruguayan(iso: string): string {
  const parts = parseIsoParts(iso);
  if (!parts) return '';
  return `${pad2(parts.day)}/${pad2(parts.monthIndex + 1)}/${pad4(parts.year)}`;
}

export function parseUruguayanDate(value: string): string | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const check = new Date(year, month - 1, day);
  if (
    check.getFullYear() !== year ||
    check.getMonth() !== month - 1 ||
    check.getDate() !== day
  ) {
    return null;
  }
  return buildIsoDate(year, month - 1, day);
}

export function addDaysIso(iso: string, deltaDays: number): string {
  const parts = parseIsoParts(iso);
  if (!parts) return todayIsoLocal();
  const next = new Date(parts.year, parts.monthIndex, parts.day + deltaDays);
  return buildIsoDate(next.getFullYear(), next.getMonth(), next.getDate());
}

export function addMonthsToView(
  year: number,
  monthIndex: number,
  deltaMonths: number,
): { year: number; monthIndex: number } {
  const date = new Date(year, monthIndex + deltaMonths, 1);
  return { year: date.getFullYear(), monthIndex: date.getMonth() };
}

export function formatMonthYearEs(year: number, monthIndex: number): string {
  const month = MONTHS_ES[monthIndex] ?? '';
  return `${month} ${year}`;
}

export function formatReadableDateEs(iso: string): string {
  const parts = parseIsoParts(iso);
  if (!parts) return '';
  const d = new Date(parts.year, parts.monthIndex, parts.day);
  const raw = new Intl.DateTimeFormat('es-UY', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function getCalendarGrid(
  year: number,
  monthIndex: number,
  todayIso: string = todayIsoLocal(),
): CalendarCell[] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  // Convert JS Sunday=0..Saturday=6 into Monday=0..Sunday=6
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const cells: CalendarCell[] = [];
  for (let index = 0; index < totalCells; index++) {
    const dayOffset = index - startOffset + 1;
    const cellDate = new Date(year, monthIndex, dayOffset);
    const cellYear = cellDate.getFullYear();
    const cellMonth = cellDate.getMonth();
    const cellDay = cellDate.getDate();
    const iso = buildIsoDate(cellYear, cellMonth, cellDay);
    cells.push({
      iso,
      day: cellDay,
      month: cellMonth,
      year: cellYear,
      inMonth: cellYear === year && cellMonth === monthIndex,
      isToday: iso === todayIso,
    });
  }
  return cells;
}
