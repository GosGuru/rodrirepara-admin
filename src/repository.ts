import seed from './seed.json';

export type Client = { id: string; name: string; phone: string };
export type Order = {
  id: string; clientId: string; equipment: string; mode: 'Taller' | 'Domicilio';
  address: string; fault: string; diagnosis: string; parts: string; partsCost: number;
  labor: number; quote: number; price: number | null; paid: number; repair: string;
  delivery: 'Pendiente' | 'Entregado'; entry: string; finish: string; owner: string; originalId: string;
};
export type OrderUpdate = Partial<Omit<Order, 'id' | 'paid' | 'originalId'>>;
export type PaymentInput = { amount: number; date: string };
export type Expense = { id: string; description: string; category: string; amount: number; date: string };
export type Data = {
  clients: Client[];
  orders: Order[];
  expenses: Expense[];
  leads: { id: string; name: string; phone: string; problem: string; date: string; source: string; state: string }[];
  payments: { id: string; orderId: string; amount: number; date: string }[];
  partsPurchases: { id: string; name: string; cost: number; sale: number; supplier: string; date: string; orderId: string; quantity: number }[];
};
export interface CRMRepository {
  load(): Promise<Data>;
  addClient(input: Omit<Client, 'id'>): Promise<Data>;
  addClientWithId(input: Omit<Client, 'id'>): Promise<{ data: Data; clientId: string }>;
  addOrder(input: Omit<Order, 'id'>): Promise<Data>;
  addExpense(input: Omit<Expense, 'id'>): Promise<Data>;
  updateOrder(orderId: string, patch: OrderUpdate): Promise<Data>;
  registerPayment(orderId: string, input: PaymentInput): Promise<Data>;
}

export class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  failWrites = false;
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  key(i: number) { return [...this.values.keys()][i] ?? null; }
  getItem(key: string) { return this.values.get(key) ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) {
    if (this.failWrites) throw Error('Error de escritura');
    this.values.set(key, value);
  }
}

export const EMPTY_DATA: Data = {
  clients: [],
  orders: [],
  expenses: [],
  leads: [],
  payments: [],
  partsPurchases: [],
};

const text = (x: unknown) => typeof x === 'string' && x.trim().length > 0;
const amount = (x: unknown) => typeof x === 'number' && Number.isFinite(x) && x >= 0;
export function validateData(value: unknown, errorMessage = 'Los datos locales no son válidos. No se modificaron.'): Data {
  const d = value as Data;
  const fail = (): never => { throw Error(errorMessage); };
  if (!d || typeof d !== 'object' || !['clients', 'orders', 'expenses', 'leads', 'payments', 'partsPurchases'].every(
    key => Array.isArray((d as unknown as Record<string, unknown>)[key]),
  )) return fail();
  const unique = (rows: { id: string }[]) => rows.every(row => row && typeof row === 'object' && text(row.id))
    && new Set(rows.map(row => row.id)).size === rows.length;
  if (![d.clients, d.orders, d.expenses, d.leads, d.payments, d.partsPurchases].every(unique)) return fail();
  if (!d.clients.every(c => text(c.name) && text(c.phone))) return fail();
  if (!d.orders.every(o => d.clients.some(c => c.id === o.clientId)
    && [o.equipment, o.address, o.fault, o.repair, o.entry, o.owner].every(text)
    && ['Taller', 'Domicilio'].includes(o.mode) && ['Pendiente', 'Entregado'].includes(o.delivery)
    && [o.partsCost, o.labor, o.quote, o.paid].every(amount) && (o.price === null || amount(o.price))
    && typeof o.diagnosis === 'string' && typeof o.parts === 'string' && typeof o.finish === 'string'
    && typeof o.originalId === 'string' && (!o.originalId || d.orders.some(other =>
      other.id === o.originalId && other.clientId === o.clientId && other.id !== o.id)))) return fail();
  if (!d.expenses.every(e => [e.description, e.category, e.date].every(text) && amount(e.amount))
    || !d.leads.every(l => [l.name, l.phone, l.problem, l.date, l.source, l.state].every(text))
    || !d.payments.every(p => text(p.date) && amount(p.amount) && d.orders.some(o => o.id === p.orderId))
    || !d.partsPurchases.every(p => [p.name, p.supplier, p.date].every(text)
      && [p.cost, p.sale, p.quantity].every(amount) && d.orders.some(o => o.id === p.orderId))) return fail();
  return structuredClone(d);
}
const validate = (value: unknown) => validateData(value);

export const EDITABLE_ORDER_FIELDS = new Set(['clientId', 'equipment', 'mode', 'address', 'fault', 'diagnosis', 'parts', 'partsCost', 'labor', 'quote', 'price', 'repair', 'delivery', 'entry', 'finish', 'owner']);
const editable = EDITABLE_ORDER_FIELDS;
let writeQueue: Promise<void> = Promise.resolve();

