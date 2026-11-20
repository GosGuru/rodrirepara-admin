import { expect, test } from 'bun:test';
import { JsonRepository, MemoryStorage, type Order } from './repository';
import { dashboard, filterOrders, paymentStatus } from './selectors';
import { createSeededRepository, createSeededStorage } from './test-fixtures';

const key = 'rodrigo-crm';
const client = { name: 'Julia', phone: '123' };
const expense = { description: 'Gas', category: 'Combustible', amount: 20, date: '2026-01-01' };

async function setup() {
  const { storage, repo } = createSeededRepository();
  const seed = await repo.load();
  const { id: _id, ...order } = seed.orders[0];
  // Begin with an existing persisted value, so failed operations must preserve it byte-for-byte.
  await repo.addClient(client);
  const before = await repo.load();
  const raw = storage.getItem(key);
  return { storage, repo, before, raw, order };
}

function snapshot(data: Awaited<ReturnType<JsonRepository['load']>>) {
  return { clients: data.clients.length, orders: data.orders.length, expenses: data.expenses.length,
    expensesTotal: data.expenses.reduce((sum, e) => sum + e.amount, 0), dashboard: dashboard(data, '2026-06-18') };
}

test('getter y lectura de almacenamiento fallidos se informan en español', async () => {
  const getter = new JsonRepository(() => { throw Error('SecurityError'); });
  await expect(getter.load()).rejects.toThrow('No se pudieron leer los datos locales');
  class Denied extends MemoryStorage {
    override getItem(): string | null { throw Error('SecurityError'); }
  }
  await expect(new JsonRepository(new Denied()).load()).rejects.toThrow('No se pudieron leer los datos locales');
});

test('acciones rápidas persisten cliente, orden y gasto en un repositorio nuevo', async () => {
  const { storage, repo, before, order } = await setup();
  await repo.addClient({ name: 'Otro', phone: '456' });
  await repo.addOrder({ ...order, equipment: 'Equipo nuevo' });
  await repo.addExpense(expense);
  const after = await new JsonRepository(storage).load();
  expect(after.clients.length).toBe(before.clients.length + 1);
  expect(after.orders.length).toBe(before.orders.length + 1);
  expect(after.expenses.length).toBe(before.expenses.length + 1);
  expect(after.orders.at(-1)?.equipment).toBe('Equipo nuevo');
  expect(snapshot(after).expensesTotal).toBe(snapshot(before).expensesTotal + expense.amount);
});

test('validación de cada acción rechaza datos inválidos sin alterar datos ni totales', async () => {
  const { storage, repo, before, raw, order } = await setup();
  const attempts = [
    () => repo.addClient({ name: ' ', phone: '123' }),
    () => repo.addClient({ name: 'Julia', phone: '' }),
    () => repo.addOrder({ ...order, clientId: 'inexistente' }),
    () => repo.addOrder({ ...order, originalId: 'inexistente' }),
    () => repo.addOrder({ ...order, equipment: ' ' }),
    () => repo.addOrder({ ...order, partsCost: NaN }),
    () => repo.addExpense({ ...expense, description: '' }),
    ...[-1, NaN, Infinity].map(amount => () => repo.addExpense({ ...expense, amount })),
  ];
  for (const attempt of attempts) {
    await expect(attempt()).rejects.toThrow();
    expect(storage.getItem(key)).toBe(raw);
    expect(snapshot(await repo.load())).toEqual(snapshot(before));
  }
});

test('fallos de escritura en cada acción preservan JSON, conteos y totales', async () => {
  const { storage, repo, before, raw, order } = await setup();
  storage.failWrites = true;
  for (const attempt of [() => repo.addClient(client), () => repo.addOrder(order), () => repo.addExpense(expense)]) {
    await expect(attempt()).rejects.toThrow();
    expect(storage.getItem(key)).toBe(raw);
    expect(snapshot(await repo.load())).toEqual(snapshot(before));
  }
});

test('filas nulas, enlaces inválidos y JSON corrupto se rechazan sin reemplazarlos', async () => {
  const { storage, before } = await setup();
  for (const raw of ['{', JSON.stringify({ ...before, orders: [null] }),
    JSON.stringify({ ...before, payments: [{ id: 'p', orderId: 'falta', amount: 2, date: '2026-01-01' }] })]) {
    storage.setItem(key, raw);
    await expect(new JsonRepository(storage).load()).rejects.toThrow('No se pudieron leer los datos locales');
    expect(storage.getItem(key)).toBe(raw);
  }
});

test('búsqueda, modalidad y estados de orden permanecen independientes', async () => {
  const data = await new JsonRepository(createSeededStorage()).load();
  expect(filterOrders(data, 'PEDRO', 'Domicilio').length).toBe(2);
  expect(filterOrders(data, 'PEDRO', 'Taller')).toHaveLength(0);
  expect(filterOrders(data, 'sin coincidencia', 'Todas')).toHaveLength(0);
  const unpaid = data.orders.find(o => o.id === 'RR-1049') as Order;
  const paid = data.orders.find(o => o.id === 'RR-1050') as Order;
  expect([unpaid.repair, paymentStatus(unpaid), unpaid.delivery]).toEqual(['Terminado', 'Pendiente', 'Pendiente']);
  expect([paid.repair, paymentStatus(paid), paid.delivery]).toEqual(['Terminado', 'Cobrado', 'Pendiente']);
});
