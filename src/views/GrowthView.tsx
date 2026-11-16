import "./module-visuals.css";

export function GrowthView() {
  return <section className="panel mv-growth">
    <h2>Crecimiento por etapas</h2>
    <ol className="mv-growth-plan">
      {[["1 · Control", "Clientes, reparaciones y dinero."], ["2 · Organización", "Técnicos, repuestos y procesos."], ["3 · Expansión", "Lavanderías, contratos y equipos."]].map(([title, description]) => <li key={title}><strong>{title}</strong><p>{description}</p></li>)}
    </ol>
    <div className="mv-growth-decision"><p>Decisión A/B/C pendiente: solo Rodrigo, Rodrigo y Santiago, o futuros técnicos. Rodrigo es responsable de ejemplo; no hay permisos activos.</p></div>
    <p>Sin facturación fiscal, sucursales, automatizaciones ni gestión avanzada de empleados.</p>
  </section>;
}
