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
test("expone Más filtros, menú contextual por orden y sin selector de fechas decorativo", () => {
  const html = render();
  expect(html).toContain("Más filtros");
  expect(html).toContain('aria-label="Más acciones para O-2"');
  expect(html).toContain('aria-haspopup="menu"');
  expect(html).not.toContain("Todo el período");
  expect(html).not.toContain("Recepción");
});
test("trunca visualmente identificadores largos conservando acceso al valor completo", () => {
  const longId = "8b4196ed-3875-4f59-94fc-bddebe85f5b0";
  const longOrder: Order = { ...order, id: longId };
  const longData: Data = { ...data, orders: [longOrder] };
  const html = renderToStaticMarkup(
    <OrdersView data={longData} filtered={[longOrder]} query="" mode="Todas" onQueryChange={() => {}} onModeChange={() => {}} />,
  );
  expect(html).toContain("8b4196ed…f5b0");
  expect(html).toContain(`title="${longId}"`);
  expect(html).toContain(`Identificador completo ${longId}`);
});
test("soporta estados especiales de carga, base vacía y error con reintento", () => {
  const loadingHtml = renderToStaticMarkup(
    <OrdersView data={data} filtered={data.orders} query="" mode="Todas" onQueryChange={() => {}} onModeChange={() => {}} loading />,
  );
  expect(loadingHtml).toContain('aria-busy="true"');
  expect(loadingHtml).toContain("Cargando órdenes");

  const emptyData: Data = { ...data, orders: [] };
  const emptyHtml = renderToStaticMarkup(
    <OrdersView data={emptyData} filtered={[]} query="" mode="Todas" onQueryChange={() => {}} onModeChange={() => {}} />,
  );
  expect(emptyHtml).toContain("Todavía no hay órdenes cargadas");

  const errorHtml = renderToStaticMarkup(
    <OrdersView data={data} filtered={data.orders} query="" mode="Todas" onQueryChange={() => {}} onModeChange={() => {}} error="Error de lectura" onRetry={() => {}} />,
  );
  expect(errorHtml).toContain('role="alert"');
  expect(errorHtml).toContain("Error de lectura");
  expect(errorHtml).toContain("Reintentar");
});
