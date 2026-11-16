import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Client, Order } from '../../repository';
import { OrderEditor } from './OrderEditor';

const clients: Client[] = [{ id: 'c1', name: 'Ana', phone: '123' }, { id: 'c2', name: 'Luis', phone: '456' }];
const order: Order = { id: 'o1', clientId: 'c1', equipment: 'Radio', mode: 'Taller', address: 'Local', fault: 'No prende', diagnosis: 'Revisar', parts: 'Cable', partsCost: 0, labor: 12.5, quote: 20, price: null, paid: 1000, repair: 'Estado histórico', delivery: 'Entregado', entry: 'ayer', finish: '', owner: 'Rosa', originalId: '' };
const render = (item: Order, orders: Order[] = [item]) => renderToStaticMarkup(<OrderEditor order={item} clients={clients} orders={orders} onSave={async () => {}} onCancel={() => {}} />);

test('formulario inline expone todos los campos, valores y acciones sin bloquear orden entregada', () => {
  const html = render(order);
  expect(html).toContain('aria-label="Editar orden o1"');
  for (const label of ['Cliente', 'Equipo', 'Modalidad', 'Dirección', 'Falla', 'Diagnóstico', 'Repuestos', 'Costo de repuestos', 'Mano de obra', 'Presupuesto', 'Precio final', 'Reparación', 'Entrega', 'Ingreso', 'Finalización', 'Responsable']) expect(html).toContain(`>${label}</label>`);
  for (const name of ['clientId', 'equipment', 'mode', 'address', 'fault', 'diagnosis', 'parts', 'partsCost', 'labor', 'quote', 'price', 'repair', 'delivery', 'entry', 'finish', 'owner']) expect(html).toContain(`name="${name}"`);
  for (const value of ['Radio', 'Local', 'No prende', 'Revisar', 'Cable', '12.5', '20', 'Estado histórico', 'ayer', 'Rosa']) expect(html).toContain(value);
  expect(html).toContain('Cobrado actualmente:');
  expect(html).toContain('$ 1.000');
  expect(html).toContain('Guardar cambios'); expect(html).toContain('Cancelar edición');
  expect(html).not.toContain('role="dialog"');
  expect(html).not.toContain('name="paid"'); expect(html).not.toContain('name="id"'); expect(html).not.toContain('name="originalId"');
  expect(html).not.toContain('disabled=""');
});

test('editor admite formulario vivo para acciones externas sin cambiar el contrato original', () => {
  const html = renderToStaticMarkup(<OrderEditor order={order} clients={clients} orders={[order]} onSave={async () => {}} onCancel={() => {}} formId="edit-live" hideActions />);
  expect(html).toContain('id="edit-live"');
  expect(html).not.toContain('Guardar cambios');
  expect(html).not.toContain('Cancelar edición');
  expect(html).toContain('name="repair"');
});

test('examples appear in modal forms without changing inline rendering or suggesting states', () => {
  expect(render(order)).not.toContain('placeholder=');
  const modal = renderToStaticMarkup(<OrderEditor order={order} clients={clients} orders={[order]} onSave={async () => {}} onCancel={() => {}} hideActions showExamples />);
  expect(modal).toContain('placeholder="Ej. lavarropas"');
  expect(modal).not.toContain('pendiente de diagnóstico');
  expect(modal).not.toContain('Ej. 2025-03-15');
});

test('precio nulo y cero permanecen distintos; precio histórico menor a cobrado no impone mínimo cobrado', () => {
  const empty = render(order); const zero = render({ ...order, price: 0 });
  expect(empty).toMatch(/name="price"[^>]*value=""/);
  expect(zero).toMatch(/name="price"[^>]*value="0"/);
  expect(zero).not.toContain('min="1000"');
  expect(zero).toContain('Un precio nuevo no puede ser menor a lo cobrado');
});

test('garantías originales y derivadas bloquean cliente, no equipo', () => {
  const child = { ...order, id: 'o2', originalId: 'o1', equipment: 'Otro equipo' };
  for (const html of [render(order, [order, child]), render(child, [order, child])]) {
    expect(html).toMatch(/name="clientId"[^>]*disabled=""/);
    expect(html).toContain('El cliente no se puede cambiar');
    expect(html).not.toMatch(/name="equipment"[^>]*disabled/);
  }
  expect(render(child, [order, child])).toContain('Garantía de la orden o1');
});
