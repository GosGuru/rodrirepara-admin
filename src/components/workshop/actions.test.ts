import { expect, test } from 'bun:test';
import { JsonRepository, MemoryStorage, type CRMRepository, type Data } from '../../repository';
import { dashboard } from '../../selectors';
import { createWorkshopActions } from './actions';

test('acciones aplican datos persistidos y anuncian solo el éxito, sin filtrar fallos', async () => {
  const storage = new MemoryStorage();
  const repo = new JsonRepository(storage);
  const before = await repo.load();
  const id = before.orders[0].id;
  let applied: Data | undefined;
  const notices: string[] = [];
  const actions = createWorkshopActions(repo, data => { applied = data; }, text => notices.push(text));
  await actions.updateOrder(id, { owner: 'Prueba' });
  expect(applied?.orders.find(order => order.id === id)?.owner).toBe('Prueba');
  expect((await repo.load()).orders.find(order => order.id === id)?.owner).toBe('Prueba');
  expect(notices).toEqual(['', `Orden ${id} actualizada en este navegador.`]);
  const persisted = storage.getItem('rodrigo-crm');
  storage.failWrites = true;
  await expect(actions.updateOrder(id, { owner: 'Otro' })).rejects.toThrow('No se guardó. Revisá los datos o el espacio disponible y volvé a intentar.');
  expect(storage.getItem('rodrigo-crm')).toBe(persisted);
  expect(notices.at(-1)).toBe('');
  storage.failWrites = false;
  await expect(actions.registerPayment(id, { amount: -1, date: '2024-01-01' })).rejects.toThrow('El importe debe ser un número positivo y finito.');
  expect(storage.getItem('rodrigo-crm')).toBe(persisted);
  expect(notices.at(-1)).toBe('');
});

test('edición y cobro esperan la persistencia, conservan destino y aplican exactamente una vez', async () => {
  const repo = new JsonRepository(new MemoryStorage());
  const initial = await repo.load();
  const target = initial.orders[0];
  const events: unknown[] = [];
  let release!: () => void;
  let gate = new Promise<void>(resolve => { release = resolve; });
  const calls: unknown[] = [];
  const controlled: CRMRepository = {
    load: () => repo.load(), addClient: input => repo.addClient(input), addClientWithId: input => repo.addClientWithId(input), addOrder: input => repo.addOrder(input), addExpense: input => repo.addExpense(input),
    updateOrder: async (id, patch) => { calls.push([id, structuredClone(patch)]); await gate; return repo.updateOrder(id, patch); },
    registerPayment: async (id, input) => { calls.push([id, structuredClone(input)]); await gate; return repo.registerPayment(id, input); },
  };
  const actions = createWorkshopActions(controlled, data => events.push(['apply', data]), text => events.push(['notice', text]));
  const patch = { price: null, owner: 'Nueva persona' };
  let id = target.id;
  const edit = actions.updateOrder(id, patch);
  id = 'otro-id';
  expect(calls[0]).toEqual([target.id, patch]);
  expect(events).toEqual([['notice', '']]);
  expect(await repo.load()).toEqual(initial);
  release(); await edit;
  const edited = await repo.load();
  expect(events).toEqual([['notice', ''], ['apply', edited], ['notice', `Orden ${target.id} actualizada en este navegador.`]]);
  expect(edited.orders.filter(o => o.id !== target.id)).toEqual(initial.orders.filter(o => o.id !== target.id));
  expect(edited.payments).toEqual(initial.payments);
  expect(edited.orders.find(o => o.id === target.id)).toEqual({ ...target, ...patch });
  events.length = 0;
  gate = new Promise<void>(resolve => { release = resolve; });
  const input = { amount: 1000, date: '2024-02-01' };
  id = target.id;
  const payment = actions.registerPayment(id, input);
  id = 'otro-id';
  expect(calls[1]).toEqual([target.id, input]);
  expect(events).toEqual([['notice', '']]);
  expect(await repo.load()).toEqual(edited);
  release(); await payment;
  const paid = await repo.load();
  expect(events).toEqual([['notice', ''], ['apply', paid], ['notice', `Cobro de ${target.id} registrado en este navegador.`]]);
  expect(paid.payments.length).toBe(edited.payments.length + 1);
  expect(paid.payments.at(-1)).toMatchObject({ orderId: target.id, ...input });
  expect(paid.orders.find(o => o.id === target.id)).toEqual({ ...edited.orders.find(o => o.id === target.id), paid: target.paid + 1000 });
  expect(paid.orders.filter(o => o.id !== target.id)).toEqual(edited.orders.filter(o => o.id !== target.id));
  expect(paid.clients).toEqual(edited.clients);
  expect(paid.expenses).toEqual(edited.expenses);
});

test('rechazos de dominio y almacenamiento preservan estado, indicadores y cola', async () => {
  const storage = new MemoryStorage();
  const repo = new JsonRepository(storage);
  const initial = await repo.load();
  const target = initial.orders[0];
  const events: unknown[] = [];
  const actions = createWorkshopActions(repo, data => events.push(['apply', data]), text => events.push(['notice', text]));
  await actions.updateOrder(target.id, { price: null });
  events.length = 0;
  const snapshot = storage.getItem('rodrigo-crm');
  const data = await repo.load();
  const metrics = dashboard(data, '2024-02-01');
  await expect(actions.registerPayment(target.id, { amount: -1, date: '2024-02-01' })).rejects.toThrow('El importe debe ser un número positivo y finito.');
  storage.failWrites = true;
  await expect(actions.registerPayment(target.id, { amount: 1, date: '2024-02-01' })).rejects.toThrow('No se guardó. Revisá los datos o el espacio disponible y volvé a intentar.');
  storage.failWrites = false;
  expect(events).toEqual([['notice', ''], ['notice', '']]);
  expect(storage.getItem('rodrigo-crm')).toBe(snapshot);
  expect(await repo.load()).toEqual(data);
  expect(dashboard(await repo.load(), '2024-02-01')).toEqual(metrics);
  await actions.registerPayment(target.id, { amount: 1, date: '2024-02-01' });
  expect(events.at(-1)).toEqual(['notice', `Cobro de ${target.id} registrado en este navegador.`]);
  expect((await repo.load()).payments.length).toBe(data.payments.length + 1);
});

test('errores desconocidos de lectura o bloqueo no exponen detalles ni anuncian éxito', async () => {
  const repo = new JsonRepository(new MemoryStorage());
  for (const message of ['read secret stack', 'lock denied']) {
    const events: unknown[] = [];
    const fake: CRMRepository = { load: () => repo.load(), addClient: input => repo.addClient(input), addClientWithId: input => repo.addClientWithId(input), addOrder: input => repo.addOrder(input), addExpense: input => repo.addExpense(input), updateOrder: async () => { throw Error(message); }, registerPayment: async () => { throw Error(message); } };
    const actions = createWorkshopActions(fake, data => events.push(['apply', data]), text => events.push(['notice', text]));
    await expect(actions.updateOrder('RR-1030', { owner: 'X' })).rejects.toThrow('No se guardó. Revisá los datos o el espacio disponible y volvé a intentar.');
    await expect(actions.registerPayment('RR-1030', { amount: 1, date: '2024-01-01' })).rejects.toThrow('No se guardó. Revisá los datos o el espacio disponible y volvé a intentar.');
    expect(events).toEqual([['notice', ''], ['notice', '']]);
  }
});
