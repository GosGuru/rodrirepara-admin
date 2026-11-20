import { describe, expect, test } from 'bun:test';
import { SupabaseRepository, type SupabaseClientLike } from './supabase-repository';
import { getSupabaseConfig } from './lib/supabase';

type TableName = 'clients' | 'orders' | 'expenses' | 'leads' | 'payments' | 'parts_purchases';

type DbRow = Record<string, unknown>;

function createFakeSupabase(initial?: Partial<Record<TableName, DbRow[]>>, options?: {
  failTable?: TableName;
  failError?: { code?: string; message: string; status?: number };
  rpcError?: { code?: string; message: string; status?: number };
}) {
  const tables: Record<TableName, DbRow[]> = {
    clients: [...(initial?.clients ?? [])],
    orders: [...(initial?.orders ?? [])],
    expenses: [...(initial?.expenses ?? [])],
    leads: [...(initial?.leads ?? [])],
    payments: [...(initial?.payments ?? [])],
    parts_purchases: [...(initial?.parts_purchases ?? [])],
  };

  const rpcCalls: { fn: string; params: Record<string, unknown> }[] = [];

  const client: SupabaseClientLike = {
    from(table: string) {
      const name = table as TableName;
      return {
        select() {
          return {
            async order() {
              if (options?.failTable === name && options.failError) {
                return { data: null, error: options.failError };
              }
              return { data: structuredClone(tables[name]), error: null };
            },
          };
        },
        async insert(row: Record<string, unknown>) {
          if (options?.failTable === name && options.failError) {
            return { data: null, error: options.failError };
          }
          tables[name].push(structuredClone(row));
          return { data: [row], error: null };
        },
        update(patch: Record<string, unknown>) {
          return {
            async eq(column: string, value: string) {
              if (options?.failTable === name && options.failError) {
                return { data: null, error: options.failError };
              }
              const target = tables[name].find(r => r[column] === value);
              if (!target) return { data: [], error: null };
              Object.assign(target, structuredClone(patch));
              return { data: [target], error: null };
            },
          };
        },
      };
    },
    async rpc(fn: string, params: Record<string, unknown>) {
      rpcCalls.push({ fn, params });
      if (options?.rpcError) {
        return { data: null, error: options.rpcError };
      }
      if (fn === 'register_payment') {
        const order = tables.orders.find(o => o.id === params.p_order_id);
        if (!order) return { data: null, error: { message: 'No se encontró la orden.' } };
        const nextPaid = Number((Number(order.paid) + Number(params.p_amount)).toFixed(2));
        if (order.price !== null && nextPaid > Number(order.price)) {
          return { data: null, error: { message: 'El cobro supera el saldo pendiente.' } };
        }
        order.paid = nextPaid;
        tables.payments.push({
          id: crypto.randomUUID(),
          order_id: params.p_order_id,
          amount: params.p_amount,
          date: params.p_date,
        });
        return { data: { order_id: params.p_order_id, paid: nextPaid }, error: null };
      }
      return { data: null, error: { message: `Unknown RPC ${fn}` } };
    },
  };

  return { client, tables, rpcCalls };
}

describe('getSupabaseConfig', () => {
  test('reads NEXT_PUBLIC_* first and falls back to VITE_*', () => {
    expect(getSupabaseConfig({
      NEXT_PUBLIC_SUPABASE_URL: 'https://demo.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_123',
    })).toEqual({
      url: 'https://demo.supabase.co',
      publishableKey: 'sb_publishable_123',
    });

    expect(getSupabaseConfig({
      VITE_SUPABASE_URL: 'https://vite.supabase.co',
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_vite',
    })).toEqual({
      url: 'https://vite.supabase.co',
      publishableKey: 'sb_publishable_vite',
    });

    expect(getSupabaseConfig({})).toBeNull();
  });
});

