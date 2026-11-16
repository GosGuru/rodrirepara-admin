import { expect, test } from 'bun:test';
import seed from '../../seed.json';
import type { Data } from '../../repository';
import { chartData } from './charts';
test('gráficos usan registros reales, cero, nulos y fechas antiguas sin mutar', () => {
  const d = structuredClone(seed) as Data;
  d.orders = [{ ...d.orders[0], id: 'A', repair: 'Cerrado', price: 10, paid: 3 }, { ...d.orders[0], id: 'B', repair: 'Personalizado', price: null }, { ...d.orders[0], id: 'C', repair: 'Terminado', price: 0, paid: 0 }];
  d.payments = [{ id: 'P', orderId: 'A', amount: 5, date: 'fecha antigua' }, { id: 'Q', orderId: 'A', amount: 0, date: '2025-02-01' }];
  d.leads = [{ ...d.leads[0], state: 'Estado propio' }];
  const before = structuredClone(d); const result = chartData(d);
  expect(result.pending.map(r => r.value)).toEqual([7, 0]); expect(result.excluded).toBe(1);
  expect(result.collected).toEqual([{ label: '2025-02', value: 0 }, { label: 'Fecha no válida o desconocida', value: 5 }]);
  expect(result.active.find(r => r.label === 'Otros estados')?.value).toBe(1);
  expect(result.leads).toEqual([{ label: 'Estado propio', value: 1 }]); expect(d).toEqual(before);
});
test('datos vacíos no inventan movimientos ni estados de consultas', () => {
  const result = chartData({ clients: [], orders: [], leads: [], payments: [], expenses: [], partsPurchases: [] });
  expect(result.collected).toEqual([]); expect(result.pending).toEqual([]); expect(result.leads).toEqual([]); expect(result.excluded).toBe(0);
});
