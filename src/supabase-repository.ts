import {
  validateData,
  validateOrderPatch,
  validatePaymentInput,
  type CRMRepository,
  type Client,
  type Data,
  type Expense,
  type Order,
  type OrderUpdate,
  type PaymentInput,
} from './repository';

export type SupabaseErrorLike = {
  code?: string;
  message: string;
  status?: number;
};

type QueryResult<T> = PromiseLike<{ data: T | null; error: SupabaseErrorLike | null }>;

export interface SupabaseTableLike {
  select(columns: string): {
    order(column: string, options?: { ascending?: boolean }): QueryResult<Record<string, unknown>[]>;
  };
  insert(values: Record<string, unknown>): QueryResult<unknown>;
  update(values: Record<string, unknown>): {
    eq(column: string, value: string): QueryResult<unknown>;
  };
}

export interface SupabaseClientLike {
  from(table: string): SupabaseTableLike;
  rpc(fn: string, params: Record<string, unknown>): QueryResult<unknown>;
}

const SAFE_DOMAIN_ERRORS = new Set([
  'No se encontró la orden.',
  'La edición contiene campos no permitidos.',
  'El precio final no puede ser menor a lo cobrado.',
  'El cliente no puede cambiar si rompe una garantía.',
  'El importe debe ser un número positivo y finito.',
  'La fecha del cobro no es válida.',
  'El importe no se puede representar.',
  'El cobro supera el saldo pendiente.',
  'Tu sesión expiró o no tenés permisos. Volvé a iniciar sesión.',
  'Los datos ingresados no son válidos. No se guardaron.',
]);

export function mapSupabaseError(error: SupabaseErrorLike | null | undefined): Error {
  if (!error) return new Error('No se pudo conectar con Supabase. Volvé a intentar.');
  const message = typeof error.message === 'string' ? error.message.trim() : '';
  if (SAFE_DOMAIN_ERRORS.has(message)) return new Error(message);

  const code = error.code ?? '';
  if (
    code === '42P01' ||
    code === 'PGRST205' ||
    code === 'PGRST202' ||
    /does not exist|schema cache/i.test(message)
  ) {
    return new Error('Faltan las tablas en Supabase. Ejecutá supabase/schema.sql en el SQL Editor.');
  }
  if (
    code === '42501' ||
    code === 'PGRST301' ||
    error.status === 401 ||
    error.status === 403 ||
    /permission denied|row-level security|jwt|not authenticated/i.test(message)
  ) {
    return new Error('Tu sesión expiró o no tenés permisos. Volvé a iniciar sesión.');
  }
  return new Error('No se pudo conectar con la base de datos. Revisá tu conexión y volvé a intentar.');
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && value.trim().length > 0) return Number(value);
  return NaN;
}

function mapClientRow(row: Record<string, unknown>): Client {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    phone: String(row.phone ?? ''),
  };
}

function mapOrderRow(row: Record<string, unknown>): Order {
  return {
    id: String(row.id ?? ''),
    clientId: String(row.client_id ?? ''),
    equipment: String(row.equipment ?? ''),
    mode: row.mode as Order['mode'],
    address: String(row.address ?? ''),
    fault: String(row.fault ?? ''),
    diagnosis: String(row.diagnosis ?? ''),
    parts: String(row.parts ?? ''),
    partsCost: toNumber(row.parts_cost),
    labor: toNumber(row.labor),
    quote: toNumber(row.quote),
    price: row.price === null || row.price === undefined ? null : toNumber(row.price),
    paid: toNumber(row.paid),
    repair: String(row.repair ?? ''),
    delivery: row.delivery as Order['delivery'],
    entry: String(row.entry ?? ''),
    finish: String(row.finish ?? ''),
    owner: String(row.owner ?? ''),
    originalId: String(row.original_id ?? ''),
  };
}

function mapExpenseRow(row: Record<string, unknown>): Expense {
  return {
    id: String(row.id ?? ''),
    description: String(row.description ?? ''),
    category: String(row.category ?? ''),
    amount: toNumber(row.amount),
    date: String(row.date ?? ''),
  };
}

function mapLeadRow(row: Record<string, unknown>): Data['leads'][number] {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    phone: String(row.phone ?? ''),
    problem: String(row.problem ?? ''),
    date: String(row.date ?? ''),
    source: String(row.source ?? ''),
    state: String(row.state ?? ''),
  };
}

function mapPaymentRow(row: Record<string, unknown>): Data['payments'][number] {
  return {
    id: String(row.id ?? ''),
    orderId: String(row.order_id ?? ''),
    amount: toNumber(row.amount),
    date: String(row.date ?? ''),
  };
}

function mapPartsPurchaseRow(row: Record<string, unknown>): Data['partsPurchases'][number] {
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    cost: toNumber(row.cost),
    sale: toNumber(row.sale),
    supplier: String(row.supplier ?? ''),
    date: String(row.date ?? ''),
    orderId: String(row.order_id ?? ''),
    quantity: toNumber(row.quantity),
  };
}

