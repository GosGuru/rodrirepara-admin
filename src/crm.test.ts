import { expect, test } from 'bun:test';
import { JsonRepository, MemoryStorage } from './repository';
import { filterOrders, paymentStatus, dashboard } from './selectors';

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
  const data = await new JsonRepository(new MemoryStorage()).load();
  expect(data.orders.some(o => o.repair === 'Terminado' && paymentStatus(o) === 'Pendiente')).toBe(true);
  expect(data.orders.some(o => paymentStatus(o) === 'Cobrado' && o.delivery === 'Pendiente')).toBe(true);
  expect(filterOrders(data, 'pedro', 'Domicilio').length).toBeGreaterThan(0);
  expect(filterOrders(data, 'pedro', 'Taller')).toHaveLength(0);
  expect(dashboard(data).active).toBe(data.orders.filter(o => o.repair !== 'Cerrado').length);
});
