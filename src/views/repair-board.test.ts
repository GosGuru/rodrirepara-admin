import { expect, test } from 'bun:test';
import { moveChoices, moveRepair } from './repair-board';
import type { WorkshopActions } from '../components/workshop/actions';
import { createWorkshopActions } from '../components/workshop/actions';
import { JsonRepository, MemoryStorage, type Data } from '../repository';
import { dashboard } from '../selectors';

test('movimiento exige selección exacta, captura ID y espera solo patch de reparación', async () => {
  const calls: unknown[] = []; let resolve!: () => void;
  const actions: WorkshopActions = { updateOrder: (id, patch) => { calls.push([id, patch]); return new Promise<void>(r => { resolve = r; }); }, registerPayment: async () => { throw Error('unexpected'); } };
  expect(moveChoices.pending).toEqual(['Visita o recepción', 'Esperando aprobación', 'Esperando repuestos']);
  expect(await moveRepair(actions, 'A', 'ready', 'pending', '')).toBe(false);
  expect(await moveRepair(actions, 'A', 'pending', 'pending', 'Esperando repuestos')).toBe(false);
  expect(await moveRepair(undefined, 'A', 'ready', 'pending', 'Esperando repuestos')).toBe(false);
  expect(calls).toEqual([]);
  let finished = false;
  const result = moveRepair(actions, 'A', 'ready', 'pending', 'Esperando repuestos').then(value => { finished = true; return value; });
  expect(calls).toEqual([['A', { repair: 'Esperando repuestos' }]]); expect(finished).toBe(false);
  resolve(); expect(await result).toBe(true);
  expect(moveChoices.progress).toEqual(['En reparación']); expect(moveChoices.ready).toEqual(['Terminado']);
});
test('fallo de callback se propaga sin operación adicional', async () => {
  let calls = 0;
  const actions: WorkshopActions = { updateOrder: async () => { calls++; throw Error('fallo'); }, registerPayment: async () => { throw Error('unexpected'); } };
  await expect(moveRepair(actions, 'A', 'other', 'ready', 'Terminado')).rejects.toThrow('fallo');
  expect(calls).toBe(1);
});

class ObservedStorage extends MemoryStorage {
  fail = false;
  attempts = 0;
  writes = 0;
  override setItem(key: string, value: string) {
    this.attempts++;
    if (this.fail) throw new Error('private disk failure');
    super.setItem(key, value);
    this.writes++;
  }
}
async function persistedBoard() {
  const storage = new ObservedStorage();
  const repo = new JsonRepository(storage);
  await repo.updateOrder('RR-1049', {});
  const applied: Data[] = [], notices: string[] = [];
  const actions = createWorkshopActions(repo, value => applied.push(value), text => notices.push(text));
  return { storage, repo, actions, applied, notices, before: await repo.load() };
}

test('cancelar selección, destino inválido, misma columna y lectura no escriben ni publican éxito', async () => {
  const { storage, repo, actions, applied, notices, before } = await persistedBoard();
  const writes = storage.writes, attempts = storage.attempts;
  const totals = dashboard(before, '2026-06-18');
  for (const result of [
    await moveRepair(actions, 'RR-1049', 'ready', 'pending', ''),
    await moveRepair(actions, 'RR-1049', 'ready', 'pending', 'Pendiente'),
    await moveRepair(actions, 'RR-1049', 'ready', 'ready', 'Terminado'),
    await moveRepair(undefined, 'RR-1049', 'ready', 'pending', 'Esperando aprobación'),
  ]) expect(result).toBe(false);
  expect(storage.writes).toBe(writes); expect(storage.attempts).toBe(attempts);
  expect(await new JsonRepository(storage).load()).toEqual(before);
  expect(dashboard(await repo.load(), '2026-06-18')).toEqual(totals);
  expect(applied).toEqual([]); expect(notices).toEqual([]);
});

test('movimiento elegido persiste exclusivamente reparación y conserva entidades, cobros y fechas', async () => {
  const { storage, actions, applied, notices, before } = await persistedBoard();
  const writes = storage.writes;
  expect(await moveRepair(actions, 'RR-1049', 'ready', 'pending', 'Esperando aprobación')).toBe(true);
  const after = await new JsonRepository(storage).load();
  const expected = { ...before, orders: before.orders.map(order => order.id === 'RR-1049' ? { ...order, repair: 'Esperando aprobación' } : order) };
  expect(after).toEqual(expected);
  expect(storage.writes).toBe(writes + 1);
  expect(applied).toEqual([after]);
  expect(notices).toEqual(['', 'Orden RR-1049 actualizada en este navegador.']);
  expect(dashboard(after, '2026-06-18')).toEqual(dashboard(before, '2026-06-18'));
});

test('fallo real de escritura conserva snapshot y totales, enmascara error y libera la cola', async () => {
  const { storage, repo, actions, applied, notices, before } = await persistedBoard();
  const writes = storage.writes;
  storage.fail = true;
  await expect(moveRepair(actions, 'RR-1049', 'ready', 'progress', 'En reparación')).rejects.toThrow('No se guardó. Revisá los datos o el espacio disponible y volvé a intentar.');
  expect(storage.writes).toBe(writes);
  expect(await new JsonRepository(storage).load()).toEqual(before);
  expect(dashboard(await repo.load(), '2026-06-18')).toEqual(dashboard(before, '2026-06-18'));
  expect(applied).toEqual([]); expect(notices).toEqual(['']);
  storage.fail = false;
  expect(await moveRepair(actions, 'RR-1049', 'ready', 'progress', 'En reparación')).toBe(true);
  const after = await repo.load();
  expect(after).toEqual({ ...before, orders: before.orders.map(order => order.id === 'RR-1049' ? { ...order, repair: 'En reparación' } : order) });
  expect(storage.writes).toBe(writes + 1); expect(applied).toEqual([after]);
  expect(notices).toEqual(['', '', 'Orden RR-1049 actualizada en este navegador.']);
});

test('movimiento y cobro concurrentes preservan ambos cambios sin sobrescribir otros campos', async () => {
  const { storage, actions, before } = await persistedBoard();
  const peer = createWorkshopActions(new JsonRepository(storage), () => {}, () => {});
  await Promise.all([
    moveRepair(actions, 'RR-1049', 'ready', 'progress', 'En reparación'),
    peer.registerPayment('RR-1049', { amount: 500, date: '2026-06-18' }),
  ]);
  const after = await new JsonRepository(storage).load();
  expect(after.orders).toEqual(before.orders.map(order => order.id === 'RR-1049' ? { ...order, repair: 'En reparación', paid: order.paid + 500 } : order));
  expect(after.payments.slice(0, before.payments.length)).toEqual(before.payments);
  expect(after.payments).toHaveLength(before.payments.length + 1);
  expect(after.payments.at(-1)).toMatchObject({ orderId: 'RR-1049', amount: 500, date: '2026-06-18' });
  expect({ clients: after.clients, leads: after.leads, expenses: after.expenses, partsPurchases: after.partsPurchases }).toEqual({ clients: before.clients, leads: before.leads, expenses: before.expenses, partsPurchases: before.partsPurchases });
  const totals = dashboard(before, '2026-06-18');
  expect(dashboard(after, '2026-06-18')).toEqual({ ...totals, collected: totals.collected + 500, pending: totals.pending - 500 });
});
