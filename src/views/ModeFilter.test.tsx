import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { OrdersView } from "./OrdersView";
import type { Data } from "../repository";
const data: Data = { clients: [], orders: [], expenses: [], leads: [], payments: [], partsPurchases: [] };
test("modalidad expone selección actual sin select nativo", () => {
 const html = renderToStaticMarkup(<OrdersView data={data} filtered={[]} query="" mode="Domicilio" onQueryChange={() => {}} onModeChange={() => {}} />);
 expect(html).toContain('role="combobox"');
 expect(html).toContain("Domicilio");
 expect(html).not.toContain("<select");
});
