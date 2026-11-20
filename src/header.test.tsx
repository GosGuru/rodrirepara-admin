import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Header } from "./Header";

test("el encabezado omite el rótulo marcado y conserva el título y subtítulo", () => {
  const html = renderToStaticMarkup(<Header view="Resumen" />);
  expect(html.includes("Panel de gestión")).toBe(false);
  expect(html.includes('class="eyebrow"')).toBe(false);
  expect(html.includes("Cada trabajo tiene un próximo paso.")).toBe(true);
  expect(html.includes("Reparaciones, clientes y dinero en un solo lugar.")).toBe(true);
});

test("el encabezado omite el aviso marcado y conserva la identificación de otras vistas", () => {
  const html = renderToStaticMarkup(<Header view="Órdenes de trabajo" />);
  for (const text of ["DATOS FICTICIOS", "NO PRODUCCIÓN", "JSON local", "moneda a confirmar"]) {
    expect(html.includes(text)).toBe(false);
  }
  expect(html.includes('class="demo"')).toBe(false);
  expect(html.includes("Órdenes de trabajo")).toBe(true);
  expect(html.includes("Seguimiento operativo de Rodrigo Repara.")).toBe(true);
});

test('el encabezado permite el título y propósito del diseño real sin recuperar avisos', () => {
  const html = renderToStaticMarkup(<Header view="Resumen" title="Tablero de trabajo" subtitle="Reparaciones, cobros y próximos pasos." />);
  expect(html).toContain('<h1>Tablero de trabajo</h1>');
  expect(html).toContain('Reparaciones, cobros y próximos pasos.');
  expect(html).not.toContain('Cada trabajo tiene un próximo paso.');
  expect(html).not.toContain('class="eyebrow"');
  expect(html).not.toContain('class="demo"');
});

test('el encabezado del tablero expone Registrar gasto y Nueva reparación con callbacks reales', () => {
  const html = renderToStaticMarkup(
    <Header
      view="Resumen"
      dashboardChrome
      onCreateRepair={() => {}}
      onCreateExpense={() => {}}
    />,
  );
  expect(html).toContain('Registrar gasto');
  expect(html).toContain('Nueva reparación');
});
