import { CircleX, Search } from "lucide-react";
import { ModeFilter } from "./ModeFilter";
import type { Data, Order } from "../repository";
import type { WorkshopActions } from "../components/workshop/actions";
import { money, paymentStatus } from "../selectors";
import { InlineOrderRow } from "../components/view-primitives";
import { StatusPill } from "../components/StatusPill";
import "./operations.css";
import "./module-visuals.css";
export function OrdersView({ data: d, filtered, query, mode, onQueryChange, onModeChange, actions }: {
  data: Data; actions?: WorkshopActions; filtered: Order[]; query: string; mode: string; onQueryChange: (value: string) => void; onModeChange: (value: string) => void;
}) {
  return <section className="panel orders-view mv-orders">
    <div className="heading"><div><h2>Seguimiento de reparaciones</h2><p>Reparación, cobro y entrega se siguen por separado.</p></div><span aria-live="polite">{filtered.length} órdenes</span></div>
    <div className="controls">
      <label>Buscar cliente, equipo, falla u orden<span className="orders-view__search"><Search size={18} aria-hidden="true" /><input type="search" value={query} onChange={e => onQueryChange(e.target.value)} /></span></label>
      <ModeFilter value={mode} onChange={onModeChange} />
      <button type="button" className="orders-view__reset" onClick={() => { onQueryChange(""); onModeChange("Todas"); }}><CircleX size={17} aria-hidden="true" /> Limpiar filtros</button>
    </div>
    <p className="orders-view__criteria">Búsqueda: {query || "Todas"} · Modalidad: {mode}</p>
    {!filtered.length && <p>No hay trabajos con estos filtros. Probá ampliar la búsqueda.</p>}
    <div className="table-wrap" tabIndex={0} role="region" aria-label="Tabla desplazable horizontalmente">
      <table><thead><tr>{["Orden y cliente", "Equipo / modalidad", "Reparación", "Cobro", "Entrega", "Detalle"].map(h => <th key={h}>{h}</th>)}</tr></thead>
        <tbody>{filtered.map(o => <InlineOrderRow key={o.id} order={o} data={d} actions={actions} cells={[
          <><strong>{o.id}</strong><small>{d.clients.find(c => c.id === o.clientId)?.name}</small></>,
          <><strong>{o.equipment}</strong><small>{o.mode}</small></>, <StatusPill kind="repair" value={o.repair} />,
          <><StatusPill kind="payment" value={paymentStatus(o)} /><small>{money(o.paid)} / {o.price === null ? "sin precio final" : money(o.price)}</small></>, <StatusPill kind="delivery" value={o.delivery} />,
        ]} />)}</tbody></table>
      {!filtered.length && <p>No hay registros para mostrar.</p>}
    </div>
    <p>Terminado no significa cobrado; cobrado no significa entregado.</p>
  </section>;
}
