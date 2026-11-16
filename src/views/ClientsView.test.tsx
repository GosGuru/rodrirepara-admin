import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ClientsView } from "./ClientsView";
import type { Data, Order } from "../repository";

const order: Order = { id: "O-2", clientId: "C-1", equipment: "Heladera", mode: "Taller", address: "Taller", fault: "Falla", diagnosis: "", parts: "", partsCost: 0, labor: 0, quote: 0, price: null, paid: 0, repair: "Terminado", delivery: "Pendiente", entry: "2024-02-01", finish: "2024-02-05", owner: "Rodrigo", originalId: "O-1" };
const old = { ...order, id: "O-1", equipment: "Lavarropas", entry: "2024-01-01", finish: "", originalId: "" };
const data: Data = { clients: [{ id: "C-1", name: "Ana", phone: "123" }], orders: [old, order], expenses: [], leads: [], payments: [], partsPurchases: [] };
test("la vista de clientes ofrece búsqueda con etiqueta visible", () => {
 const html = renderToStaticMarkup(<ClientsView data={data} onCreateClient={() => {}} />);
 expect(html).toContain('Buscar clientes');
 expect(html).toContain('type="search"');
});
test("historial distingue reparación, cobro y entrega", () => {
 const html = renderToStaticMarkup(<ClientsView data={data} onCreateClient={() => {}} />);
 for (const kind of ['repair', 'payment', 'delivery']) expect(html).toContain(`data-status-kind="${kind}"`);
});
test("acción de cliente lleva icono decorativo", () => {
 const html = renderToStaticMarkup(<ClientsView data={data} onCreateClient={() => {}} />);
 expect(html).toContain("Nuevo cliente");
 expect(html).toContain('class="lucide lucide-plus"');
});
test("historial es cronológico, conserva datos y detalle", () => {
 const html = renderToStaticMarkup(<ClientsView data={data} onCreateClient={() => {}} />);
 expect(html).toContain('<ol');
 expect(html.indexOf("O-2")).toBeLessThan(html.indexOf("O-1"));
 for (const text of ["Ana", "123", "2 órdenes", "Heladera", "Lavarropas", "2024-02-01", "2024-02-05", "Terminado", "Ver detalle"]) expect(html).toContain(text);
 expect(data.orders[0].id).toBe("O-1");
});
