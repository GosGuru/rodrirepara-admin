import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FinanceView } from "./FinanceView";
import type { Data } from "../repository";

test("cada periodo presenta importes como métricas separadas", () => {
 const data: Data = { clients: [], orders: [], leads: [], payments: [], expenses: [], partsPurchases: [] };
 const html = renderToStaticMarkup(<FinanceView data={data} pending={0} onCreateExpense={() => {}} />);
 expect(html.match(/class="mv-finance-metric"/g)?.length).toBe(12);
 expect(html).toContain('Las órdenes sin precio final no se cuentan.');
});
test("finanzas conserva periodos y cero con acción de gasto iconificada", () => {
  const data: Data = { clients: [], orders: [], leads: [], payments: [], expenses: [], partsPurchases: [] };
  const html = renderToStaticMarkup(<FinanceView data={data} pending={0} onCreateExpense={() => {}} />);
  expect(html).toMatch(/<button[^>]*><svg[^>]*aria-hidden="true"/);
  for (const text of ['Registrar gasto', 'Hoy:', 'Semana:', 'Mes:', 'cobros', 'gastos generales', 'compras de repuestos', 'movimientos netos', 'Por cobrar con precio final', 'Gastos generales', 'Margen por orden terminada', 'No hay registros para mostrar.']) expect(html).toContain(text);
  expect(html).toContain('0');
});
