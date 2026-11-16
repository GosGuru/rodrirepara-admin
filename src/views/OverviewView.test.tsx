import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { OverviewView } from "./OverviewView";
import type { Data, Order } from "../repository";
import seed from "../seed.json";

test("resumen prioriza trabajos activos y conserva indicadores y acciones", () => {
  const data: Data = { clients: [], orders: [], leads: [], payments: [], expenses: [], partsPurchases: [] };
  const noop = () => {};
  const html = renderToStaticMarkup(<OverviewView data={data} stats={{ active: 3, collected: 0, pending: 0, leads: 2 }} onViewOrders={noop} onCreateRepair={noop} onCreateClient={noop} onCreateExpense={noop} />);
  expect(html).toContain('Ver detalles');
  expect(html).not.toContain('class="panel overview-queue"');
  expect(html).toContain('aria-label="Indicadores"');
  expect(html.indexOf('Trabajos activos')).toBeLessThan(html.indexOf('Cobrado hoy'));
  for (const label of ['Trabajos activos', 'Cobrado hoy', 'Por cobrar', 'Consultas nuevas', 'Nueva reparación', 'Nuevo cliente', 'Registrar gasto', 'Ver trabajos', 'Ver todos']) expect(html).toContain(label);
  expect(html).toContain('>3</strong>');
  expect(html).toContain('>2</strong>');
  expect(html).toContain('aria-hidden="true"');
});

function board(orders: Order[]) {
  const data = { ...structuredClone(seed), orders } as Data;
  const original = structuredClone(data);
  const noop = () => {};
  const html = renderToStaticMarkup(<OverviewView data={data} stats={{ active: orders.filter(o => o.repair !== 'Cerrado').length, collected: 0, pending: 0, leads: 0 }} onViewOrders={noop} onCreateRepair={noop} onCreateClient={noop} onCreateExpense={noop} />);
  expect(data).toEqual(original);
  return html;
}
function order(id: string, repair: string, changes: Partial<Order> = {}): Order {
  return { ...(structuredClone(seed.orders[0]) as Order), id, equipment: `Equipo ${id}`, repair, originalId: '', ...changes };
}
function column(html: string, label: string) {
  const start = html.indexOf(`aria-label="${label}"`);
  expect(start).toBeGreaterThanOrEqual(0);
  return html.slice(start, html.indexOf('</section>', start));
}

test('tarjetas muestran contexto y controles sin identificadores visibles', () => {
  const html = board([order('RR-1047', 'Esperando aprobación', { equipment: 'Samsung' })]);
  expect(html).not.toContain('>RR-1047<');
  expect(html).toContain('aria-label="Mover RR-1047"');
  expect(html).toContain('Ver detalle');
  expect(html).toContain('ob-card-context');
  expect(html).toContain('ob-card-states');
  expect(html).toContain('aria-label="Ajustar colores del tablero"');
});

test('tablero sin acciones conserva el aviso de solo lectura sin instrucción de arrastre', () => {
  const html = board([order('READ-1', 'En reparación')]);
  expect(html).toContain('Los movimientos no están disponibles en modo de lectura.');
  expect(html).not.toContain('Arrastrá desde el asa o usá «Mover».');
});

test('tablero agrupa etiquetas exactas y conserva cobro y entrega independientes', () => {
  const html = board([
    order('B-1', 'Visita o recepción', { price: 0, paid: 0, delivery: 'Entregado' }),
    order('B-2', 'Esperando aprobación'), order('B-3', 'Esperando repuestos'),
    order('B-4', 'En reparación', { price: 1000, paid: 1000, delivery: 'Entregado' }),
    order('B-5', 'En proceso'), order('B-6', 'Terminado', { price: 1000, paid: 0 }),
  ]);
  const pending = column(html, 'Pendientes'), progress = column(html, 'En proceso'), ready = column(html, 'Listos');
  for (const id of ['B-1', 'B-2', 'B-3']) expect(pending).toContain(id);
  for (const id of ['B-4', 'B-5']) expect(progress).toContain(id);
  expect(ready).toContain('B-6');
  for (const state of ['Visita o recepción', 'Esperando aprobación', 'Esperando repuestos', 'En reparación', 'En proceso', 'Terminado']) expect(html).toContain(state);
  expect(pending).toContain('3 trabajos');
  expect(progress).toContain('2 trabajos');
  expect(ready).toContain('1 trabajo');
  expect(ready).toContain('Cobro:'); expect(ready).toContain('Pendiente');
  expect(html).toContain('draggable="true"');
  expect(html).toContain('Mover B-6');
  expect(progress).toContain('Cobrado'); expect(progress).toContain('Entregado');
  expect(html).not.toContain('aria-label="Otros estados"');
});

test('otros estados conserva etiquetas personalizadas sin clasificación aproximada', () => {
  const html = board([order('C-1', 'Revisión <especial>'), order('C-2', 'terminado')]);
  const other = column(html, 'Otros estados');
  expect(other).toContain('C-1'); expect(other).toContain('C-2');
  expect(other).toContain('Revisión &lt;especial&gt;'); expect(other).toContain('terminado');
  expect(other).toContain('2 trabajos');
  expect(column(html, 'Listos')).not.toContain('C-2');
});

test('tablero muestra todos los activos una sola vez y excluye cerrado sin truncar', () => {
  const orders = Array.from({ length: 8 }, (_, i) => order(`ACT-${i}`, i % 2 ? 'Terminado' : 'En reparación'));
  const html = board([...orders, order('CLOSED-ONLY', 'Cerrado')]);
  for (const item of orders) expect(html.split(`Equipo ${item.id}`).length - 1).toBe(1);
  expect(html).not.toContain('CLOSED-ONLY');
  expect(column(html, 'En proceso')).toContain('4 trabajos');
  expect(column(html, 'Listos')).toContain('4 trabajos');
});

test('tablero vacío conserva tres columnas y mensajes útiles sin inventar otros estados', () => {
  const html = board([]);
  expect(column(html, 'Pendientes')).toContain('No hay trabajos pendientes.');
  expect(column(html, 'En proceso')).toContain('No hay trabajos en proceso.');
  expect(column(html, 'Listos')).toContain('No hay trabajos listos.');
  expect(html.match(/aria-label="0 trabajos"/g)?.length).toBe(3);
  expect(html).not.toContain('aria-label="Otros estados"');
});
