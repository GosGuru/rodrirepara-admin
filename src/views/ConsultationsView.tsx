import type { Data } from "../repository";
import { StatusPill } from "../components/StatusPill";
import "./module-visuals.css";
export function ConsultationsView({ data: d, leads }: { data: Data; leads: number }) {
  return <section className="panel mv-consultations"><h2>Consultas comerciales</h2>
    <p>Seguimiento manual de consultas; sin integración automática de WhatsApp.</p>
    <div className="mv-consultations-list">{d.leads.length ? d.leads.map(l => <article className="mv-consultation" key={l.id}>
      <div className="mv-consultation-heading"><div><h3>{l.name}</h3><p>{l.phone}</p></div><StatusPill kind="lead" value={l.state} /></div>
      <dl><div className="mv-problem"><dt>Problema</dt><dd>{l.problem}</dd></div><div><dt>Fecha</dt><dd>{l.date}</dd></div><div><dt>Origen</dt><dd>{l.source}</dd></div></dl>
    </article>) : <p>No hay registros para mostrar.</p>}</div>
    <p>Consultas nuevas: {leads} de {d.leads.length}. Los orígenes corresponden a los registros mostrados.</p>
  </section>;
}
