import { useState } from "react";
import { Plus, Search } from "lucide-react";
import type { Data } from "../repository";
import type { WorkshopActions } from "../components/workshop/actions";
import { InlineOrder } from "../components/view-primitives";
import { paymentStatus } from "../selectors";
import { StatusPill } from "../components/StatusPill";
import "./operations.css";
import "./module-visuals.css";
export function ClientsView({ data: d, onCreateClient, actions }: { data: Data; onCreateClient: () => void; actions?: WorkshopActions }) {
  const [query, setQuery] = useState("");
  const normalize = (value: string) => value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es");
  const term = normalize(query.trim());
  const clients = d.clients.filter(client => normalize(client.name).includes(term) || normalize(client.phone).includes(term));
  return <section className="panel clients-view mv-clients">
    <div className="heading"><h2>Clientes e historial</h2></div>
    <div className="clients-view__toolbar">
      <label className="clients-view__search">Buscar clientes
        <span><Search size={18} aria-hidden="true" /><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nombre o teléfono" /></span>
      </label>
      <button type="button" className="clients-view__create" onClick={onCreateClient}><Plus size={18} aria-hidden="true" /> Nuevo cliente</button>
    </div>
    {clients.length === 0 && <p role="status">{term ? "No se encontraron clientes." : "Todavía no hay clientes."}</p>}
    {clients.map(c => {
      const orders = d.orders.filter(o => o.clientId === c.id).slice().sort((a, b) => b.entry.localeCompare(a.entry));
      return <article className="client" key={c.id}>
        <header className="mv-client-header"><div><h3>{c.name}</h3><p>{c.phone}</p></div><p className="mv-count">{orders.length} órdenes</p></header>
        {orders.length > 0 && <ol className="clients-view__timeline" aria-label={`Historial de ${c.name}, más reciente primero`}>
          {orders.map(o => <li key={o.id}>
            <div><strong>{o.id} · {o.equipment}</strong></div>
            <p>Ingreso: {o.entry || "Sin fecha"}{o.finish && <> · Finalización: {o.finish}</>}</p>
            <p>{o.mode}</p><div className="mv-signals"><span>Reparación: <StatusPill kind="repair" value={o.repair} /></span><span>Cobro: <StatusPill kind="payment" value={paymentStatus(o)} /></span><span>Entrega: <StatusPill kind="delivery" value={o.delivery} /></span></div>
            <InlineOrder order={o} data={d} actions={actions} />
          </li>)}
        </ol>}
      </article>;
    })}
  </section>;
}
