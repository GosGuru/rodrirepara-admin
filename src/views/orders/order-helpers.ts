import type { Data, Order } from '../../repository';
import { paymentStatus } from '../../selectors';
import { parseIsoParts } from '../../utils/date';
import { moveChoices } from '../repair-board';

export type OrderExtraFilters = {
  repair: string;
  payment: string;
  delivery: string;
};

export const EMPTY_EXTRA_FILTERS: OrderExtraFilters = {
  repair: 'Todos',
  payment: 'Todos',
  delivery: 'Todos',
};

export const MODE_OPTIONS = [
  { value: 'Todas', label: 'Todas' },
  { value: 'Taller', label: 'Taller' },
  { value: 'Domicilio', label: 'Domicilio' },
] as const;

export const REPAIR_FILTER_OPTIONS = [
  { value: 'Todos', label: 'Todos los estados' },
  ...moveChoices.pending.map((s) => ({ value: s, label: s })),
  ...moveChoices.progress.map((s) => ({ value: s, label: s })),
  ...moveChoices.ready.map((s) => ({ value: s, label: s })),
  { value: 'Cerrado', label: 'Cerrado' },
] as const;

export const PAYMENT_FILTER_OPTIONS = [
  { value: 'Todos', label: 'Todos los cobros' },
  { value: 'Pendiente', label: 'Pendiente' },
  { value: 'Cobrado', label: 'Cobrado' },
] as const;

export const DELIVERY_FILTER_OPTIONS = [
  { value: 'Todos', label: 'Todas las entregas' },
  { value: 'Pendiente', label: 'Pendiente' },
  { value: 'Entregado', label: 'Entregado' },
] as const;

const WEEKDAY_ABBR = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'] as const;
const MONTH_ABBR = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;

const LONG_ID_THRESHOLD = 14;

export function isLongOrderId(id: string): boolean {
  return id.length > LONG_ID_THRESHOLD;
}

export function formatDisplayOrderId(id: string): string {
  if (!isLongOrderId(id)) return id;
  return `${id.slice(0, 8)}…${id.slice(-4)}`;
}

export function formatCompactOrderDate(iso: string): string {
  const parts = parseIsoParts(iso);
  if (!parts) return '';
  const date = new Date(parts.year, parts.monthIndex, parts.day);
  const weekday = WEEKDAY_ABBR[date.getDay()] ?? '';
  const month = MONTH_ABBR[parts.monthIndex] ?? '';
  return `${weekday}, ${parts.day} ${month}`;
}

export function countActiveExtraFilters(filters: OrderExtraFilters): number {
  let count = 0;
  if (filters.repair !== 'Todos') count += 1;
  if (filters.payment !== 'Todos') count += 1;
  if (filters.delivery !== 'Todos') count += 1;
  return count;
}

export function applyExtraOrderFilters(
  orders: readonly Order[],
  filters: OrderExtraFilters,
): Order[] {
  if (
    filters.repair === 'Todos' &&
    filters.payment === 'Todos' &&
    filters.delivery === 'Todos'
  ) {
    return [...orders];
  }
  return orders.filter((order) => {
    if (filters.repair !== 'Todos' && order.repair !== filters.repair) return false;
    if (filters.payment !== 'Todos' && paymentStatus(order) !== filters.payment) return false;
    if (filters.delivery !== 'Todos' && order.delivery !== filters.delivery) return false;
    return true;
  });
}

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .trim();
}

export type OrderSearchSuggestion = {
  order: Order;
  clientName: string;
};

export function getSearchSuggestions(
  data: Data,
  query: string,
  limit = 5,
): OrderSearchSuggestion[] {
  const needle = normalizeSearch(query);
  if (!needle) return [];

  const clientMap = new Map(data.clients.map((c) => [c.id, c.name]));
  const matches: OrderSearchSuggestion[] = [];

  for (const order of data.orders) {
    const clientName = clientMap.get(order.clientId) ?? '';
    const haystack = normalizeSearch(
      `${order.id} ${clientName} ${order.equipment} ${order.fault}`,
    );
    if (haystack.includes(needle)) {
      matches.push({ order, clientName });
      if (matches.length >= limit) break;
    }
  }

  return matches;
}
