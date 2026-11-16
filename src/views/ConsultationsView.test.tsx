import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { ConsultationsView } from "./ConsultationsView";
import type { Data } from "../repository";

test("consulta conserva el estado libre en una señal contextual", () => {
 const data: Data = { clients: [], orders: [], payments: [], expenses: [], partsPurchases: [], leads: [{ id: '1', name: 'Ana', phone: '123', problem: 'Falla', date: '', source: '', state: 'Estado propio' }] };
 const html = renderToStaticMarkup(<ConsultationsView data={data} leads={0} />);
 expect(html).toContain('data-status-kind="lead"');
 expect(html).toContain('Consulta: Estado propio');
});
test("consultas agrupa cada registro con nombre destacado y todos sus datos", () => {
  const data: Data = { clients: [], orders: [], payments: [], expenses: [], partsPurchases: [], leads: [{ id: '1', name: 'Ana Pérez', phone: '123', problem: 'No enciende', date: '2024-01-01', source: 'Web', state: 'Nueva' }] };
  const html = renderToStaticMarkup(<ConsultationsView data={data} leads={1} />);
  expect(html).toContain('<h3>Ana Pérez</h3>');
  for (const text of ['123', 'No enciende', '2024-01-01', 'Web', 'Nueva', 'Consultas nuevas: 1 de 1']) expect(html).toContain(text);
});