describe('SupabaseRepository', () => {
  test('loads empty database cleanly with zero seed rows', async () => {
    const { client } = createFakeSupabase();
    const repo = new SupabaseRepository(client);
    const data = await repo.load();
    expect(data).toEqual({
      clients: [],
      orders: [],
      expenses: [],
      leads: [],
      payments: [],
      partsPurchases: [],
    });
  });

  test('maps snake_case DB rows and numeric strings into validated Data', async () => {
    const { client } = createFakeSupabase({
      clients: [{ id: 'c1', name: 'Ana', phone: '099 111 222' }],
      orders: [{
        id: 'o1',
        client_id: 'c1',
        equipment: 'Samsung 8kg',
        mode: 'Taller',
        address: 'Recepción en taller',
        fault: 'No centrifuga',
        diagnosis: 'Correa floja',
        parts: 'Correa',
        parts_cost: '450.50',
        labor: '1200.00',
        quote: '2000',
        price: '2000.00',
        paid: '500.00',
        repair: 'En reparación',
        delivery: 'Pendiente',
        entry: '2026-11-19',
        finish: '',
        owner: 'Rodrigo',
        original_id: '',
      }],
      expenses: [{ id: 'e1', description: 'Flete', category: 'Traslados', amount: '350.25', date: '2026-11-19' }],
      leads: [{ id: 'l1', name: 'Luis', phone: '098 111 222', problem: 'No enciende', date: '2026-11-19', source: 'WhatsApp', state: 'Nueva' }],
      payments: [{ id: 'p1', order_id: 'o1', amount: '500.00', date: '2026-11-19' }],
      parts_purchases: [{ id: 'pp1', name: 'Correa', cost: '450.50', sale: '700', supplier: 'Casa Sur', date: '2026-11-19', order_id: 'o1', quantity: '1' }],
    });
    const repo = new SupabaseRepository(client);
    const data = await repo.load();
    expect(data.orders[0].clientId).toBe('c1');
    expect(data.orders[0].partsCost).toBe(450.5);
    expect(data.orders[0].paid).toBe(500);
    expect(data.payments[0].orderId).toBe('o1');
    expect(data.partsPurchases[0].cost).toBe(450.5);
    expect(data.expenses[0].amount).toBe(350.25);
  });

  test('supports full CRM CRUD flow: addClientWithId, addOrder, updateOrder, registerPayment (RPC), addExpense', async () => {
    const { client, rpcCalls } = createFakeSupabase();
    const repo = new SupabaseRepository(client);

    const { data: afterClient, clientId } = await repo.addClientWithId({ name: 'Carlos', phone: '099 222 333' });
    expect(afterClient.clients).toHaveLength(1);
    expect(clientId).toBeTruthy();

    const afterOrder = await repo.addOrder({
      clientId,
      equipment: 'LG Direct Drive',
      mode: 'Taller',
      address: 'Recepción en taller',
      fault: 'Error OE',
      diagnosis: '',
      parts: '',
      partsCost: 0,
      labor: 1500,
      quote: 3000,
      price: 3000,
      paid: 0,
      repair: 'Ingresado',
      delivery: 'Pendiente',
      entry: '2026-11-19',
      finish: '',
      owner: 'Rodrigo',
      originalId: '',
    });
    expect(afterOrder.orders).toHaveLength(1);
    const orderId = afterOrder.orders[0].id;

    const afterEdit = await repo.updateOrder(orderId, { repair: 'Terminado', finish: '2026-11-19' });
    expect(afterEdit.orders[0].repair).toBe('Terminado');
    expect(afterEdit.orders[0].finish).toBe('2026-11-19');

    const afterPayment = await repo.registerPayment(orderId, { amount: 1500, date: '2026-11-19' });
    expect(rpcCalls).toHaveLength(1);
    expect(rpcCalls[0]).toEqual({
      fn: 'register_payment',
      params: { p_order_id: orderId, p_amount: 1500, p_date: '2026-11-19' },
    });
    expect(afterPayment.orders[0].paid).toBe(1500);
    expect(afterPayment.payments).toHaveLength(1);

    const afterExpense = await repo.addExpense({
      description: 'Repuesto bomba',
      category: 'Repuestos',
      amount: 900,
      date: '2026-11-19',
    });
    expect(afterExpense.expenses).toHaveLength(1);
  });

  test('enforces domain invariants before writing (disallowed fields, price < paid, warranty lock, bad payment)', async () => {
    const { client } = createFakeSupabase({
      clients: [
        { id: 'c1', name: 'Ana', phone: '099 111 111' },
        { id: 'c2', name: 'Beto', phone: '099 222 222' },
      ],
      orders: [
        {
          id: 'o1', client_id: 'c1', equipment: 'Samsung', mode: 'Taller', address: 'Taller',
          fault: 'Ruido', diagnosis: '', parts: '', parts_cost: 0, labor: 1000, quote: 2000,
          price: 2000, paid: 1000, repair: 'Terminado', delivery: 'Entregado',
          entry: '2026-11-10', finish: '2026-11-11', owner: 'Rodrigo', original_id: '',
        },
        {
          id: 'o2', client_id: 'c1', equipment: 'Samsung', mode: 'Taller', address: 'Taller',
          fault: 'Garantía', diagnosis: '', parts: '', parts_cost: 0, labor: 0, quote: 0,
          price: 0, paid: 0, repair: 'Ingresado', delivery: 'Pendiente',
          entry: '2026-11-19', finish: '', owner: 'Rodrigo', original_id: 'o1',
        },
      ],
    });
    const repo = new SupabaseRepository(client);

    await expect(repo.updateOrder('o1', { paid: 0 } as never)).rejects.toThrow('La edición contiene campos no permitidos.');
    await expect(repo.updateOrder('o1', { price: 500 })).rejects.toThrow('El precio final no puede ser menor a lo cobrado.');
    await expect(repo.updateOrder('o2', { clientId: 'c2' })).rejects.toThrow('El cliente no puede cambiar si rompe una garantía.');
    await expect(repo.registerPayment('o1', { amount: 0, date: '2026-11-19' })).rejects.toThrow('El importe debe ser un número positivo y finito.');
    await expect(repo.registerPayment('o1', { amount: 500, date: '2026-02-31' })).rejects.toThrow('La fecha del cobro no es válida.');
    await expect(repo.registerPayment('o1', { amount: 1500, date: '2026-11-19' })).rejects.toThrow('El cobro supera el saldo pendiente.');
  });

  test('maps Supabase schema/permission/session errors into safe Spanish messages', async () => {
    const missingSchema = createFakeSupabase({}, {
      failTable: 'clients',
      failError: { code: '42P01', message: 'relation "public.clients" does not exist' },
    });
    await expect(new SupabaseRepository(missingSchema.client).load()).rejects.toThrow(
      'Faltan las tablas en Supabase. Ejecutá supabase/schema.sql en el SQL Editor.',
    );

    const permissionDenied = createFakeSupabase({}, {
      failTable: 'clients',
      failError: { code: '42501', message: 'permission denied for table clients' },
    });
    await expect(new SupabaseRepository(permissionDenied.client).load()).rejects.toThrow(
      'Tu sesión expiró o no tenés permisos. Volvé a iniciar sesión.',
    );
  });
});
