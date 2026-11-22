import { expect, test } from 'bun:test';
import { JsonRepository, MemoryStorage } from './repository';
import { filterOrders, paymentStatus, dashboard } from './selectors';
import { createSeededRepository } from './test-fixtures';
import { todayIsoLocal } from './utils/date';

test('arranca completamente vacío sin datos de ejemplo en seed.json', async () => {
  const data = await new JsonRepository(new MemoryStorage()).load();
  expect(data).toEqual({
    clients: [],
    orders: [],
    expenses: [],
    leads: [],
    payments: [],
    partsPurchases: [],
  });
});

test('carga semilla y conserva cambios tras recargar', async () => {
  const storage = new MemoryStorage(); const repo = new JsonRepository(storage);
  const data = await repo.load(); await repo.addClient({ name: 'Julia', phone: '123' });
  expect((await new JsonRepository(storage).load()).clients.length).toBe(data.clients.length + 1);
});
test('rechaza JSON inválido sin sobrescribirlo', async () => {
  const storage = new MemoryStorage(); storage.setItem('rodrigo-crm', '{');
  await expect(new JsonRepository(storage).load()).rejects.toThrow(); expect(storage.getItem('rodrigo-crm')).toBe('{');
});
test('rechaza importes inválidos sin mutar almacenamiento', async () => {
  const storage = new MemoryStorage(); const repo = new JsonRepository(storage); await repo.load();
  await expect(repo.addExpense({ description: 'Gas', category: 'Combustible', amount: -1, date: '2026-01-01' })).rejects.toThrow();
  expect(storage.getItem('rodrigo-crm')).toBeNull();
});
test('fallo de escritura no cambia el estado anterior', async () => {
  const storage = new MemoryStorage(); const repo = new JsonRepository(storage); const before = await repo.load();
  storage.failWrites = true; await expect(repo.addClient({ name: 'Julia', phone: '123' })).rejects.toThrow();
  expect(await repo.load()).toEqual(before);
});
test('separa reparación, cobro y entrega y filtra modalidad y búsqueda', async () => {
  const { repo } = createSeededRepository();
  const data = await repo.load();
  expect(data.orders.some(o => o.repair === 'Terminado' && paymentStatus(o) === 'Pendiente')).toBe(true);
  expect(data.orders.some(o => paymentStatus(o) === 'Cobrado' && o.delivery === 'Pendiente')).toBe(true);
  expect(filterOrders(data, 'pedro', 'Domicilio').length).toBeGreaterThan(0);
  expect(filterOrders(data, 'pedro', 'Taller')).toHaveLength(0);
  expect(dashboard(data).active).toBe(data.orders.filter(o => o.repair !== 'Cerrado').length);
});
test('dashboard usa fecha local por defecto para cobrado hoy y descuenta de por cobrar', async () => {
  const { repo } = createSeededRepository();
  const before = await repo.load();
  const target = before.orders.find(o => o.price !== null && o.price > o.paid)!;
  const amount = target.price! - target.paid;
  const next = await repo.registerPayment(target.id, { amount, date: todayIsoLocal() });
  const prev = dashboard(before);
  const curr = dashboard(next);
  expect(curr.collected).toBe(prev.collected + amount);
  expect(curr.pending).toBe(prev.pending - amount);
});
