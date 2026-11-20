import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { OrderDetail } from "./OrderDetail";
import { type Data, type Order } from "../repository";
import { createSeededRepository } from "../test-fixtures";

const original: Order = { id: "O-1", clientId: "C-1", equipment: "Original", mode: "Taller", address: "Taller", fault: "Falla", diagnosis: "", parts: "", partsCost: 0, labor: 0, quote: 0, price: 0, paid: 0, repair: "Terminado", delivery: "Pendiente", entry: "2024-01-01", finish: "", owner: "Rodrigo", originalId: "" };
const order: Order = { ...original, id: "O-2", equipment: "Garantía", price: null, originalId: original.id };
const data: Data = { clients: [{ id: "C-1", name: "Ana", phone: "123" }], orders: [original, order], expenses: [], leads: [], payments: [], partsPurchases: [] };

test("detalle agrupa trabajo, importes y cobros con estados independientes", () => {
  const html = renderToStaticMarkup(<OrderDetail order={order} data={data} open={() => {}} />);
  expect(html).toContain('Trabajo');
  expect(html).toContain('Importes');
  expect(html).toContain('Cobros registrados');
  expect(html).toContain('data-status-kind="repair"');
  expect(html).toContain('data-status-kind="payment"');
  expect(html).toContain('data-status-kind="delivery"');
});

test("detalle conserva campos y vínculo original en región inline con cierre", () => {
  const html = renderToStaticMarkup(<OrderDetail order={order} data={data} open={() => {}} />);
  for (const label of ["Cliente", "Modalidad y dirección", "Falla", "Diagnóstico", "Repuestos", "Costo de repuestos", "Mano de obra", "Presupuesto", "Precio final", "Reparación", "Cobro", "Entrega", "Ingreso", "Finalización", "Responsable", "Fotografías"]) expect(html).toContain(`<dt>${label}</dt>`);
  for (const [label, value] of [
    ["Cliente", "Ana · 123"], ["Modalidad y dirección", "Taller · Taller"],
    ["Falla", "Falla"], ["Diagnóstico", "Pendiente"], ["Repuestos", "Sin asignar"],
    ["Costo de repuestos", "$ 0"], ["Mano de obra", "$ 0"], ["Presupuesto", "$ 0"],
    ["Precio final", "Sin definir"], ["Reparación", "Terminado"], ["Cobro", "Pendiente · $ 0"],
    ["Entrega", "Pendiente"], ["Ingreso", "2024-01-01"], ["Finalización", "Pendiente"],
    ["Responsable", "Rodrigo"], ["Fotografías", "Sin fotografías adjuntas"],
  ]) expect(html).toContain(`<dt>${label}</dt><dd>${value}</dd>`);
  expect(html).toContain("Ver orden original O-1");
  expect(html).toContain("Sin validez fiscal");
  expect(html).toContain('role="region"');
  expect(html).toContain("Cerrar detalle");
});

test("detalle ofrece acciones opcionales y muestra solo cobros reales de la orden", () => {
  const actions = { updateOrder: async () => {}, registerPayment: async () => {} };
  const withPayments: Data = { ...data, payments: [
    { id: "P-1", orderId: order.id, amount: 12, date: "2024-02-01" },
    { id: "P-2", orderId: original.id, amount: 99, date: "2024-03-01" },
  ] };
  const html = renderToStaticMarkup(<OrderDetail order={order} data={withPayments} open={() => {}} actions={actions} />);
  expect(html).toContain("Editar orden");
  expect(html).toContain("Registrar cobro");
  expect(html).toContain("2024-02-01");
  expect(html).not.toContain("2024-03-01");
  expect(html).toContain("pueden no coincidir");
});

test("garantía real y original muestran solo el historial del ID mostrado", async () => {
  const data = await createSeededRepository().repo.load();
  const child = data.orders.find(o => o.id === 'RR-1049')!;
  const parent = data.orders.find(o => o.id === 'RR-1030')!;
  expect(child.originalId).toBe(parent.id);
  const fixture: Data = { ...data, payments: [
    { id: 'child', orderId: child.id, date: '2024-01-02', amount: 7 },
    { id: 'parent', orderId: parent.id, date: '2024-01-03', amount: 9 },
  ] };
  const childHtml = renderToStaticMarkup(<OrderDetail order={child} data={fixture} open={() => {}} />);
  const parentHtml = renderToStaticMarkup(<OrderDetail order={parent} data={fixture} open={() => {}} />);
  expect(childHtml).toContain('Ver orden original RR-1030');
  expect(childHtml).toContain('2024-01-02');
  expect(childHtml).not.toContain('2024-01-03');
  expect(parentHtml).toContain('2024-01-03');
  expect(parentHtml).not.toContain('2024-01-02');
  expect(childHtml).not.toContain('Editar orden');
  expect(parentHtml).not.toContain('Registrar cobro');
});

test("precio final cero no se presenta como sin definir", () => {
  const html = renderToStaticMarkup(<OrderDetail order={original} data={data} open={() => {}} />);
  expect(html).not.toContain("Sin definir");
  expect(html).toContain("<dt>Precio final</dt><dd>$ 0</dd>");
});
