import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Data, Order } from '../../repository';
import {
  applyExtraOrderFilters,
  EMPTY_EXTRA_FILTERS,
  formatCompactOrderDate,
  formatDisplayOrderId,
  getSearchSuggestions,
  isLongOrderId,
  MODE_OPTIONS,
} from './order-helpers';
import { OrderStatusBadge } from './OrderStatusBadge';

const baseOrder: Order = {
  id: 'RR-1047',
  clientId: 'C-1',
  equipment: 'Samsung Eco 8 kg',
  mode: 'Taller',
  address: 'Taller',
  fault: 'No centrifuga',
  diagnosis: '',
  parts: '',
  partsCost: 0,
  labor: 0,
  quote: 0,
  price: 4000,
  paid: 4000,
  repair: 'Terminado',
  delivery: 'Pendiente',
  entry: '2024-11-14',
  finish: '',
  owner: 'Rodrigo',
  originalId: '',
};

const sampleOrders: Order[] = [
  baseOrder,
  {
    ...baseOrder,
    id: 'RR-1048',
    clientId: 'C-2',
    equipment: 'James J 6 kg',
    mode: 'Domicilio',
    fault: 'Pierde agua',
    price: null,
    paid: 0,
    repair: 'Esperando aprobación',
    delivery: 'Pendiente',
    entry: '2024-11-12',
  },
  {
    ...baseOrder,
    id: '8b4196ed-3875-4f59-94fc-bddebe85f5b0',
    clientId: 'C-3',
    equipment: 'Enxuta E 7 kg',
    mode: 'Domicilio',
    fault: 'No enciende',
    price: 2000,
    paid: 2000,
    repair: 'Cerrado',
    delivery: 'Entregado',
    entry: '2024-11-08',
  },
];

const sampleData: Data = {
  clients: [
    { id: 'C-1', name: 'Juan Pérez', phone: '099111222' },
    { id: 'C-2', name: 'María López', phone: '099333444' },
    { id: 'C-3', name: 'Pedro Gómez', phone: '099555666' },
  ],
  orders: sampleOrders,
  expenses: [],
  leads: [],
  payments: [],
  partsPurchases: [],
};

test('isLongOrderId and formatDisplayOrderId shorten UUIDs visually without mutating short IDs', () => {
  expect(isLongOrderId('RR-1047')).toBe(false);
  expect(formatDisplayOrderId('RR-1047')).toBe('RR-1047');

  const uuid = '8b4196ed-3875-4f59-94fc-bddebe85f5b0';
  expect(isLongOrderId(uuid)).toBe(true);
  const display = formatDisplayOrderId(uuid);
  expect(display.length).toBeLessThan(uuid.length);
  expect(display).toContain('…');
  expect(display.startsWith('8b4196ed')).toBe(true);
  expect(display.endsWith('f5b0')).toBe(true);
});

test('formatCompactOrderDate formats ISO dates timezone-safely in Spanish and rejects invalid strings', () => {
  expect(formatCompactOrderDate('2024-11-14')).toBe('Jue, 14 nov');
  expect(formatCompactOrderDate('2024-11-08')).toBe('Vie, 8 nov');
  expect(formatCompactOrderDate('')).toBe('');
  expect(formatCompactOrderDate('not-a-date')).toBe('');
});

test('MODE_OPTIONS exposes only real modalities without inventing Recepción', () => {
  expect(MODE_OPTIONS.map((o) => o.value)).toEqual(['Todas', 'Taller', 'Domicilio']);
});

test('applyExtraOrderFilters filters repair, payment, and delivery independently', () => {
  expect(applyExtraOrderFilters(sampleOrders, EMPTY_EXTRA_FILTERS)).toHaveLength(3);

  // Terminado + Cobrado + Pendiente de entrega
  const readyPendingDelivery = applyExtraOrderFilters(sampleOrders, {
    repair: 'Terminado',
    payment: 'Cobrado',
    delivery: 'Pendiente',
  });
  expect(readyPendingDelivery.map((o) => o.id)).toEqual(['RR-1047']);

  // Paid=0 & price=null => paymentStatus is Pendiente
  const pendingPayment = applyExtraOrderFilters(sampleOrders, {
    repair: 'Todos',
    payment: 'Pendiente',
    delivery: 'Todos',
  });
  expect(pendingPayment.map((o) => o.id)).toEqual(['RR-1048']);

  // Entregado only
  const delivered = applyExtraOrderFilters(sampleOrders, {
    repair: 'Todos',
    payment: 'Todos',
    delivery: 'Entregado',
  });
  expect(delivered.map((o) => o.id)).toEqual(['8b4196ed-3875-4f59-94fc-bddebe85f5b0']);
});

test('getSearchSuggestions matches real client, order ID, equipment, and fault accent-insensitively', () => {
  expect(getSearchSuggestions(sampleData, '')).toEqual([]);
  expect(getSearchSuggestions(sampleData, '   ')).toEqual([]);

  const maria = getSearchSuggestions(sampleData, 'mar');
  expect(maria).toHaveLength(1);
  expect(maria[0]?.order.id).toBe('RR-1048');
  expect(maria[0]?.clientName).toBe('María López');

  const faultMatch = getSearchSuggestions(sampleData, 'centrifuga');
  expect(faultMatch.map((s) => s.order.id)).toEqual(['RR-1047']);
});

test('OrderStatusBadge renders accessible icon + text and never fakes completion on unknown states', () => {
  const repairHtml = renderToStaticMarkup(<OrderStatusBadge kind="repair" value="Terminado" />);
  expect(repairHtml).toContain('data-status-kind="repair"');
  expect(repairHtml).toContain('aria-label="Reparación: Terminado"');
  expect(repairHtml).toContain('<svg');
  expect(repairHtml).toContain('Terminado');

  const paymentHtml = renderToStaticMarkup(<OrderStatusBadge kind="payment" value="Pendiente" />);
  expect(paymentHtml).toContain('data-status-kind="payment"');
  expect(paymentHtml).toContain('aria-label="Cobro: Pendiente"');
  expect(paymentHtml).toContain('<svg');

  const deliveryHtml = renderToStaticMarkup(<OrderStatusBadge kind="delivery" value="Entregado" />);
  expect(deliveryHtml).toContain('data-status-kind="delivery"');
  expect(deliveryHtml).toContain('aria-label="Entrega: Entregado"');
  expect(deliveryHtml).toContain('<svg');

  const unknownHtml = renderToStaticMarkup(
    <OrderStatusBadge kind="repair" value="Revisión <especial>" />,
  );
  expect(unknownHtml).toContain('Revisión &lt;especial&gt;');
  expect(unknownHtml).toContain('ov-badge--neutral');
  expect(unknownHtml).not.toContain('ov-badge--complete');
});
