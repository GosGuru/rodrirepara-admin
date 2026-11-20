import { expect, test } from 'bun:test';
import { JsonRepository, MemoryStorage, type Data } from './repository';
import { dashboard, paymentStatus } from './selectors';
import { createSeededRepository, sampleSeedData } from './test-fixtures';

const date = '2026-06-18';
async function setup() {
  const { storage, repo } = createSeededRepository();
  const data = await repo.load();
  const { id: _, ...base } = data.orders[0];
  const created = await repo.addOrder({ ...base, originalId: '', price: null, paid: 0, repair: 'Cerrado', delivery: 'Entregado' });
  return { storage, repo, id: created.orders.at(-1)!.id };
}

test('señas, parciales, correcciones y persistencia independiente de estados', async () => {
  const { storage, repo, id } = await setup();
  await repo.registerPayment(id, { amount: 1000, date });
  await expect(repo.updateOrder(id, { price: 800 })).rejects.toThrow('El precio final no puede ser menor a lo cobrado.');
  await repo.updateOrder(id, { price: 5000, equipment: 'Corregido' });
  const after = await repo.registerPayment(id, { amount: 4000, date });
  const order = after.orders.find(o => o.id === id)!;
  expect([order.paid, order.price, order.repair, order.delivery]).toEqual([5000, 5000, 'Cerrado', 'Entregado']);
  expect(await new JsonRepository(storage).load()).toEqual(after);
});

test('rechazos no cambian datos y la cola continúa', async () => {
  const { storage, repo, id } = await setup();
  const before = await repo.load();
  for (const amount of [0, -1, NaN, Infinity]) {
    await expect(repo.registerPayment(id, { amount, date })).rejects.toThrow('El importe debe ser un número positivo y finito.');
    expect(await new JsonRepository(storage).load()).toEqual(before);
  }
  await expect(repo.updateOrder(id, { paid: 2 } as never)).rejects.toThrow('La edición contiene campos no permitidos.');
  await expect(repo.updateOrder('inexistente', {})).rejects.toThrow('No se encontró la orden.');
  await repo.registerPayment(id, { amount: 1, date });
  expect((await repo.load()).orders.find(o => o.id === id)!.paid).toBe(1);
});

test('serializa escrituras concurrentes de distintas instancias', async () => {
  const { storage, repo, id } = await setup();
  await repo.updateOrder(id, { price: 100 });
  await Promise.all([
    repo.registerPayment(id, { amount: 25, date }),
    new JsonRepository(storage).registerPayment(id, { amount: 25, date }),
    repo.addClient({ name: 'Nuevo', phone: '123' }),
    repo.addExpense({ description: 'Gas', category: 'Otros', amount: 3, date }),
  ]);
  const after = await repo.load();
  expect(after.orders.find(o => o.id === id)!.paid).toBe(50);
  expect(after.payments.filter(p => p.orderId === id)).toHaveLength(2);
  expect(after.clients.some(c => c.name === 'Nuevo')).toBe(true);
  expect(after.expenses.some(e => e.description === 'Gas')).toBe(true);
});

test('decimales y competencia por saldo no sobrecobran', async () => {
  const { repo, id } = await setup();
  await repo.updateOrder(id, { price: 0.3 });
  await repo.registerPayment(id, { amount: 0.1, date });
  const results = await Promise.allSettled([repo.registerPayment(id, { amount: 0.2, date }), repo.registerPayment(id, { amount: 0.2, date })]);
  expect(results.map(x => x.status)).toEqual(['fulfilled', 'rejected']);
  expect((await repo.load()).orders.find(o => o.id === id)?.paid).toBe(0.3);
});

test('fechas, campos inmutables y fallos de escritura preservan todos los datos', async () => {
  const { repo, storage, id } = await setup(); const before = await repo.load();
  for (const patch of [{ id: 'otro' }, { originalId: '' }, { sorpresa: 1 }]) {
    await expect(repo.updateOrder(id, patch as never)).rejects.toThrow('La edición contiene campos no permitidos.');
    expect(await repo.load()).toEqual(before);
  }
  await expect(repo.registerPayment(id, { amount: 1, date: '2026-02-30' })).rejects.toThrow('La fecha del cobro no es válida.');
  storage.failWrites = true;
  await expect(repo.registerPayment(id, { amount: 1, date })).rejects.toThrow('Error de escritura');
  expect(await new JsonRepository(storage).load()).toEqual(before);
  storage.failWrites = false;
  await repo.updateOrder(id, { repair: 'Etiqueta histórica', price: null });
  expect((await repo.load()).orders.find(o => o.id === id)?.repair).toBe('Etiqueta histórica');
});

