import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Order } from '../../repository';
import { todayIsoLocal } from '../../utils/date';
import { PaymentForm } from './PaymentForm';

const order: Order = {
  id: 'O-2', clientId: 'C-1', equipment: 'Equipo en garantía', mode: 'Taller', address: 'Taller',
  fault: 'Falla', diagnosis: '', parts: '', partsCost: 0, labor: 0, quote: 0,
  price: null, paid: 1000, repair: 'Cerrado', delivery: 'Entregado', entry: '2024-01-01',
  finish: '', owner: 'Rodrigo', originalId: 'O-1',
};
const render = (value: Order) => renderToStaticMarkup(<PaymentForm order={value} onSave={async () => {}} onCancel={() => {}} />);

test('seña sin precio muestra identidad, acumulado y formulario inline', () => {
  const html = render(order);
  for (const text of ['aria-label="Registrar cobro O-2"', '<dd>O-2</dd>', '<dd>Equipo en garantía</dd>', '<dd>Sin definir</dd>', '<dd>$ 1.000</dd>', 'Saldo por definir', 'Podés registrar una seña o un pago parcial.', 'Importe ($)', 'Fecha del cobro', 'name="amount"', 'name="date"', 'step="any"', 'Guardar cobro', 'Cancelar cobro']) expect(html).toContain(text);
  expect(html).not.toContain('disabled');
  expect(html).not.toContain('role="dialog"');
  expect(html).not.toContain('name="price"');
  expect(html).not.toContain('name="paid"');
  expect(html).not.toContain('max=');
});

test('cobro admite formulario vivo para acciones externas', () => {
  const html = renderToStaticMarkup(<PaymentForm order={order} onSave={async () => {}} onCancel={() => {}} formId="pay-live" hideActions />);
  expect(html).toContain('id="pay-live"');
  expect(html).not.toContain('Guardar cobro');
  expect(html).not.toContain('Cancelar cobro');
  expect(html).toContain('name="amount"');
});

test('amount example is limited to the modal, preserving the inline form', () => {
  expect(render(order)).not.toContain('placeholder=');
  const modal = renderToStaticMarkup(<PaymentForm order={order} onSave={async () => {}} onCancel={() => {}} hideActions showExamples />);
  expect(modal).toContain('placeholder="Ej. 10000"');
});

test('saldo definido admite parcial incluso con orden cerrada y entregada', () => {
  const html = render({ ...order, price: 5000 });
  expect(html).toContain('<dt>Precio final</dt><dd>$ 5.000</dd>');
  expect(html).toContain('<dt>Cobrado</dt><dd>$ 1.000</dd>');
  expect(html).toContain('<dt>Saldo</dt><dd>$ 4.000</dd>');
  expect(html).not.toContain('disabled');
  expect(html).not.toContain('Saldo por definir');
});

test('precio cero, cobro completo y sobrepago heredado bloquean guardar', () => {
  for (const value of [{ price: 0, paid: 0 }, { price: 1000, paid: 1000 }, { price: 800, paid: 1000 }]) {
    const html = render({ ...order, ...value });
    expect(html).toContain('No hay saldo cobrable');
    expect(html).toContain('<dt>Saldo</dt><dd>$ 0</dd>');
    expect(html).toContain('type="submit" disabled=""');
    expect(html).not.toContain('Sin definir');
  }
});

test('precio nuevo mayor rehabilita el cobro y no impone máximo flotante', () => {
  const html = render({ ...order, price: 0.3, paid: 0.1 });
  expect(html).toContain('<dt>Saldo</dt><dd>$ 0,2</dd>');
  expect(html).not.toContain('disabled');
  expect(html).not.toContain('max=');
});

test('fecha inicial de cobro usa fecha local sin desplazamiento UTC', () => {
  const html = render(order);
  expect(html).toContain(`name="date" value="${todayIsoLocal()}"`);
});
