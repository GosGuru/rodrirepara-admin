import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { FinanceView } from "./FinanceView";
import { PERSONAL_EXPENSE_CATEGORY } from "../components/QuickActionForms";
import type { Data } from "../repository";
import { todayIsoLocal } from "../utils/date";

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
  for (const text of ['Registrar gasto', 'Hoy:', 'Semana:', 'Mes:', 'cobros', 'gastos generales', 'compras de repuestos', 'movimientos netos', 'Por cobrar con precio final', 'Gastos generales', 'Gastos personales', 'Margen por orden terminada', 'No hay registros para mostrar.']) expect(html).toContain(text);
  expect(html).toContain('0');
});

test("separa gastos personales de gastos de empresa sin restar de movimientos netos", () => {
  const today = todayIsoLocal();
  const data: Data = {
    clients: [],
    orders: [],
    leads: [],
    payments: [{ id: "P-1", orderId: "O-1", amount: 5000, date: today }],
    expenses: [
      { id: "E-1", description: "Nafta", category: "Combustible", amount: 1000, date: today },
      { id: "E-2", description: "Cancha", category: PERSONAL_EXPENSE_CATEGORY, amount: 450, date: today },
    ],
    partsPurchases: [],
  };
  const html = renderToStaticMarkup(<FinanceView data={data} pending={0} onCreateExpense={() => {}} />);
  expect(html).toContain("<dt>gastos generales</dt><dd>$ 1.000</dd>");
  expect(html).toContain("<dt>movimientos netos</dt><dd>$ 4.000</dd>");
  expect(html).toContain("Nafta");
  expect(html).toContain("Cancha");
});
