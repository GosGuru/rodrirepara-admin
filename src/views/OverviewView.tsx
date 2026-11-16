import { useRef, useState } from 'react';
import { Wrench, Wallet, Clock, MessageCircle, Plus, UserPlus, Receipt, List, GripVertical, X, UserRound, MapPin, ChevronDown } from 'lucide-react';
import { KanbanColorSettings } from './KanbanColorSettings';
import { colorNames, readColors, saveColors, type ColorName, type Stage } from './kanban-color-settings';
import type { Data } from '../repository';
import type { WorkshopActions } from '../components/workshop/actions';
import { money, paymentStatus } from '../selectors';
import { moveChoices, moveRepair, repairColumns, type MoveTarget, type RepairColumn } from './repair-board';
import { chartData, type ChartRow } from './overview-board/charts';
import { InlineOrder } from '../components/view-primitives';
import { SideSheet } from '../components/SideSheet';
import { StatusPill } from '../components/StatusPill';
import './overview-board.css';

type Stats = { collected: number; active: number; pending: number; leads: number };
type Metric = keyof Stats;
type Move = { id: string; source: RepairColumn['id']; target: MoveTarget };
const metricNames: Record<Metric, string> = { active: 'Trabajos activos', collected: 'Cobrado hoy', pending: 'Por cobrar', leads: 'Consultas nuevas' };
function Bars({ rows, monetary = false }: { rows: ChartRow[]; monetary?: boolean }) {
  const max = Math.max(0, ...rows.map(r => r.value));
  if (!rows.length) return <p>No hay registros para mostrar.</p>;
  return <ul className="ob-chart">{rows.map((row, i) => <li key={`${row.label}-${i}`}><div><span>{row.label}</span><strong>{monetary ? money(row.value) : row.value}</strong></div><span className="ob-track" aria-hidden="true"><span style={{ width: `${max ? row.value / max * 100 : 0}%` }} /></span></li>)}</ul>;
}
export function OverviewView({ data: d, stats, onViewOrders, onCreateRepair, onCreateClient, onCreateExpense, actions }: {
  data: Data; actions?: WorkshopActions; stats: Stats; onViewOrders: () => void; onCreateRepair: () => void; onCreateClient: () => void; onCreateExpense: () => void;
}) {
  const [colors, setColors] = useState(readColors);
  const [colorError, setColorError] = useState(false);
  function changeColor(stage: Stage, color: ColorName) {
    if (!Object.hasOwn(colorNames, color)) return;
    const next = { ...colors, [stage]: color };
    setColors(next); setColorError(!saveColors(next));
  }
  const [metric, setMetric] = useState<Metric | null>(null);
  const [move, setMove] = useState<Move | null>(null);
  const [choice, setChoice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const busyIds = useRef(new Set<string>());
  const dragging = useRef<{ id: string; source: RepairColumn['id'] } | null>(null);
  const charts = chartData(d);
  const metrics = [
    { key: 'active' as const, icon: Wrench, sub: 'Distribución por estado de reparación' },
    { key: 'collected' as const, icon: Wallet, sub: 'Cobros registrados por mes' },
    { key: 'pending' as const, icon: Clock, sub: 'Órdenes con precio final' },
    { key: 'leads' as const, icon: MessageCircle, sub: 'Estados actuales de consultas' },
  ];
  function propose(id: string, source: RepairColumn['id'], target: MoveTarget) {
    if (!actions || source === target || busyIds.current.has(id)) return;
    setError(''); setChoice(''); setMove({ id, source, target });
  }
  async function confirmMove() {
    if (!move || !choice || busyIds.current.has(move.id)) return;
    const captured = move;
    busyIds.current.add(captured.id); setBusy(true); setError('');
    try { await moveRepair(actions, captured.id, captured.source, captured.target, choice); setMove(null); }
    catch { setError('No se pudo guardar el cambio. La orden conserva su estado anterior. Volvé a intentar.'); }
    finally { busyIds.current.delete(captured.id); setBusy(false); }
  }
  return <>
    <section className="ob-actions"><h2>Accesos rápidos</h2><div><button className="primary" onClick={onCreateRepair}><Plus aria-hidden="true" /> Nueva reparación</button><button onClick={onCreateClient}><UserPlus aria-hidden="true" /> Nuevo cliente</button><button onClick={onCreateExpense}><Receipt aria-hidden="true" /> Registrar gasto</button><button onClick={onViewOrders}><List aria-hidden="true" /> Ver trabajos →</button></div></section>
    <section className="ob-metrics" aria-label="Indicadores">{metrics.map(({ key, icon: Icon, sub }) => <button type="button" className={`ob-metric ob-metric--${key}`} key={key} onClick={() => setMetric(key)} aria-label={`Ver detalles de ${metricNames[key]}`}><span className="ob-metric-label"><Icon aria-hidden="true" /> {metricNames[key]}</span><strong>{key === 'collected' || key === 'pending' ? money(stats[key]) : stats[key]}</strong><span>{sub}</span><b>Ver detalles →</b></button>)}</section>
    <section className="ob-section"><div className="ob-toolbar"><h2>Reparaciones</h2><div className="ob-toolbar-controls"><KanbanColorSettings colors={colors} onChange={changeColor} /><button type="button" onClick={onViewOrders}>Ver todos →</button></div></div>
      {colorError && <p role="alert">No se pudieron guardar los colores en este navegador. El cambio solo se verá hasta cerrar esta página.</p>}
      {!actions && <p>Los movimientos no están disponibles en modo de lectura.</p>}
      <div className="ob-board" role="group" aria-label="Trabajos por estado de reparación">{repairColumns(d.orders).map(column => <section className={`ob-column ob-column--${column.id}${column.id === 'other' ? '' : ` ob-color--${colors[column.id]}`}`} aria-label={column.title} key={column.id} onDragOver={e => { if (actions && column.id !== 'other' && dragging.current) e.preventDefault(); }} onDrop={e => { e.preventDefault(); const current = dragging.current; dragging.current = null; if (current && column.id !== 'other') propose(current.id, current.source, column.id); }}>
        <header><h3>{column.title}</h3><span aria-label={`${column.orders.length} ${column.orders.length === 1 ? 'trabajo' : 'trabajos'}`}>{column.orders.length}</span></header><div className="ob-cards">{!column.orders.length && <p>{column.empty}</p>}{column.orders.map(o => <article className="ob-card" key={o.id}>
          <div className="ob-card-main">
            <div className="ob-card-heading"><div className="ob-card-identity"><strong className="ob-client ob-card-context"><UserRound aria-hidden="true" />{d.clients.find(c => c.id === o.clientId)?.name ?? 'Cliente desconocido'}</strong><span className="ob-equipment">Lavarropas {o.equipment}</span></div><div className="ob-card-meta"><button type="button" draggable="true" disabled={!actions || busyIds.current.has(o.id)} aria-label={`Arrastrar ${o.id}; también podés usar Mover`} onDragStart={e => { if (!actions) { e.preventDefault(); return; } dragging.current = { id: o.id, source: column.id }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', o.id); }} onDragEnd={() => { dragging.current = null; }}><GripVertical aria-hidden="true" /></button></div></div>
            <div className="ob-card-contexts"><span className="ob-mode ob-card-context"><MapPin aria-hidden="true" />{o.mode}</span><div className="ob-card-repair"><Wrench aria-hidden="true" /><StatusPill kind="repair" value={o.repair} /></div></div>
          </div>
          <div className="ob-card-states"><div><span>Cobro:</span><StatusPill kind="payment" value={paymentStatus(o)} /></div><div><span>Entrega:</span><StatusPill kind="delivery" value={o.delivery} /></div></div>
          <footer className="ob-card-actions"><InlineOrder order={o} data={d} actions={actions} /><label className="ob-move-control"><select aria-label={`Mover ${o.id}`} value="" disabled={!actions || busyIds.current.has(o.id)} onChange={e => { const target = e.target.value as MoveTarget; if (target) propose(o.id, column.id, target); }}><option value="">Mover</option><option value="pending">Pendientes</option><option value="progress">En proceso</option><option value="ready">Listos</option></select><ChevronDown aria-hidden="true" /></label></footer>
        </article>)}</div></section>)}</div>
    </section>
    <SideSheet open={metric !== null} titleId="overview-metric-title" onRequestClose={() => setMetric(null)} header={<div className="ob-sheet-heading"><h2 id="overview-metric-title">{metric ? metricNames[metric] : 'Indicador'}</h2><button type="button" onClick={() => setMetric(null)} aria-label="Cerrar detalle"><X aria-hidden="true" /></button></div>} footer={<><span>Solo lectura</span><button type="button" onClick={() => setMetric(null)}>Cerrar detalle</button></>}>
      {metric === 'active' && <><h3>En qué etapa está cada trabajo</h3><Bars rows={charts.active} /><p>Distribución actual; reparación, cobro y entrega son independientes.</p></>}
      {metric === 'collected' && <><h3>Historial de cobros por mes</h3><Bars rows={charts.collected} monetary /><p>Movimientos registrados, no ganancia ni saldo de caja.</p></>}
      {metric === 'pending' && <><h3>Saldo por orden</h3><Bars rows={charts.pending} monetary /><p>{charts.excluded} órdenes sin precio final excluidas. Precio final menos cobrado; el presupuesto no es deuda.</p></>}
      {metric === 'leads' && <><h3>Estado de las consultas</h3><Bars rows={charts.leads} /><p>Estados registrados actualmente.</p></>}
    </SideSheet>
    <SideSheet open={move !== null} titleId="overview-move-title" busy={busy} onRequestClose={() => { if (!busy) setMove(null); }} header={<div className="ob-sheet-heading"><h2 id="overview-move-title">Mover {move?.id}</h2><button type="button" disabled={busy} onClick={() => setMove(null)} aria-label="Cerrar movimiento"><X aria-hidden="true" /></button></div>} footer={<><button type="button" disabled={busy} onClick={() => setMove(null)}>Cancelar</button><button type="button" className="primary ob-move-save" aria-busy={busy} disabled={!choice || busy} onClick={confirmMove}>Guardar estado</button></>}>
      <p>Elegí el estado exacto que querés guardar. Cobro y entrega no cambian.</p>{move && <fieldset disabled={busy}><legend>Estado de reparación</legend>{moveChoices[move.target].map(label => <label className="ob-choice" key={label}><input type="radio" name="overview-move" value={label} checked={choice === label} onChange={() => setChoice(label)} /> {label}</label>)}</fieldset>}{error && <p role="alert">{error}</p>}
    </SideSheet>
  </>;
}
