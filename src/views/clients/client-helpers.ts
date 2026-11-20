import type { Client, Order } from '../../repository';
import { parseIsoParts } from '../../utils/date';

export type ClientSortKey = 'name-asc' | 'name-desc' | 'recent';

export const CLIENT_SORT_OPTIONS = [
  { value: 'name-asc', label: 'Nombre (A–Z)' },
  { value: 'name-desc', label: 'Nombre (Z–A)' },
  { value: 'recent', label: 'Actividad más reciente' },
] as const;

export type AvatarTone = 'blue' | 'lavender' | 'mint' | 'amber' | 'rose';

const AVATAR_TONES: readonly AvatarTone[] = ['blue', 'lavender', 'mint', 'amber', 'rose'];

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

export type ClientOrderSummary = {
  total: number;
  finished: number;
  delivered: number;
  latestDate: string;
};

export type ClientDirectoryEntry = {
  client: Client;
  orders: Order[];
  orderCount: number;
  latestActivity: string;
};

export function normalizeClientQuery(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es');
}

function stripNonDigits(value: string): string {
  return value.replace(/\D+/g, '');
}

export function getClientInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  return trimmed.charAt(0).toLocaleUpperCase('es');
}

export function getAvatarTone(seed: string): AvatarTone {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_TONES[hash % AVATAR_TONES.length] ?? 'blue';
}

export function formatOrderCountLabel(count: number): string {
  return count === 1 ? '1 orden' : `${count} órdenes`;
}

export function formatClientHistoryDate(iso: string): string {
  const trimmed = iso.trim();
  if (!trimmed) return 'Sin fecha';
  const parts = parseIsoParts(trimmed);
  if (!parts) return trimmed;
  const month = MONTH_ABBR[parts.monthIndex] ?? '';
  return `${parts.day} ${month} ${parts.year}`;
}

export function getClientOrders(orders: readonly Order[], clientId: string): Order[] {
  return orders
    .filter((order) => order.clientId === clientId)
    .slice()
    .sort((a, b) => {
      const byEntry = b.entry.localeCompare(a.entry);
      if (byEntry !== 0) return byEntry;
      const byFinish = b.finish.localeCompare(a.finish);
      if (byFinish !== 0) return byFinish;
      return b.id.localeCompare(a.id);
    });
}

export function getClientLatestActivity(orders: readonly Order[]): string {
  let latest = '';
  for (const order of orders) {
    if (order.entry && order.entry.localeCompare(latest) > 0) latest = order.entry;
    if (order.finish && order.finish.localeCompare(latest) > 0) latest = order.finish;
  }
  return latest;
}

export function summarizeClientOrders(orders: readonly Order[]): ClientOrderSummary {
  let finished = 0;
  let delivered = 0;
  for (const order of orders) {
    if (order.repair === 'Terminado') finished += 1;
    if (order.delivery === 'Entregado') delivered += 1;
  }
  return {
    total: orders.length,
    finished,
    delivered,
    latestDate: getClientLatestActivity(orders),
  };
}

export function buildClientDirectory(
  clients: readonly Client[],
  orders: readonly Order[],
  query: string,
  sortBy: ClientSortKey,
): ClientDirectoryEntry[] {
  const term = normalizeClientQuery(query.trim());
  const digitTerm = stripNonDigits(query);

  const ordersByClient = new Map<string, Order[]>();
  for (const order of orders) {
    const list = ordersByClient.get(order.clientId);
    if (list) {
      list.push(order);
    } else {
      ordersByClient.set(order.clientId, [order]);
    }
  }

  const entries: ClientDirectoryEntry[] = [];
  for (const client of clients) {
    if (term) {
      const matchesName = normalizeClientQuery(client.name).includes(term);
      const matchesPhone = normalizeClientQuery(client.phone).includes(term);
      const matchesDigits =
        digitTerm.length >= 2 && stripNonDigits(client.phone).includes(digitTerm);
      if (!matchesName && !matchesPhone && !matchesDigits) continue;
    }

    const clientOrders = getClientOrders(ordersByClient.get(client.id) ?? [], client.id);
    entries.push({
      client,
      orders: clientOrders,
      orderCount: clientOrders.length,
      latestActivity: getClientLatestActivity(clientOrders),
    });
  }

  const compareNameAsc = (a: ClientDirectoryEntry, b: ClientDirectoryEntry) =>
    a.client.name.localeCompare(b.client.name, 'es', { sensitivity: 'base' });

  entries.sort((a, b) => {
    if (sortBy === 'name-desc') return compareNameAsc(b, a);
    if (sortBy === 'recent') {
      const byDate = b.latestActivity.localeCompare(a.latestActivity);
      if (byDate !== 0) return byDate;
      return compareNameAsc(a, b);
    }
    return compareNameAsc(a, b);
  });

  return entries;
}
