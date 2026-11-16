import type { Data } from '../../repository';
import { repairColumns } from '../repair-board';
export type ChartRow = { label: string; value: number };
export function chartData(data: Data) {
  const active = repairColumns(data.orders).map(c => ({ label: c.title, value: c.orders.length }));
  const months = new Map<string, number>();
  for (const p of data.payments) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.date);
    let label = 'Fecha no válida o desconocida';
    if (match) {
      const parsed = new Date(`${p.date}T00:00:00Z`);
      if (Number.isFinite(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === p.date) label = p.date.slice(0, 7);
    }
    months.set(label, (months.get(label) ?? 0) + p.amount);
  }
  const collected = [...months].sort(([a], [b]) => a.localeCompare(b)).map(([label, value]) => ({ label, value }));
  const pending = data.orders.filter(o => o.price !== null).map(o => ({ label: `${o.id} · ${data.clients.find(c => c.id === o.clientId)?.name ?? 'Cliente desconocido'}`, value: Math.max(0, o.price! - o.paid) }));
  const states = new Map<string, number>();
  for (const lead of data.leads) states.set(lead.state, (states.get(lead.state) ?? 0) + 1);
  return { active, collected, pending, excluded: data.orders.filter(o => o.price === null).length, leads: [...states].map(([label, value]) => ({ label, value })) };
}
