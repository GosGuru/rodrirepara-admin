import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { OrdersView } from "./OrdersView";
import type { Data, Order } from "../repository";

export const order: Order = { id: "O-2", clientId: "C-1", equipment: "Heladera", mode: "Taller", address: "Taller", fault: "Falla", diagnosis: "", parts: "", partsCost: 0, labor: 0, quote: 0, price: null, paid: 0, repair: "Terminado", delivery: "Pendiente", entry: "2024-02-01", finish: "", owner: "Rodrigo", originalId: "" };
export const data: Data = { clients: [{ id: "C-1", name: "Ana", phone: "123" }], orders: [order], expenses: [], leads: [], payments: [], partsPurchases: [] };
const render = (filtered = data.orders) => renderToStaticMarkup(<OrdersView data={data} filtered={filtered} query="Heladera" mode="Taller" onQueryChange={() => {}} onModeChange={() => {}} />);
test("buscador muestra alcance, criterios y control de modalidad accesible", () => {
  const html = render();
  expect(html).toContain("Buscar cliente, equipo, falla u orden");
  expect(html).toContain('role="combobox"');
  expect(html).toContain('aria-expanded="false"');
  expect(html).toContain("Búsqueda: Heladera");
  expect(html).toContain("Modalidad: Taller");
  expect(html).toContain('class="lucide lucide-search"');
});
test("reset visible con icono y sin resultados conserva criterios", () => {
  const html = render([]);
  expect(html).toContain("Limpiar filtros");
  expect(html).toContain('class="lucide lucide-circle-x"');
  expect(html).toContain("Búsqueda: Heladera");
  expect(html).toContain("No hay trabajos con estos filtros");
});
test("estados independientes conservan contexto y precio ausente", () => {
  const html = render();
  for (const kind of ['repair', 'payment', 'delivery']) expect(html).toContain(`data-status-kind="${kind}"`);
  expect(html).toContain('sin precio final');
});
test("tabla preserva columnas y detalle inline", () => {
  const html = render();
  for (const text of ["1 órdenes", "Orden y cliente", "Equipo / modalidad", "Reparación", "Cobro", "Entrega", "Detalle", "O-2", "Ana", "Heladera", "Taller", "Terminado", "Pendiente", "Ver detalle"]) expect(html).toContain(text);
});
