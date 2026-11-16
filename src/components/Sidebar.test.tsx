import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { Sidebar } from './Sidebar';

const destinations = ['Resumen', 'Consultas', 'Clientes e historial', 'Órdenes de trabajo', 'Finanzas', 'Repuestos', 'Crecimiento'];
for (const selected of destinations) {
  test(`conserva los destinos y marca ${selected} como actual`, () => {
    const html = renderToStaticMarkup(<Sidebar view={selected} setView={() => {}} />);
    expect(html).toContain('aria-label="Navegación principal"');
    for (const label of destinations) expect(html).toContain(label);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    const active = html.match(/<button\b[^>]*aria-current="page"[^>]*>[\s\S]*?<\/button>/)?.[0];
    expect(active).toContain(selected);
  });
}
test('presenta LineSidebar y siete iconos decorativos', () => {
  const html = renderToStaticMarkup(<Sidebar view="Resumen" setView={() => {}} />);
  expect(html).toContain('line-sidebar__list');
  expect(html.match(/<svg /g)).toHaveLength(7);
  expect(html.match(/aria-hidden="true"/g)).toHaveLength(7);
});
