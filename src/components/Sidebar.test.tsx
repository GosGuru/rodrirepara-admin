import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Sidebar } from './Sidebar';

const navMap: Array<{ label: string; view: string }> = [
  { label: 'Tablero', view: 'Resumen' },
  { label: 'Reparaciones', view: 'Órdenes de trabajo' },
  { label: 'Clientes', view: 'Clientes e historial' },
  { label: 'Gastos', view: 'Finanzas' },
  { label: 'Reportes', view: 'Crecimiento' },
  { label: 'Configuración', view: 'Configuración' },
];

for (const { label, view } of navMap) {
  test(`conserva los destinos del menú y marca ${label} (${view}) como actual`, () => {
    const html = renderToStaticMarkup(<Sidebar view={view} setView={() => {}} />);
    expect(html).toContain('aria-label="Navegación principal"');
    for (const item of navMap) expect(html).toContain(item.label);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    const active = html.match(/<button\b[^>]*aria-current="page"[^>]*>[\s\S]*?<\/button>/)?.[0];
    expect(active).toContain(label);
  });
}

test('presenta marca, LineSidebar, seis ítems con iconos decorativos y perfil de administrador', () => {
  const html = renderToStaticMarkup(<Sidebar view="Resumen" setView={() => {}} />);
  expect(html).toContain('Rodrigo Repara');
  expect(html).toContain('Gestión de reparaciones');
  expect(html).toContain('line-sidebar__list');
  expect(html).toContain('Rodrigo');
  expect(html).toContain('Administrador');
  expect(html.match(/<li\b[^>]*class="line-sidebar__item/g)).toHaveLength(6);
  expect(html.match(/aria-hidden="true"/g)?.length).toBeGreaterThanOrEqual(8);
});
