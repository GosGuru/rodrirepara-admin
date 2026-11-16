import type { Data, Order } from './repository';

export const money = (n: number) => '$ ' + n.toLocaleString('es-AR');
export const paymentStatus = (order: Order) =>
  order.price !== null && order.paid >= order.price ? 'Cobrado' : 'Pendiente';

export function filterOrders(data: Data, query: string, mode: string) {
  const normalized = query.trim().toLocaleLowerCase();
  return data.orders.filter(order => {
    const client = data.clients.find(c => c.id === order.clientId);
    const searchable = [order.id, order.equipment, order.fault, client?.name ?? ''];
    return (mode === 'Todas' || order.mode === mode)
      && searchable.some(value => value.toLocaleLowerCase().includes(normalized));
  });
}

export function dashboard(data: Data, today = new Date().toISOString().slice(0, 10)) {
  return {
    collected: data.payments.filter(p => p.date === today).reduce((sum, p) => sum + p.amount, 0),
    active: data.orders.filter(o => o.repair !== 'Cerrado').length,
    pending: data.orders.reduce((sum, o) => sum + (o.price === null ? 0 : Math.max(0, o.price - o.paid)), 0),
    leads: data.leads.filter(l => l.state === 'Nueva').length,
  };
}