test('garantías protegen cliente en ambos sentidos y permiten corregir equipo', async () => {
  const { repo, id } = await setup(); const data = await repo.load();
  const parent = data.orders.find(o => o.id === id)!;
  const { id: _, ...child } = parent;
  const next = await repo.addOrder({ ...child, originalId: id }); const childId = next.orders.at(-1)!.id;
  const other = data.clients.find(c => c.id !== parent.clientId)!.id;
  for (const target of [id, childId]) {
    await expect(repo.updateOrder(target, { clientId: other })).rejects.toThrow('El cliente no puede cambiar si rompe una garantía.');
    expect(await repo.load()).toEqual(next);
  }
  await repo.updateOrder(childId, { equipment: 'Otro equipo' });
  expect((await repo.load()).orders.find(o => o.id === childId)?.originalId).toBe(id);
});

function observations(data: Data) {
  return { counts: [data.clients.length, data.orders.length, data.expenses.length, data.leads.length, data.payments.length, data.partsPurchases.length], dashboard: dashboard(data, date), expenses: data.expenses.reduce((s, e) => s + e.amount, 0) };
}
async function rejectedUnchanged(storage: MemoryStorage, action: () => Promise<Data>, message: string) {
  const repo = new JsonRepository(storage); const before = await repo.load(); const raw = storage.getItem('rodrigo-crm');
  await expect(action()).rejects.toThrow(message);
  const after = await new JsonRepository(storage).load();
  expect(after).toEqual(before); expect(observations(after)).toEqual(observations(before));
  expect(storage.getItem('rodrigo-crm')).toBe(raw);
}

test('datos históricos: acumulado distinto al libro, sobrepago, fechas flexibles y seña posterior', async () => {
  const { repo, storage, id } = await setup();
  const legacy = await repo.load(); const order = legacy.orders.find(o => o.id === id)!;
  Object.assign(order, { paid: 1000, price: 800, entry: 'fecha antigua', finish: 'sin fecha' });
  legacy.payments.push({ id: 'legacy-payment', orderId: id, amount: 7, date: 'fecha antigua' });
  storage.setItem('rodrigo-crm', JSON.stringify(legacy));
  expect(await new JsonRepository(storage).load()).toEqual(legacy);
  const corrected = await repo.updateOrder(id, { equipment: 'Corrección', price: 800 });
  expect(corrected.orders.find(o => o.id === id)?.paid).toBe(1000);
  expect(corrected.payments).toEqual(legacy.payments);
  await rejectedUnchanged(storage, () => repo.updateOrder(id, { price: 900 }), 'El precio final no puede ser menor a lo cobrado.');
  const cleared = await repo.updateOrder(id, { price: null });
  expect(cleared.orders.find(o => o.id === id)?.paid).toBe(1000); expect(cleared.payments).toEqual(legacy.payments);
  const deposit = await repo.registerPayment(id, { amount: 50, date });
  expect(deposit.orders.find(o => o.id === id)?.paid).toBe(1050);
  expect(deposit.payments.slice(0, -1)).toEqual(legacy.payments);
  expect(deposit.payments.at(-1)).toMatchObject({ orderId: id, amount: 50, date });
  expect(deposit.payments.length).toBe(legacy.payments.length + 1);
});

