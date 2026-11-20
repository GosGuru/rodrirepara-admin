import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClientsView } from './ClientsView';
import type { Data, Order } from '../repository';

const recentOrder: Order = {
  id: 'O-2',
  clientId: 'C-1',
  equipment: 'Heladera',
  mode: 'Taller',
  address: 'Taller',
  fault: 'Falla',
  diagnosis: '',
  parts: '',
  partsCost: 0,
  labor: 0,
  quote: 0,
  price: null,
  paid: 0,
  repair: 'Terminado',
  delivery: 'Pendiente',
  entry: '2024-02-01',
  finish: '2024-02-05',
  owner: 'Rodrigo',
  originalId: 'O-1',
};

const olderOrder: Order = {
  ...recentOrder,
  id: 'O-1',
  equipment: 'Lavarropas',
  mode: 'Domicilio',
  price: 2000,
  paid: 2000,
  repair: 'Cerrado',
  delivery: 'Entregado',
  entry: '2024-01-01',
  finish: '',
  originalId: '',
};

const data: Data = {
  clients: [
    { id: 'C-1', name: 'Ana', phone: '099 123 123' },
    { id: 'C-2', name: 'Pedro', phone: '099 444 444' },
  ],
  orders: [olderOrder, recentOrder],
  expenses: [],
  leads: [],
  payments: [],
  partsPurchases: [],
};

test('la vista inicial ofrece búsqueda, ordenamiento custom, alta y estado sin selección arbitraria', () => {
  const html = renderToStaticMarkup(<ClientsView data={data} onCreateClient={() => {}} />);
  expect(html).toContain('Buscar clientes');
  expect(html).toContain('type="search"');
  expect(html).toContain('role="combobox"');
  expect(html).toContain('Nombre (A–Z)');
  expect(html).not.toContain('<select');
  expect(html).toContain('Nuevo cliente');
  expect(html).toContain('class="lucide lucide-plus"');
  expect(html).toContain('Seleccioná un cliente');
  expect(html).toContain('Ana');
  expect(html).toContain('099 123 123');
  expect(html).toContain('2 órdenes');
  expect(html).toContain('0 órdenes');
  // Directory rows should stay compact without per-row status badge spam
  expect(html).not.toContain('data-status-kind="repair"');
  // Header is owned by App Header; no duplicate main title inside view
  expect(html).not.toContain('<h2>Clientes e historial</h2>');
});

test('panel contextual muestra historial cronológico, 3 estados independientes y acciones reales', () => {
  const html = renderToStaticMarkup(
    <ClientsView data={data} onCreateClient={() => {}} initialSelectedClientId="C-1" />,
  );
  expect(html).toContain('<ol');
  expect(html.indexOf('O-2')).toBeLessThan(html.indexOf('O-1'));
  expect(data.orders[0].id).toBe('O-1');

  for (const kind of ['repair', 'payment', 'delivery']) {
    expect(html).toContain(`data-status-kind="${kind}"`);
  }
  for (const text of [
    'Ana',
    '099 123 123',
    '2 órdenes',
    'Heladera',
    'Lavarropas',
    'dateTime="2024-02-01"',
    'dateTime="2024-02-05"',
    'Terminado',
    'Cerrado',
    'Cobrado',
    'Entregado',
    'Sin precio final',
    'Ver detalle',
    'aria-label="Más acciones para O-2"',
    'aria-haspopup="menu"',
  ]) {
    expect(html).toContain(text);
  }
  // Never fabricate unimplemented client edit/delete actions
  expect(html).not.toContain('Editar cliente');
  expect(html).not.toContain('Eliminar cliente');
});

test('trunca identificadores largos en el historial conservando acceso al valor completo', () => {
  const longId = '8b4196ed-3875-4f59-94fc-bddebe85f5b0';
  const longData: Data = {
    ...data,
    orders: [{ ...recentOrder, id: longId }],
  };
  const html = renderToStaticMarkup(
    <ClientsView data={longData} onCreateClient={() => {}} initialSelectedClientId="C-1" />,
  );
  expect(html).toContain('8b4196ed…f5b0');
  expect(html).toContain(`title="${longId}"`);
});

test('soporta estados de carga, base vacía, cliente sin reparaciones y error con reintento', () => {
  const loadingHtml = renderToStaticMarkup(
    <ClientsView data={data} onCreateClient={() => {}} loading />,
  );
  expect(loadingHtml).toContain('aria-busy="true"');
  expect(loadingHtml).toContain('Cargando clientes');

  const emptyDbHtml = renderToStaticMarkup(
    <ClientsView data={{ ...data, clients: [], orders: [] }} onCreateClient={() => {}} />,
  );
  expect(emptyDbHtml).toContain('Todavía no hay clientes');
  expect(emptyDbHtml).toContain('Crear primer cliente');

  const noOrdersClientHtml = renderToStaticMarkup(
    <ClientsView data={data} onCreateClient={() => {}} initialSelectedClientId="C-2" />,
  );
  expect(noOrdersClientHtml).toContain('Este cliente todavía no tiene órdenes registradas.');

  const errorHtml = renderToStaticMarkup(
    <ClientsView
      data={data}
      onCreateClient={() => {}}
      error="Error de almacenamiento"
      onRetry={() => {}}
    />,
  );
  expect(errorHtml).toContain('role="alert"');
  expect(errorHtml).toContain('Error de almacenamiento');
  expect(errorHtml).toContain('Reintentar');
});