function orderPatchToDb(patch: OrderUpdate): Record<string, unknown> {
  const mapped: Record<string, unknown> = {};
  if (patch.clientId !== undefined) mapped.client_id = patch.clientId;
  if (patch.equipment !== undefined) mapped.equipment = patch.equipment;
  if (patch.mode !== undefined) mapped.mode = patch.mode;
  if (patch.address !== undefined) mapped.address = patch.address;
  if (patch.fault !== undefined) mapped.fault = patch.fault;
  if (patch.diagnosis !== undefined) mapped.diagnosis = patch.diagnosis;
  if (patch.parts !== undefined) mapped.parts = patch.parts;
  if (patch.partsCost !== undefined) mapped.parts_cost = patch.partsCost;
  if (patch.labor !== undefined) mapped.labor = patch.labor;
  if (patch.quote !== undefined) mapped.quote = patch.quote;
  if (patch.price !== undefined) mapped.price = patch.price;
  if (patch.repair !== undefined) mapped.repair = patch.repair;
  if (patch.delivery !== undefined) mapped.delivery = patch.delivery;
  if (patch.entry !== undefined) mapped.entry = patch.entry;
  if (patch.finish !== undefined) mapped.finish = patch.finish;
  if (patch.owner !== undefined) mapped.owner = patch.owner;
  return mapped;
}

export class SupabaseRepository implements CRMRepository {
  constructor(private readonly client: SupabaseClientLike) {}

  async load(): Promise<Data> {
    const [clientsRes, ordersRes, expensesRes, leadsRes, paymentsRes, partsRes] = await Promise.all([
      this.client.from('clients').select('*').order('created_at', { ascending: true }),
      this.client.from('orders').select('*').order('created_at', { ascending: true }),
      this.client.from('expenses').select('*').order('created_at', { ascending: true }),
      this.client.from('leads').select('*').order('created_at', { ascending: true }),
      this.client.from('payments').select('*').order('created_at', { ascending: true }),
      this.client.from('parts_purchases').select('*').order('created_at', { ascending: true }),
    ]);

    const firstError =
      clientsRes.error ??
      ordersRes.error ??
      expensesRes.error ??
      leadsRes.error ??
      paymentsRes.error ??
      partsRes.error;
    if (firstError) throw mapSupabaseError(firstError);

    const raw: Data = {
      clients: (clientsRes.data ?? []).map(mapClientRow),
      orders: (ordersRes.data ?? []).map(mapOrderRow),
      expenses: (expensesRes.data ?? []).map(mapExpenseRow),
      leads: (leadsRes.data ?? []).map(mapLeadRow),
      payments: (paymentsRes.data ?? []).map(mapPaymentRow),
      partsPurchases: (partsRes.data ?? []).map(mapPartsPurchaseRow),
    };

    return validateData(raw, 'Los datos recibidos de Supabase no son válidos.');
  }

  async addClient(input: Omit<Client, 'id'>): Promise<Data> {
    return (await this.addClientWithId(input)).data;
  }

  async addClientWithId(input: Omit<Client, 'id'>): Promise<{ data: Data; clientId: string }> {
    const current = await this.load();
    const clientId = crypto.randomUUID();
    const nextClient: Client = { id: clientId, name: input.name, phone: input.phone };
    validateData(
      { ...current, clients: [...current.clients, nextClient] },
      'Los datos ingresados no son válidos. No se guardaron.',
    );

    const { error } = await this.client.from('clients').insert({
      id: nextClient.id,
      name: nextClient.name,
      phone: nextClient.phone,
    });
    if (error) throw mapSupabaseError(error);

    const data = await this.load();
    return { data, clientId };
  }

  async addOrder(input: Omit<Order, 'id'>): Promise<Data> {
    const current = await this.load();
    const order: Order = { ...input, id: crypto.randomUUID() };
    validateData(
      { ...current, orders: [...current.orders, order] },
      'Los datos ingresados no son válidos. No se guardaron.',
    );

    const { error } = await this.client.from('orders').insert({
      id: order.id,
      client_id: order.clientId,
      equipment: order.equipment,
      mode: order.mode,
      address: order.address,
      fault: order.fault,
      diagnosis: order.diagnosis,
      parts: order.parts,
      parts_cost: order.partsCost,
      labor: order.labor,
      quote: order.quote,
      price: order.price,
      paid: order.paid,
      repair: order.repair,
      delivery: order.delivery,
      entry: order.entry,
      finish: order.finish,
      owner: order.owner,
      original_id: order.originalId,
    });
    if (error) throw mapSupabaseError(error);

    return this.load();
  }

  async addExpense(input: Omit<Expense, 'id'>): Promise<Data> {
    const current = await this.load();
    const expense: Expense = { ...input, id: crypto.randomUUID() };
    validateData(
      { ...current, expenses: [...current.expenses, expense] },
      'Los datos ingresados no son válidos. No se guardaron.',
    );

    const { error } = await this.client.from('expenses').insert({
      id: expense.id,
      description: expense.description,
      category: expense.category,
      amount: expense.amount,
      date: expense.date,
    });
    if (error) throw mapSupabaseError(error);

    return this.load();
  }

  async updateOrder(orderId: string, patch: OrderUpdate): Promise<Data> {
    const current = await this.load();
    const target = validateOrderPatch(current, orderId, patch);
    Object.assign(target, patch);
    validateData(current, 'Los datos ingresados no son válidos. No se guardaron.');

    const dbPatch = orderPatchToDb(patch);
    if (Object.keys(dbPatch).length > 0) {
      const { error } = await this.client.from('orders').update(dbPatch).eq('id', orderId);
      if (error) throw mapSupabaseError(error);
    }

    return this.load();
  }

  async registerPayment(orderId: string, input: PaymentInput): Promise<Data> {
    const current = await this.load();
    validatePaymentInput(current, orderId, input);

    const { error } = await this.client.rpc('register_payment', {
      p_order_id: orderId,
      p_amount: input.amount,
      p_date: input.date,
    });
    if (error) throw mapSupabaseError(error);

    return this.load();
  }
}