test('límites y rechazos conservan registros, contadores y finanzas', async () => {
  const { repo, storage, id } = await setup();
  await repo.registerPayment(id, { amount: 1000, date });
  await repo.updateOrder(id, { price: 5000 });
  expect(5000 - (await repo.load()).orders.find(o => o.id === id)!.paid).toBe(4000);
  for (const n of [0, -1, NaN, Infinity, -Infinity]) await rejectedUnchanged(storage, () => repo.registerPayment(id, { amount: n, date }), 'El importe debe ser un número positivo y finito.');
  await rejectedUnchanged(storage, () => repo.registerPayment(id, { amount: 4001, date }), 'El cobro supera el saldo pendiente.');
  await rejectedUnchanged(storage, () => repo.registerPayment('ausente', { amount: 1, date }), 'No se encontró la orden.');
  await rejectedUnchanged(storage, () => repo.updateOrder('ausente', {}), 'No se encontró la orden.');
  for (const patch of [null, [], { id: id }, { paid: 1 }, { originalId: '' }, { otro: 1 }])
    await rejectedUnchanged(storage, () => repo.updateOrder(id, patch as never), 'La edición contiene campos no permitidos.');
  for (const patch of [{ equipment: ' ' }, { mode: 'fuera' }, { delivery: 'fuera' }, { labor: -1 }, { clientId: 'ausente' }])
    await rejectedUnchanged(storage, () => repo.updateOrder(id, patch as never), 'Los datos locales no son válidos. No se modificaron.');
  for (const bad of ['', '2026-02-30', '2026-6-1'])
    await rejectedUnchanged(storage, () => repo.registerPayment(id, { amount: 1, date: bad }), 'La fecha del cobro no es válida.');
  await rejectedUnchanged(storage, () => repo.updateOrder(id, { price: 800 }), 'El precio final no puede ser menor a lo cobrado.');
  const result = await repo.registerPayment(id, { amount: 4000, date });
  expect(result.orders.find(o => o.id === id)?.paid).toBe(5000);
});

test('precio cero no es seña y sumas no representables no alteran históricos', async () => {
  const { repo, storage, id } = await setup();
  await repo.updateOrder(id, { price: 0 });
  expect(paymentStatus((await repo.load()).orders.find(o => o.id === id)!)).toBe('Cobrado');
  await rejectedUnchanged(storage, () => repo.registerPayment(id, { amount: 1, date }), 'El cobro supera el saldo pendiente.');
  await repo.updateOrder(id, { price: null });
  await repo.registerPayment(id, { amount: Number.MAX_VALUE, date });
  await rejectedUnchanged(storage, () => repo.registerPayment(id, { amount: Number.MAX_VALUE, date }), 'El importe no se puede representar.');
  await rejectedUnchanged(storage, () => repo.registerPayment(id, { amount: 1, date }), 'El importe no se puede representar.');
});

test('una sola escritura contiene cobro y acumulado; error libera la cola', async () => {
  class Watched extends MemoryStorage {
    writes: string[] = [];
    override setItem(key: string, value: string) { super.setItem(key, value); this.writes.push(value); }
  }
  const storage = new Watched();
  storage.setItem('rodrigo-crm', JSON.stringify(structuredClone(sampleSeedData)));
  storage.writes.length = 0;
  const repo = new JsonRepository(storage); const base = await repo.load();
  const { id: _, ...order } = base.orders[0]; const added = await repo.addOrder({ ...order, originalId: '', paid: 0, price: null });
  const id = added.orders.at(-1)!.id; const n = storage.writes.length;
  const result = await repo.registerPayment(id, { amount: 123, date });
  expect(storage.writes.length).toBe(n + 1);
  expect(JSON.parse(storage.writes.at(-1)!)).toEqual(result);
  expect(result.orders.find(o => o.id === id)?.paid).toBe(123);
  expect(result.payments.filter(p => p.orderId === id)).toHaveLength(1);
  storage.failWrites = true;
  await rejectedUnchanged(storage, () => repo.registerPayment(id, { amount: 1, date }), 'Error de escritura');
  await rejectedUnchanged(storage, () => repo.updateOrder(id, { equipment: 'No guardado' }), 'Error de escritura');
  expect(storage.writes.length).toBe(n + 1);
  storage.failWrites = false;
  await repo.registerPayment(id, { amount: 1, date });
  expect((await repo.load()).orders.find(o => o.id === id)?.paid).toBe(124);
});

test('lectura fallida y JSON inválido preservan errores existentes y recuperan la cola', async () => {
  const { storage, repo, id } = await setup(); const raw = storage.getItem('rodrigo-crm')!;
  const denied = new JsonRepository(() => { throw Error('denied'); });
  await expect(denied.registerPayment(id, { amount: 1, date })).rejects.toThrow('No se pudieron leer los datos locales. Revisá el acceso al almacenamiento del navegador. No se modificaron.');
  expect(storage.getItem('rodrigo-crm')).toBe(raw);
  storage.setItem('rodrigo-crm', '{');
  await expect(repo.updateOrder(id, {})).rejects.toThrow('No se pudieron leer los datos locales: contenido inválido. No se modificaron.');
  expect(storage.getItem('rodrigo-crm')).toBe('{');
  storage.setItem('rodrigo-crm', raw); await repo.updateOrder(id, {});
  expect(await repo.load()).toEqual(JSON.parse(raw));
});

