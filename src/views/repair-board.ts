import type { Order } from '../repository';
import type { WorkshopActions } from '../components/workshop/actions';

export type RepairColumn = { id: 'pending' | 'progress' | 'ready' | 'other'; title: string; empty: string; orders: Order[] };
export type MoveTarget = Exclude<RepairColumn['id'], 'other'>;
export const moveChoices: Record<MoveTarget, readonly string[]> = {
  pending: ['Visita o recepción', 'Esperando aprobación', 'Esperando repuestos'],
  progress: ['En reparación'], ready: ['Terminado'],
};
export function repairColumns(orders: readonly Order[]): RepairColumn[] {
  const columns: RepairColumn[] = [
    { id: 'pending', title: 'Pendientes', empty: 'No hay trabajos pendientes.', orders: [] },
    { id: 'progress', title: 'En proceso', empty: 'No hay trabajos en proceso.', orders: [] },
    { id: 'ready', title: 'Listos', empty: 'No hay trabajos listos.', orders: [] },
    { id: 'other', title: 'Otros estados', empty: '', orders: [] },
  ];
  for (const order of orders) {
    if (order.repair === 'Cerrado') continue;
    const index = moveChoices.pending.includes(order.repair) ? 0 : ['En reparación', 'En proceso'].includes(order.repair) ? 1 : order.repair === 'Terminado' ? 2 : 3;
    columns[index].orders.push(order);
  }
  return columns.filter(column => column.id !== 'other' || column.orders.length > 0);
}
/** Validate the explicit selection and send only the repair field. */
export async function moveRepair(actions: WorkshopActions | undefined, id: string, source: RepairColumn['id'], target: MoveTarget, choice: string): Promise<boolean> {
  if (!actions || source === target || !moveChoices[target]?.includes(choice)) return false;
  await actions.updateOrder(id, { repair: choice });
  return true;
}
