import { Package } from "lucide-react";
import type { Data } from "../repository";
import { money } from "../selectors";
import { Table } from "../components/Table";
import "./module-visuals.css";
export function PartsView({ data: d }: { data: Data }) {
  return <section className="panel mv-parts"><h2><Package aria-hidden="true" /> Compras de repuestos</h2><p>Registros de solo lectura; sin inventario avanzado.</p>
    <p className="mv-count">{d.partsPurchases.length} compras registradas</p>
    <Table heads={["Repuesto", "Compra", "Venta", "Proveedor", "Fecha", "Orden", "Cantidad"]} rows={d.partsPurchases.map(p => [p.name, money(p.cost), money(p.sale), p.supplier, p.date, p.orderId, p.quantity])} />
  </section>;
}
