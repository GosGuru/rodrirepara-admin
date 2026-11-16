import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PartsView } from "./PartsView";
import type { Data } from "../repository";

test("repuestos presenta icono y datos existentes sin acciones de escritura", () => {
  const data: Data = { clients: [], orders: [], leads: [], payments: [], expenses: [], partsPurchases: [{ id: 'p', name: 'Motor', cost: 0, sale: 40, supplier: 'Tienda', date: '2024-01-01', orderId: 'O1', quantity: 2 }] };
  const html = renderToStaticMarkup(<PartsView data={data} />);
  expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
  for (const text of ['Compras de repuestos', 'solo lectura', 'Motor', 'Tienda', '2024-01-01', 'O1', 'Cantidad', '2', '40']) expect(html).toContain(text);
  expect(html).not.toContain('<button');
});
