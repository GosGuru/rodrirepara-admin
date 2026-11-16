import { expect, test } from 'bun:test';
import { JsonRepository, MemoryStorage } from './repository';

test('concurrent duplicate clients return their own distinct persisted identities', async () => {
  const storage = new MemoryStorage();
  const first = new JsonRepository(storage), second = new JsonRepository(storage);
  const before = await first.load();
  const [a, b] = await Promise.all([
    first.addClientWithId({ name: 'Mismo nombre', phone: '123' }),
    second.addClientWithId({ name: 'Mismo nombre', phone: '123' }),
  ]);
  expect(a.clientId).not.toBe(b.clientId);
  for (const result of [a, b]) {
    expect(result.data.clients.find(client => client.id === result.clientId)).toEqual({ id: result.clientId, name: 'Mismo nombre', phone: '123' });
  }
  const after = await first.load();
  expect(after.clients).toHaveLength(before.clients.length + 2);
  expect(after.clients.filter(client => [a.clientId, b.clientId].includes(client.id))).toHaveLength(2);
  for (const key of ['orders', 'expenses', 'leads', 'payments', 'partsPurchases'] as const) expect(after[key]).toEqual(before[key]);
});

test('invalid and failed identity-returning writes leave storage unchanged and queue recovers', async () => {
  const storage = new MemoryStorage(), repo = new JsonRepository(storage);
  await repo.addClient({ name: 'Inicial', phone: '123' });
  const raw = storage.getItem('rodrigo-crm'), before = await repo.load();
  await expect(repo.addClientWithId({ name: ' ', phone: '123' })).rejects.toThrow('Los datos locales no son válidos. No se modificaron.');
  expect(storage.getItem('rodrigo-crm')).toBe(raw); expect(await repo.load()).toEqual(before);
  storage.failWrites = true;
  await expect(repo.addClientWithId({ name: 'Fallido', phone: '123' })).rejects.toThrow('Error de escritura');
  storage.failWrites = false;
  expect(storage.getItem('rodrigo-crm')).toBe(raw); expect(await repo.load()).toEqual(before);
  const saved = await repo.addClientWithId({ name: 'Válido', phone: '123' });
  expect(saved.data.clients.find(client => client.id === saved.clientId)?.name).toBe('Válido');
});

test('existing addClient continues to return Data without identity metadata', async () => {
  const repo = new JsonRepository(new MemoryStorage()), before = await repo.load();
  const result = await repo.addClient({ name: 'Julia', phone: '456' });
  expect(result.clients).toHaveLength(before.clients.length + 1);
  expect(result.clients.some(client => client.name === 'Julia')).toBe(true);
  expect(Object.keys(result).sort()).toEqual(Object.keys(before).sort());
  expect(await repo.load()).toEqual(result);
});