// Interpret each number's shortest decimal representation exactly, avoiding binary addition artifacts.
function decimal(x: number): [bigint, number] {
  const [mantissa, exponent = '0'] = x.toString().toLowerCase().split('e');
  const [whole, fraction = ''] = mantissa.split('.');
  return [BigInt(whole + fraction), fraction.length - Number(exponent)];
}
export function sumDecimal(a: number, b: number): number {
  const [aa, as] = decimal(a); const [bb, bs] = decimal(b);
  const scale = Math.max(as, bs);
  const sum = aa * 10n ** BigInt(scale - as) + bb * 10n ** BigInt(scale - bs);
  const result = Number(`${sum}e${-scale}`);
  if (!Number.isFinite(result)) throw Error('El importe no se puede representar.');
  const [represented, resultScale] = decimal(result);
  const commonScale = Math.max(scale, resultScale);
  if (sum * 10n ** BigInt(commonScale - scale) !== represented * 10n ** BigInt(commonScale - resultScale))
    throw Error('El importe no se puede representar.');
  return result;
}
export function validDate(value: unknown): boolean {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}

export function validateOrderPatch(data: Data, orderId: string, patch: OrderUpdate): Order {
  const order = data.orders.find(o => o.id === orderId);
  if (!order) throw Error('No se encontró la orden.');
  if (!patch || typeof patch !== 'object' || Array.isArray(patch) || Reflect.ownKeys(patch).some(key => typeof key !== 'string' || !editable.has(key)))
    throw Error('La edición contiene campos no permitidos.');
  if (patch.price !== undefined && patch.price !== null && patch.price !== order.price && patch.price < order.paid)
    throw Error('El precio final no puede ser menor a lo cobrado.');
  if (patch.clientId !== undefined && patch.clientId !== order.clientId &&
    ((order.originalId && data.orders.find(o => o.id === order.originalId)?.clientId !== patch.clientId) ||
      data.orders.some(o => o.originalId === order.id && o.clientId !== patch.clientId)))
    throw Error('El cliente no puede cambiar si rompe una garantía.');
  return order;
}

export function validatePaymentInput(data: Data, orderId: string, input: PaymentInput): { order: Order; nextPaid: number } {
  const order = data.orders.find(o => o.id === orderId);
  if (!order) throw Error('No se encontró la orden.');
  if (!input || typeof input.amount !== 'number' || !Number.isFinite(input.amount) || input.amount <= 0)
    throw Error('El importe debe ser un número positivo y finito.');
  if (!validDate(input.date)) throw Error('La fecha del cobro no es válida.');
  const nextPaid = sumDecimal(order.paid, input.amount);
  if (!Number.isFinite(nextPaid) || nextPaid <= order.paid) throw Error('El importe no se puede representar.');
  if (order.price !== null && nextPaid > order.price) throw Error('El cobro supera el saldo pendiente.');
  return { order, nextPaid };
}

export class JsonRepository implements CRMRepository {
  constructor(private storage: Storage | (() => Storage)) {}
  private getStorage() { return typeof this.storage === 'function' ? this.storage() : this.storage; }
  async load() {
    let raw: string | null;
    try { raw = this.getStorage().getItem('rodrigo-crm'); }
    catch { throw Error('No se pudieron leer los datos locales. Revisá el acceso al almacenamiento del navegador. No se modificaron.'); }
    try { return validate(raw === null ? seed : JSON.parse(raw)); }
    catch { throw Error('No se pudieron leer los datos locales: contenido inválido. No se modificaron.'); }
  }
  private async update(change: (data: Data) => void) {
    const run = async () => {
      const mutate = async () => {
        const data = await this.load();
        change(data);
        const next = validate(data);
        this.getStorage().setItem('rodrigo-crm', JSON.stringify(next));
        return next;
      };
      return typeof navigator !== 'undefined' && navigator.locks
        ? navigator.locks.request('rodrigo-crm', mutate) : mutate();
    };
    const result = writeQueue.then(run);
    writeQueue = result.then(() => undefined, () => undefined);
    return result;
  }
  async updateOrder(orderId: string, patch: OrderUpdate): Promise<Data> {
    return this.update(data => {
      const order = validateOrderPatch(data, orderId, patch);
      Object.assign(order, patch);
    });
  }
  async registerPayment(orderId: string, input: PaymentInput): Promise<Data> {
    return this.update(data => {
      const { order, nextPaid } = validatePaymentInput(data, orderId, input);
      data.payments.push({ id: crypto.randomUUID(), orderId, amount: input.amount, date: input.date });
      order.paid = nextPaid;
    });
  }
  async addClient(input: Omit<Client, 'id'>): Promise<Data> {
    return (await this.addClientWithId(input)).data;
  }
  async addClientWithId(input: Omit<Client, 'id'>): Promise<{ data: Data; clientId: string }> {
    let clientId = '';
    const data = await this.update(current => {
      clientId = crypto.randomUUID();
      current.clients.push({ ...input, id: clientId });
    });
    return { data, clientId };
  }
  async addOrder(input: Omit<Order, 'id'>) {
    return this.update(data => data.orders.push({ ...input, id: crypto.randomUUID() }));
  }
  async addExpense(input: Omit<Expense, 'id'>) {
    return this.update(data => data.expenses.push({ ...input, id: crypto.randomUUID() }));
  }
}
