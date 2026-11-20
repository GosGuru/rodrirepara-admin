import { describe, expect, test } from 'bun:test';
import type { Client, Order } from '../../repository';
import {
  buildClientDirectory,
  CLIENT_SORT_OPTIONS,
  formatClientHistoryDate,
  formatOrderCountLabel,
  getAvatarTone,
  getClientInitial,
  getClientOrders,
  summarizeClientOrders,
} from './client-helpers';

const baseOrder: Order = {
  id: 'RR-1001',
  clientId: 'c1',
  equipment: 'Lavarropas Samsung 8 kg',
  mode: 'Taller',
  address: 'Taller',
  fault: 'No centrifuga',
  diagnosis: '',
  parts: '',
  partsCost: 0,
  labor: 0,
  quote: 0,
  price: null,
  paid: 0,
  repair: 'En reparación',
  delivery: 'Pendiente',
  entry: '2026-06-16',
  finish: '',
  owner: 'Rodrigo',
  originalId: '',
};

const clients: Client[] = [
  { id: 'c1', name: 'Juan', phone: '099 333 333' },
  { id: 'c2', name: 'María', phone: '099 555 555' },
  { id: 'c3', name: 'Pedro', phone: '099 444 444' },
  { id: 'c4', name: 'Ana', phone: '099 666 666' },
];

const orders: Order[] = [
  { ...baseOrder, id: 'RR-1030', clientId: 'c3', entry: '2026-05-01', finish: '2026-05-02', repair: 'Cerrado', price: 2000, paid: 2000, delivery: 'Entregado' },
  { ...baseOrder, id: 'RR-1049', clientId: 'c3', entry: '2026-06-18', finish: '', repair: 'Terminado', price: 4000, paid: 0, delivery: 'Pendiente', originalId: 'RR-1030' },
  { ...baseOrder, id: 'RR-1047', clientId: 'c1', entry: '2026-06-16', repair: 'En reparación' },
  { ...baseOrder, id: 'RR-1048', clientId: 'c2', entry: '2026-06-17', repair: 'Esperando aprobación' },
];

describe('client-helpers', () => {
  test('CLIENT_SORT_OPTIONS exposes only derivable real sort criteria', () => {
    expect(CLIENT_SORT_OPTIONS.map((o) => o.value)).toEqual(['name-asc', 'name-desc', 'recent']);
  });

  test('getClientOrders sorts newest-first without mutating source orders', () => {
    const snapshot = orders.map((o) => o.id);
    const pedroOrders = getClientOrders(orders, 'c3');
    expect(pedroOrders.map((o) => o.id)).toEqual(['RR-1049', 'RR-1030']);
    expect(orders.map((o) => o.id)).toEqual(snapshot);
  });

  test('buildClientDirectory filters accent-insensitively by name and phone (with or without spaces)', () => {
    const byAccent = buildClientDirectory(clients, orders, 'maria', 'name-asc');
    expect(byAccent.map((e) => e.client.name)).toEqual(['María']);

    const bySpacedPhone = buildClientDirectory(clients, orders, '099 444', 'name-asc');
    expect(bySpacedPhone.map((e) => e.client.name)).toEqual(['Pedro']);

    const byCompactPhone = buildClientDirectory(clients, orders, '099444444', 'name-asc');
    expect(byCompactPhone.map((e) => e.client.name)).toEqual(['Pedro']);
  });

  test('buildClientDirectory sorts A-Z, Z-A, and by most recent real activity', () => {
    expect(buildClientDirectory(clients, orders, '', 'name-asc').map((e) => e.client.name)).toEqual([
      'Ana',
      'Juan',
      'María',
      'Pedro',
    ]);
    expect(buildClientDirectory(clients, orders, '', 'name-desc').map((e) => e.client.name)).toEqual([
      'Pedro',
      'María',
      'Juan',
      'Ana',
    ]);
    expect(buildClientDirectory(clients, orders, '', 'recent').map((e) => e.client.name)).toEqual([
      'Pedro',
      'María',
      'Juan',
      'Ana',
    ]);
  });

  test('summarizeClientOrders keeps Terminado, Cobrado, and Entregado strictly separate', () => {
    const pedroSummary = summarizeClientOrders(getClientOrders(orders, 'c3'));
    expect(pedroSummary.total).toBe(2);
    // RR-1049 is Terminado (pending payment & delivery); RR-1030 is Cerrado & Entregado
    expect(pedroSummary.finished).toBe(1);
    expect(pedroSummary.delivered).toBe(1);
    expect(pedroSummary.latestDate).toBe('2026-06-18');

    const emptySummary = summarizeClientOrders([]);
    expect(emptySummary).toEqual({ total: 0, finished: 0, delivered: 0, latestDate: '' });
  });

  test('formatOrderCountLabel, getClientInitial, getAvatarTone, and formatClientHistoryDate behave deterministically', () => {
    expect(formatOrderCountLabel(0)).toBe('0 órdenes');
    expect(formatOrderCountLabel(1)).toBe('1 orden');
    expect(formatOrderCountLabel(2)).toBe('2 órdenes');
    expect(getClientInitial(' maría')).toBe('M');
    expect(getClientInitial('')).toBe('?');
    expect(getAvatarTone('c1')).toBe(getAvatarTone('c1'));
    expect(formatClientHistoryDate('2026-05-01')).toBe('1 may 2026');
    expect(formatClientHistoryDate('')).toBe('Sin fecha');
    expect(formatClientHistoryDate('legacy-text')).toBe('legacy-text');
  });
});