test('concurrencia mixta conserva orden, cliente, gasto, cambios y cobros', async () => {
  const { repo, storage, id } = await setup(); const before = await repo.load();
  const { id: _, ...order } = before.orders.find(o => o.id === id)!;
  const other = new JsonRepository(storage);
  await Promise.all([repo.registerPayment(id, { amount: 3, date }), other.registerPayment(id, { amount: 4, date }),
    repo.registerPayment(id, { amount: 5, date }), other.updateOrder(id, { equipment: 'Cambio concurrente' }),
    repo.addClient({ name: 'Concurrente', phone: '123' }), other.addOrder({ ...order, equipment: 'Orden concurrente' }),
    repo.addExpense({ description: 'Gasto concurrente', category: 'Otros', amount: 8, date })]);
  const after = await repo.load();
  expect(after.orders.find(o => o.id === id)).toMatchObject({ paid: 12, equipment: 'Cambio concurrente', repair: 'Cerrado', delivery: 'Entregado', finish: order.finish });
  expect(after.payments.filter(p => p.orderId === id).map(p => p.amount)).toEqual([3, 4, 5]);
  expect(after.clients.length).toBe(before.clients.length + 1); expect(after.orders.length).toBe(before.orders.length + 1);
  expect(after.expenses.length).toBe(before.expenses.length + 1); expect(after.orders.at(-1)?.equipment).toBe('Orden concurrente');
});

test('precio y cobro competidores usan saldo actualizado', async () => {
  const { repo, storage, id } = await setup(); const other = new JsonRepository(storage);
  const results = await Promise.allSettled([repo.registerPayment(id, { amount: 1000, date }), other.updateOrder(id, { price: 800 })]);
  expect(results.map(r => r.status)).toEqual(['fulfilled', 'rejected']);
  const after = await repo.load(); expect(after.orders.find(o => o.id === id)).toMatchObject({ paid: 1000, price: null });
  expect(after.payments.filter(p => p.orderId === id)).toHaveLength(1);
  await other.updateOrder(id, { price: 5000 });
  const second = await Promise.allSettled([other.updateOrder(id, { price: 1000 }), repo.registerPayment(id, { amount: 1, date })]);
  expect(second.map(r => r.status)).toEqual(['fulfilled', 'rejected']);
  expect((await repo.load()).orders.find(o => o.id === id)).toMatchObject({ paid: 1000, price: 1000 });
});

test('parche completo de orden cerrada corrige campos sin alterar cobros ni vínculos', async () => {
  const { repo, id } = await setup(); const before = await repo.load();
  const previous = before.orders.find(o => o.id === id)!;
  const clientId = before.clients.find(c => c.id !== previous.clientId)!.id;
  const patch = { clientId, equipment: 'Corregido', mode: 'Domicilio' as const, address: 'Calle', fault: 'Falla', diagnosis: 'Diagnóstico', parts: 'Pieza', partsCost: 10, labor: 20, quote: 30, price: 50, repair: 'Estado legado', delivery: 'Pendiente' as const, entry: 'fecha libre', finish: 'fin libre', owner: 'Técnico' };
  const saved = await repo.updateOrder(id, patch);
  expect(saved.orders.find(o => o.id === id)).toEqual({ ...previous, ...patch });
  expect(saved.payments).toEqual(before.payments);
  const paid = await repo.registerPayment(id, { amount: 50, date });
  expect(paid.orders.find(o => o.id === id)).toEqual({ ...previous, ...patch, paid: 50 });
  expect(paid.payments.length).toBe(before.payments.length + 1);
});

test('Web Locks recibe la misma clave y libera tras rechazo', async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
  const keys: string[] = []; let active = 0; let maxActive = 0;
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { locks: { request: async (key: string, callback: () => Promise<unknown>) => {
    keys.push(key); active++; maxActive = Math.max(maxActive, active);
    try { return await callback(); } finally { active--; }
  } } } });
  try {
    const { repo, storage, id } = await setup();
    await Promise.allSettled([repo.registerPayment(id, { amount: -1, date }), new JsonRepository(storage).registerPayment(id, { amount: 1, date })]);
    expect(keys.every(key => key === 'rodrigo-crm')).toBe(true); expect(keys.length).toBe(3); expect(maxActive).toBe(1); expect(active).toBe(0);
    expect((await repo.load()).orders.find(o => o.id === id)?.paid).toBe(1);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'navigator', descriptor); else Reflect.deleteProperty(globalThis, 'navigator');
  }
});
