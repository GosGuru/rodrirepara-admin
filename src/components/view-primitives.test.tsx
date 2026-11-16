import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { InlineOrder, InlineOrderRow } from "./view-primitives";
import { OrderSheetProvider } from "./OrderSheetProvider";
import type { Data, Order } from "../repository";

const order: Order = { id: "O-2", clientId: "C-1", equipment: "Garantía", mode: "Taller", address: "Taller", fault: "Falla", diagnosis: "", parts: "", partsCost: 0, labor: 0, quote: 0, price: null, paid: 0, repair: "Terminado", delivery: "Pendiente", entry: "2024-01-01", finish: "", owner: "Rodrigo", originalId: "O-1" };
const data: Data = { clients: [{ id: "C-1", name: "Ana", phone: "123" }], orders: [order], expenses: [], leads: [], payments: [], partsPurchases: [] };

test("proveedor compartido conserva tabla válida y controles accesibles al iniciar", () => {
  const html = renderToStaticMarkup(<OrderSheetProvider data={data}><table><tbody><InlineOrderRow data={data} order={order} cells={["orden", "equipo"]} /></tbody></table></OrderSheetProvider>);
  expect(html).toContain('<tbody><tr>');
  expect(html).toContain('</tr></tbody>');
  expect(html).toContain('aria-controls=');
  expect(html).toContain('aria-expanded="false"');
  expect(html).not.toContain('<dialog');
});

test("controles inline comienzan cerrados y no renderizan el detalle", () => {
  for (const markup of [renderToStaticMarkup(<InlineOrder data={data} order={order} />), renderToStaticMarkup(<table><tbody><InlineOrderRow data={data} order={order} cells={["orden", "equipo"]} /></tbody></table>)]) {
    expect(markup).toContain("Ver detalle");
    expect(markup).toContain('aria-expanded="false"');
    expect(markup).toContain("aria-controls=");
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).not.toContain("Sin validez fiscal");
    expect(markup).not.toContain("<dialog");
  }
});
