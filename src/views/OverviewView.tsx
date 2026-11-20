import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Wrench,
  CreditCard,
  Clock,
  MessageCircle,
  Plus,
  CheckCircle2,
  MoreHorizontal,
  UserRound,
  MapPin,
  RefreshCw,
  Check,
  LayoutGrid,
  List,
  X,
  ChevronDown,
  ChevronRight,
  Layers,
  GripVertical,
  Store,
  Home,
  ClipboardList,
  Package,
} from 'lucide-react';
import { getStageColumnStyle, type Stage, type StageColors } from './kanban-color-settings';
import type { Data, Order } from '../repository';
import type { WorkshopActions } from '../components/workshop/actions';
import { money, paymentStatus } from '../selectors';
import { moveChoices, moveRepair, repairColumns, type MoveTarget, type RepairColumn } from './repair-board';
import { chartData, type ChartRow } from './overview-board/charts';
import { InlineOrder } from '../components/view-primitives';
import { useOrderSheet } from '../components/OrderSheetProvider';
import { SideSheet } from '../components/SideSheet';
import { StatusPill } from '../components/StatusPill';
import { MetricDrawers, type PanelMetric } from './overview-board/MetricDrawers';
import { CardContextMenu } from './overview-board/CardContextMenu';
import { ContactDrawer } from './overview-board/ContactDrawer';
import './overview-board.css';

type Stats = { collected: number; active: number; pending: number; leads: number };
type Metric = keyof Stats;
type Move = { id: string; source: RepairColumn['id']; target: MoveTarget | 'any'; currentRepair: string };
type RevenueRange = 'month' | 'prev' | 'all';

const metricNames: Record<Metric, string> = {
  active: 'Trabajos activos',
  collected: 'Cobrado hoy',
  pending: 'Por cobrar',
  leads: 'Consultas nuevas',
};

const shortMonths = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

const stageMeta: Record<RepairColumn['id'], { color: string; icon: typeof Clock }> = {
  pending: { color: '#945c0e', icon: Clock },
  progress: { color: '#3965ff', icon: Wrench },
  ready: { color: '#4e9543', icon: CheckCircle2 },
  other: { color: '#7b5ba6', icon: Layers },
};

function compactMoney(n: number): string {
  return '$' + n.toLocaleString('es-AR');
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 20.5l1.6-5.1A8.5 8.5 0 1 1 21 11.5Z" />
      <path d="M9.5 9.2c.2-.4.5-.5.8-.3l1 .6c.3.2.4.5.2.8l-.4.7c.5.9 1.2 1.6 2.1 2.1l.7-.4c.3-.2.6-.1.8.2l.6 1c.2.3.1.6-.3.8-.7.4-1.6.5-2.6.1-1.9-.7-3.4-2.2-4.1-4.1-.4-1-.3-1.9.1-2.6Z" />
    </svg>
  );
}

function Bars({ rows, monetary = false }: { rows: ChartRow[]; monetary?: boolean }) {
  const max = Math.max(0, ...rows.map(r => r.value));
  if (!rows.length) return <p>No hay registros para mostrar.</p>;
  return (
    <ul className="ob-chart">
      {rows.map((row, i) => (
        <li key={`${row.label}-${i}`}>
          <div>
            <span>{row.label}</span>
            <strong>{monetary ? money(row.value) : row.value}</strong>
          </div>
          <span className="ob-track" aria-hidden="true">
            <span style={{ width: `${max ? (row.value / max) * 100 : 0}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function computeActiveMonthDelta(orders: readonly Order[]): number | null {
  const counts = new Map<string, number>();
  for (const o of orders) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(o.entry)) {
      const ym = o.entry.slice(0, 7);
      counts.set(ym, (counts.get(ym) ?? 0) + 1);
    }
  }
  const sorted = [...counts.keys()].sort();
  if (sorted.length < 2) return null;
  const latest = counts.get(sorted[sorted.length - 1]) ?? 0;
  const previous = counts.get(sorted[sorted.length - 2]) ?? 0;
  return latest - previous;
}

function parsePaymentDate(date: string): { ym: string; day: number; monthIndex: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return null;
  const parsed = new Date(`${date}T00:00:00Z`);
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== date) return null;
  return {
    ym: `${match[1]}-${match[2]}`,
    day: Number(match[3]),
    monthIndex: Number(match[2]) - 1,
  };
}

function computeRevenueChart(data: Data, range: RevenueRange) {
  const validPayments = data.payments
    .map(p => ({ amount: p.amount, date: p.date, parsed: parsePaymentDate(p.date) }))
    .filter((p): p is { amount: number; date: string; parsed: NonNullable<ReturnType<typeof parsePaymentDate>> } => p.parsed !== null);

  const byMonth = new Map<string, typeof validPayments>();
  for (const p of validPayments) {
    const arr = byMonth.get(p.parsed.ym) ?? [];
    arr.push(p);
    byMonth.set(p.parsed.ym, arr);
  }

  const now = new Date();
  const todayYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const monthsSorted = [...byMonth.keys()].sort();
  const activeYm = byMonth.has(todayYm)
    ? todayYm
    : monthsSorted[monthsSorted.length - 1] ?? todayYm;
  const activeIdx = monthsSorted.indexOf(activeYm);
  const prevYm = activeIdx > 0 ? monthsSorted[activeIdx - 1] : null;

  const activeItems = byMonth.get(activeYm) ?? [];
  const prevItems = prevYm ? byMonth.get(prevYm) ?? [] : [];
  const activeTotal = activeItems.reduce((sum, p) => sum + p.amount, 0);
  const prevTotal = prevItems.reduce((sum, p) => sum + p.amount, 0);

  let selectedItems = activeItems;
  let displayYm = activeYm;
  if (range === 'prev') {
    selectedItems = prevItems;
    displayYm = prevYm ?? activeYm;
  } else if (range === 'all') {
    selectedItems = validPayments;
  }

  const total = selectedItems.reduce((sum, p) => sum + p.amount, 0);
  let pctChange: number | null = null;
  if (range === 'month' && prevTotal > 0) {
    pctChange = Math.round(((activeTotal - prevTotal) / prevTotal) * 100);
  }

  const monthIdx = Math.max(0, Math.min(11, Number(displayYm.slice(5, 7)) - 1));
  const monthAbbr = shortMonths[monthIdx] ?? 'mes';

  if (range === 'all' && monthsSorted.length >= 2) {
    const running: { label: string; value: number }[] = [];
    let acc = 0;
    for (const ym of monthsSorted) {
      acc += (byMonth.get(ym) ?? []).reduce((s, p) => s + p.amount, 0);
      const mi = Math.max(0, Math.min(11, Number(ym.slice(5, 7)) - 1));
      running.push({ label: `${shortMonths[mi]} ${ym.slice(2, 4)}`, value: acc });
    }
    const labels = running.map(r => r.label);
    const values = running.map(r => r.value);
    return { total, pctChange, labels, values };
  }

  const maxDay = Math.max(
    18,
    ...selectedItems.map(p => p.parsed.day),
  );
  const tickDays = [1, 4, 7, 10, 13, 16, Math.min(31, maxDay)];
  const labels = tickDays.map(d => `${d} ${monthAbbr}`);

  // Build cumulative daily checkpoints across the month
  const sampleDays = Array.from({ length: 13 }, (_, i) => Math.max(1, Math.round(1 + (i * (maxDay - 1)) / 12)));
  const dailyTotals = new Map<number, number>();
  for (const p of selectedItems) {
    dailyTotals.set(p.parsed.day, (dailyTotals.get(p.parsed.day) ?? 0) + p.amount);
  }
  const values = sampleDays.map(day => {
    let sum = 0;
    for (const [d, amt] of dailyTotals) {
      if (d <= day) sum += amt;
    }
    return sum;
  });

  return { total, pctChange, labels, values };
}

function buildSmoothPaths(values: number[], width: number, height: number, padTop: number, padBottom: number) {
  const usableH = height - padTop - padBottom;
  const maxVal = Math.max(1, ...values);
  const count = Math.max(2, values.length);
  const pts = values.map((v, i) => ({
    x: 6 + (i / (count - 1)) * (width - 14),
    y: padTop + usableH - (v / maxVal) * usableH,
  }));

  if (pts.length === 1) {
    pts.push({ x: width - 8, y: pts[0].y });
  }

  let line = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = Math.max(padTop - 2, Math.min(height - padBottom, p1.y + (p2.y - p0.y) / 6));
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = Math.max(padTop - 2, Math.min(height - padBottom, p2.y - (p3.y - p1.y) / 6));
    line += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  const last = pts[pts.length - 1];
  const area = `${line} L ${last.x.toFixed(1)} ${height} L ${pts[0].x.toFixed(1)} ${height} Z`;
  return { line, area, last };
}

function CollectDeliverButton({ order }: { order: Order }) {
  const sheet = useOrderSheet();
  return (
    <button
      type="button"
      className="ob-btn ob-btn--deliver"
      disabled={sheet?.locked}
      onClick={e => sheet?.show(order, e.currentTarget)}
    >
      <Check size={13} strokeWidth={2.2} aria-hidden="true" />
      <span>Cobrar y entregar</span>
    </button>
  );
}

export function OverviewView({
  data: d,
  stats,
  onViewOrders,
  onCreateRepair,
  onOpenConsultations,
  onOpenFinance,
  colors,
  colorError,
  actions,
}: {
  data: Data;
  actions?: WorkshopActions;
  stats: Stats;
  onViewOrders: () => void;
  onCreateRepair: () => void;
  onCreateClient?: () => void;
  onCreateExpense?: () => void;
  onOpenConsultations?: () => void;
  onOpenFinance?: () => void;
  colors?: StageColors;
  colorError?: boolean;
}) {
  const orderSheet = useOrderSheet();
  const [metric, setMetric] = useState<Metric | null>(null);
  const [move, setMove] = useState<Move | null>(null);
  const [choice, setChoice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [revenueRange, setRevenueRange] = useState<RevenueRange>('month');
  const [rangeMenuOpen, setRangeMenuOpen] = useState(false);
  const [contactOrder, setContactOrder] = useState<Order | null>(null);
  const [contextMenu, setContextMenu] = useState<{ order: Order; anchor: HTMLElement } | null>(null);
  const [dragInfo, setDragInfo] = useState<{ id: string; source: RepairColumn['id']; clientName: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<MoveTarget | null>(null);
  const [pendingDrop, setPendingDrop] = useState<{ id: string; source: RepairColumn['id']; clientName: string; equipment: string } | null>(null);
  const [justMovedId, setJustMovedId] = useState<string | null>(null);
  const [movingIds, setMovingIds] = useState<ReadonlySet<string>>(() => new Set());
  const [boardError, setBoardError] = useState('');
  const busyIds = useRef(new Set<string>());
  const dragging = useRef<{ id: string; source: RepairColumn['id']; clientName: string } | null>(null);
  const justMovedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (justMovedTimer.current) clearTimeout(justMovedTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!pendingDrop) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPendingDrop(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [pendingDrop]);

  function triggerLanding(orderId: string) {
    if (justMovedTimer.current) clearTimeout(justMovedTimer.current);
    setJustMovedId(orderId);
    justMovedTimer.current = setTimeout(() => {
      setJustMovedId(prev => (prev === orderId ? null : prev));
      justMovedTimer.current = null;
    }, 680);
  }

  function addMovingId(orderId: string) {
    busyIds.current.add(orderId);
    setMovingIds(new Set(busyIds.current));
  }

  function removeMovingId(orderId: string) {
    busyIds.current.delete(orderId);
    setMovingIds(new Set(busyIds.current));
  }

  async function executeDropMove(
    orderId: string,
    source: RepairColumn['id'],
    target: MoveTarget,
    nextRepair: string,
  ) {
    if (!actions || busyIds.current.has(orderId) || source === target) return;
    setBoardError('');
    addMovingId(orderId);
    try {
      const moved = await moveRepair(actions, orderId, source, target, nextRepair);
      if (moved) {
        setPendingDrop(prev => (prev?.id === orderId ? null : prev));
        triggerLanding(orderId);
      }
    } catch {
      setBoardError('No se pudo guardar el cambio. La orden conserva su estado anterior. Volvé a intentar.');
    } finally {
      removeMovingId(orderId);
    }
  }

  const charts = chartData(d);
  const columns = repairColumns(d.orders);
  const activeDelta = useMemo(() => computeActiveMonthDelta(d.orders), [d.orders]);
  const pendingOrdersCount = useMemo(
    () => d.orders.filter(o => o.price !== null && o.price > o.paid).length,
    [d.orders],
  );
  const revenue = useMemo(() => computeRevenueChart(d, revenueRange), [d, revenueRange]);
  const areaGeometry = useMemo(
    () => buildSmoothPaths(revenue.values, 434, 62, 10, 6),
    [revenue.values],
  );

  // Donut segments (always show Pendientes, En proceso, Listos; include Otros only when non-empty)
  const donutItems = useMemo(() => {
    const total = columns.reduce((s, c) => s + c.orders.length, 0);
    return columns.map(col => ({
      id: col.id,
      title: col.title,
      count: col.orders.length,
      pct: total > 0 ? Math.round((col.orders.length / total) * 100) : 0,
      color: stageMeta[col.id].color,
    }));
  }, [columns]);
  const donutTotal = donutItems.reduce((s, i) => s + i.count, 0);
  const donutRadius = 39.5;
  const donutCirc = 2 * Math.PI * donutRadius;
  const nonZeroCount = donutItems.filter(i => i.count > 0).length;
  const donutGap = nonZeroCount > 1 ? 2.4 : 0;

  let donutOffset = 0;
  const donutSegments = donutItems
    .filter(item => item.count > 0)
    .map(item => {
      const rawLen = (item.count / Math.max(1, donutTotal)) * donutCirc;
      const segLen = Math.max(0.5, rawLen - donutGap);
      const seg = { ...item, dashArray: `${segLen.toFixed(2)} ${(donutCirc - segLen).toFixed(2)}`, dashOffset: -donutOffset };
      donutOffset += rawLen;
      return seg;
    });

  function openMove(order: Order, source: RepairColumn['id'], target: MoveTarget | 'any') {
    if (!actions || busyIds.current.has(order.id)) return;
    if (target !== 'any' && source === target) return;
    setError('');
    setChoice('');
    setMove({ id: order.id, source, target, currentRepair: order.repair });
  }

  async function confirmMove() {
    if (!move || !choice || busyIds.current.has(move.id)) return;
    const captured = move;
    const resolvedTarget: MoveTarget =
      captured.target !== 'any'
        ? captured.target
        : moveChoices.pending.includes(choice)
          ? 'pending'
          : moveChoices.progress.includes(choice)
            ? 'progress'
            : 'ready';
    addMovingId(captured.id);
    setBusy(true);
    setError('');
    try {
      if (captured.target === 'any') {
        await actions?.updateOrder(captured.id, { repair: choice });
      } else {
        await moveRepair(actions, captured.id, captured.source, resolvedTarget, choice);
      }
      setMove(null);
      triggerLanding(captured.id);
    } catch {
      setError('No se pudo guardar el cambio. La orden conserva su estado anterior. Volvé a intentar.');
    } finally {
      removeMovingId(captured.id);
      setBusy(false);
    }
  }

  async function applyQuickRepair(orderId: string, nextRepair: string) {
    if (!actions || busyIds.current.has(orderId)) return;
    addMovingId(orderId);
    setBoardError('');
    try {
      await actions.updateOrder(orderId, { repair: nextRepair });
      triggerLanding(orderId);
    } catch {
      setBoardError('No se pudo guardar el cambio. La orden conserva su estado anterior. Volvé a intentar.');
    } finally {
      removeMovingId(orderId);
    }
  }

  const allActiveOrders = useMemo(() => columns.flatMap(c => c.orders.map(o => ({ order: o, column: c }))), [columns]);
  const contactClient = contactOrder ? d.clients.find(c => c.id === contactOrder.clientId) : null;

  function stageClass(colId: RepairColumn['id']): string {
    return `ob-column ob-column--${colId}`;
  }

  function stageStyle(colId: RepairColumn['id']) {
    if (colId === 'other' || !colors) return undefined;
    return getStageColumnStyle(colors[colId as Stage]);
  }

  return (
    <div className="ob-root">
      {/* Row 1: 4 KPI Cards */}
      <section className="ob-metrics" aria-label="Indicadores">
        <button
          type="button"
          className="ob-kpi ob-kpi--active"
          onClick={() => setMetric('active')}
          aria-label="Ver detalles de Trabajos activos"
        >
          <span className="ob-kpi-icon ob-kpi-icon--blue" aria-hidden="true">
            <Wrench size={17} strokeWidth={1.9} />
          </span>
          <span className="ob-kpi-body">
            <span className="ob-kpi-label">Trabajos activos</span>
            <strong className="ob-kpi-value">{stats.active}</strong>
            <span className="ob-kpi-sub">
              {activeDelta !== null ? (
                <>
                  <em className={`ob-kpi-delta ${activeDelta >= 0 ? 'ob-kpi-delta--up' : 'ob-kpi-delta--down'}`}>
                    {activeDelta >= 0 ? `↑ +${activeDelta}` : `↓ ${activeDelta}`}
                  </em>{' '}
                  vs. mes anterior
                </>
              ) : (
                'Órdenes en seguimiento'
              )}
            </span>
          </span>
        </button>

        <button
          type="button"
          className="ob-kpi ob-kpi--collected"
          onClick={() => setMetric('collected')}
          aria-label="Ver detalles de Cobrado hoy"
        >
          <span className="ob-kpi-icon ob-kpi-icon--green" aria-hidden="true">
            <CreditCard size={17} strokeWidth={1.9} />
          </span>
          <span className="ob-kpi-body">
            <span className="ob-kpi-label">Cobrado hoy</span>
            <strong className="ob-kpi-value">{compactMoney(stats.collected)}</strong>
            <span className="ob-kpi-sub">Cobros registrados</span>
          </span>
        </button>

        <button
          type="button"
          className="ob-kpi ob-kpi--pending"
          onClick={() => setMetric('pending')}
          aria-label="Ver detalles de Por cobrar"
        >
          <span className="ob-kpi-icon ob-kpi-icon--amber" aria-hidden="true">
            <Clock size={17} strokeWidth={1.9} />
          </span>
          <span className="ob-kpi-body">
            <span className="ob-kpi-label">Por cobrar</span>
            <strong className="ob-kpi-value">{compactMoney(stats.pending)}</strong>
            <span className="ob-kpi-sub">
              {pendingOrdersCount === 1 ? '1 orden pendiente' : `${pendingOrdersCount} órdenes pendientes`}
            </span>
          </span>
        </button>

        <button
          type="button"
          className="ob-kpi ob-kpi--leads"
          onClick={() => setMetric('leads')}
          aria-label="Ver detalles de Consultas nuevas"
        >
          <span className="ob-kpi-icon ob-kpi-icon--purple" aria-hidden="true">
            <MessageCircle size={17} strokeWidth={1.9} />
          </span>
          <span className="ob-kpi-body">
            <span className="ob-kpi-label">Consultas nuevas</span>
            <strong className="ob-kpi-value">{stats.leads}</strong>
            <span className="ob-kpi-sub">Sin responder</span>
          </span>
        </button>
      </section>

      {/* Row 2: Two Analytical Charts */}
      <section className="ob-charts" aria-label="Resumen visual">
        <article className="ob-card-panel ob-income-panel">
          <div className="ob-income-top">
            <div>
              <h2>Ingresos del mes</h2>
              <div className="ob-income-figure">
                <strong>{compactMoney(revenue.total)}</strong>
                {revenue.pctChange !== null && (
                  <span className={`ob-trend-pill${revenue.pctChange < 0 ? ' ob-trend-pill--down' : ''}`}>
                    {revenue.pctChange >= 0 ? `↑ +${revenue.pctChange}%` : `↓ ${revenue.pctChange}%`}
                  </span>
                )}
              </div>
            </div>
            <div className="ob-period-dropdown">
              <button
                type="button"
                className="ob-period-trigger"
                aria-haspopup="listbox"
                aria-expanded={rangeMenuOpen}
                aria-label="Período de ingresos"
                onClick={() => setRangeMenuOpen(prev => !prev)}
              >
                <span>
                  {revenueRange === 'month' ? 'Este mes' : revenueRange === 'prev' ? 'Mes anterior' : 'Historial'}
                </span>
                <ChevronDown size={13} strokeWidth={2} aria-hidden="true" />
              </button>
              {rangeMenuOpen && (
                <ul className="ob-period-menu" role="listbox" aria-label="Seleccionar período">
                  {(
                    [
                      ['month', 'Este mes'],
                      ['prev', 'Mes anterior'],
                      ['all', 'Historial'],
                    ] as const
                  ).map(([val, label]) => (
                    <li key={val} role="option" aria-selected={revenueRange === val}>
                      <button
                        type="button"
                        className={revenueRange === val ? 'is-selected' : undefined}
                        onClick={() => {
                          setRevenueRange(val);
                          setRangeMenuOpen(false);
                        }}
                      >
                        {label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="ob-area-wrap">
            <svg
              className="ob-area-svg"
              viewBox="0 0 434 64"
              preserveAspectRatio="none"
              role="img"
              aria-label={`Evolución de ingresos: ${compactMoney(revenue.total)}`}
            >
              <defs>
                <linearGradient id="obIncomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b6cff" stopOpacity="0.34" />
                  <stop offset="100%" stopColor="#3b6cff" stopOpacity="0.02" />
                </linearGradient>
              </defs>
              <path d={areaGeometry.area} fill="url(#obIncomeGrad)" />
              <path
                d={areaGeometry.line}
                fill="none"
                stroke="#3b6cff"
                strokeWidth="2.1"
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <span
              className="ob-area-dot"
              aria-hidden="true"
              style={{
                left: `${(areaGeometry.last.x / 434) * 100}%`,
                top: `${(areaGeometry.last.y / 64) * 100}%`,
              }}
            />
          </div>

          <div className="ob-area-ticks" aria-hidden="true">
            {revenue.labels.map((label, idx) => (
              <span key={`${label}-${idx}`}>{label}</span>
            ))}
          </div>
        </article>

        <article className="ob-card-panel ob-status-panel">
          <h2>Reparaciones por estado</h2>
          <div className="ob-donut-row">
            <div className="ob-donut-box">
              <svg
                viewBox="0 0 100 100"
                className="ob-donut-svg"
                role="img"
                aria-label={`Distribución de ${donutTotal} reparaciones activas`}
              >
                <circle
                  cx="50"
                  cy="50"
                  r={donutRadius}
                  fill="none"
                  stroke="#ecebf4"
                  strokeWidth="13.8"
                />
                {donutSegments.map(seg => (
                  <circle
                    key={seg.id}
                    cx="50"
                    cy="50"
                    r={donutRadius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth="13.8"
                    strokeDasharray={seg.dashArray}
                    strokeDashoffset={seg.dashOffset}
                    transform="rotate(-90 50 50)"
                  />
                ))}
              </svg>
              <div className="ob-donut-center">
                <strong>{donutTotal}</strong>
                <span>Total</span>
              </div>
            </div>

            <ul className="ob-donut-legend">
              {donutItems.map(item => (
                <li key={item.id}>
                  <span className="ob-legend-dot" style={{ background: item.color }} aria-hidden="true" />
                  <span className="ob-legend-name">{item.title}</span>
                  <strong className="ob-legend-count">{item.count}</strong>
                  <span className="ob-legend-pct">({item.pct}%)</span>
                </li>
              ))}
            </ul>
          </div>
        </article>
      </section>

      {/* Row 3: Reparaciones Board / List */}
      <section className="ob-section">
        <div className="ob-toolbar">
          <h2>Reparaciones</h2>
          <div className="ob-view-toggle" role="group" aria-label="Vista de reparaciones">
            <button
              type="button"
              className={viewMode === 'board' ? 'is-active' : undefined}
              aria-pressed={viewMode === 'board'}
              onClick={() => setViewMode('board')}
            >
              <LayoutGrid size={13} strokeWidth={1.9} aria-hidden="true" />
              <span>Tablero</span>
            </button>
            <button
              type="button"
              className={viewMode === 'list' ? 'is-active' : undefined}
              aria-pressed={viewMode === 'list'}
              onClick={() => setViewMode('list')}
            >
              <List size={13} strokeWidth={1.9} aria-hidden="true" />
              <span>Lista</span>
            </button>
          </div>
        </div>

        {colorError && (
          <p role="alert" className="ob-notice">
            No se pudieron guardar los colores en este navegador. El cambio solo se verá hasta cerrar esta página.
          </p>
        )}
        {boardError && (
          <div role="alert" className="ob-board-error">
            <span>{boardError}</span>
            <button type="button" onClick={() => setBoardError('')} aria-label="Cerrar error de movimiento">
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}
        {!actions && (
          <p className="ob-readonly-note">Los movimientos no están disponibles en modo de lectura.</p>
        )}

        {viewMode === 'board' ? (
          <div className={`ob-board${columns.length > 3 ? ' ob-board--wide' : ''}${dragInfo ? ' ob-board--dragging' : ''}`} role="group" aria-label="Trabajos por estado de reparación">
            {columns.map(column => {
              const HeaderIcon = stageMeta[column.id].icon;
              const isValidTarget = Boolean(
                actions && dragInfo && column.id !== 'other' && dragInfo.source !== column.id,
              );
              const isDragOver = isValidTarget && dropTarget === column.id;
              const colClass = [
                stageClass(column.id),
                isValidTarget ? 'ob-column--droppable' : '',
                isDragOver ? 'ob-column--drag-over' : '',
              ]
                .filter(Boolean)
                .join(' ');
              const dropHint =
                column.id === 'progress'
                  ? 'Soltar para pasar a «En reparación»'
                  : column.id === 'ready'
                    ? 'Soltar para marcar como «Terminado»'
                    : 'Soltar para elegir estado pendiente';

              return (
                <section
                  className={colClass}
                  style={stageStyle(column.id)}
                  aria-label={column.title}
                  key={column.id}
                  onDragOver={e => {
                    if (actions && column.id !== 'other' && dragging.current && dragging.current.source !== column.id) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                      if (dropTarget !== column.id) setDropTarget(column.id);
                    }
                  }}
                  onDragEnter={e => {
                    if (actions && column.id !== 'other' && dragging.current && dragging.current.source !== column.id) {
                      e.preventDefault();
                      setDropTarget(column.id);
                    }
                  }}
                  onDragLeave={e => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                      setDropTarget(prev => (prev === column.id ? null : prev));
                    }
                  }}
                  onDrop={e => {
                    e.preventDefault();
                    const current = dragging.current;
                    dragging.current = null;
                    setDragInfo(null);
                    setDropTarget(null);
                    if (!current || column.id === 'other' || current.source === column.id) return;
                    const targetOrder = d.orders.find(o => o.id === current.id);
                    if (!targetOrder) return;
                    const choices = moveChoices[column.id];
                    if (choices.length === 1) {
                      void executeDropMove(targetOrder.id, current.source, column.id, choices[0]);
                    } else {
                      setPendingDrop({
                        id: targetOrder.id,
                        source: current.source,
                        clientName: current.clientName,
                        equipment: targetOrder.equipment,
                      });
                    }
                  }}
                >
                  <header className="ob-column-header">
                    <div className="ob-column-title">
                      <HeaderIcon size={14} strokeWidth={1.95} aria-hidden="true" />
                      <h3>{column.title}</h3>
                      <span
                        className="ob-column-count"
                        aria-label={`${column.orders.length} ${column.orders.length === 1 ? 'trabajo' : 'trabajos'}`}
                      >
                        {column.orders.length}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="ob-column-add"
                      aria-label={`Nueva reparación en ${column.title}`}
                      onClick={onCreateRepair}
                    >
                      <Plus size={15} strokeWidth={2} aria-hidden="true" />
                    </button>
                  </header>

                  <div className="ob-cards">
                    {isDragOver && (
                      <div className="ob-drop-slot" aria-live="polite">
                        <HeaderIcon size={14} strokeWidth={2.1} aria-hidden="true" />
                        <span>{dropHint}</span>
                      </div>
                    )}
                    {column.id === 'pending' && pendingDrop && (
                      <div
                        className="ob-pending-drop-picker"
                        role="region"
                        aria-label={`Elegir estado pendiente para ${pendingDrop.clientName}`}
                      >
                        <div className="ob-pending-drop-picker__head">
                          <div className="ob-pending-drop-picker__title-wrap">
                            <span className="ob-pending-drop-picker__badge" aria-hidden="true">
                              <Clock size={14} strokeWidth={2.1} />
                            </span>
                            <div>
                              <strong>Mover a Pendientes</strong>
                              <span>{pendingDrop.clientName} · {pendingDrop.equipment}</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="ob-pending-drop-picker__close"
                            aria-label="Cancelar cambio de estado"
                            onClick={() => setPendingDrop(null)}
                          >
                            <X size={14} aria-hidden="true" />
                          </button>
                        </div>
                        <div className="ob-pending-drop-picker__choices">
                          {moveChoices.pending.map(option => {
                            const OptionIcon =
                              option === 'Visita o recepción'
                                ? ClipboardList
                                : option === 'Esperando aprobación'
                                  ? Clock
                                  : Package;
                            return (
                              <button
                                key={option}
                                type="button"
                                className="ob-pending-drop-picker__pill"
                                disabled={movingIds.has(pendingDrop.id)}
                                onClick={() =>
                                  void executeDropMove(pendingDrop.id, pendingDrop.source, 'pending', option)
                                }
                              >
                                <span className="ob-pending-drop-picker__pill-left">
                                  <span className="ob-pending-drop-picker__pill-icon" aria-hidden="true">
                                    <OptionIcon size={13.5} strokeWidth={2} />
                                  </span>
                                  <span>{option}</span>
                                </span>
                                <ChevronRight size={14} strokeWidth={2} className="ob-pending-drop-picker__pill-arrow" aria-hidden="true" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                    {!column.orders.length && !isDragOver && !(column.id === 'pending' && pendingDrop) && (
                      <div className="ob-empty">
                        <span className="ob-empty__icon" aria-hidden="true">
                          <HeaderIcon size={16} strokeWidth={1.9} />
                        </span>
                        <p>{column.empty}</p>
                      </div>
                    )}
                    {column.orders.map(o => {
                      const clientName = d.clients.find(c => c.id === o.clientId)?.name ?? 'Cliente desconocido';
                      const isMoving = movingIds.has(o.id);
                      const canDrag = Boolean(actions) && !isMoving;
                      const isDraggingCard = dragInfo?.id === o.id;
                      const isJustMoved = justMovedId === o.id;
                      const ModeIcon = o.mode === 'Domicilio' ? Home : Store;
                      const cardClass = [
                        'ob-card',
                        canDrag ? 'ob-card--draggable' : '',
                        isDraggingCard ? 'ob-card--dragging' : '',
                        isJustMoved ? 'ob-card--just-moved' : '',
                        isMoving ? 'ob-card--saving' : '',
                      ]
                        .filter(Boolean)
                        .join(' ');
                      return (
                        <article
                          className={cardClass}
                          key={o.id}
                          draggable={canDrag || undefined}
                          aria-busy={isMoving || undefined}
                          onDragStart={e => {
                            if (!canDrag) {
                              e.preventDefault();
                              return;
                            }
                            setContextMenu(null);
                            setPendingDrop(null);
                            setBoardError('');
                            const info = { id: o.id, source: column.id, clientName };
                            dragging.current = info;
                            setDragInfo(info);
                            e.dataTransfer.effectAllowed = 'move';
                            e.dataTransfer.setData('text/plain', o.id);
                            if (typeof e.dataTransfer.setDragImage === 'function') {
                              const rect = e.currentTarget.getBoundingClientRect();
                              const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
                              ghost.className = 'ob-card ob-drag-ghost';
                              ghost.style.width = `${Math.round(rect.width)}px`;
                              document.body.appendChild(ghost);
                              const offsetX = Math.max(16, Math.min(rect.width - 16, e.clientX - rect.left));
                              const offsetY = Math.max(16, Math.min(rect.height - 16, e.clientY - rect.top));
                              e.dataTransfer.setDragImage(ghost, offsetX, offsetY);
                              requestAnimationFrame(() => ghost.remove());
                            }
                          }}
                          onDragEnd={() => {
                            dragging.current = null;
                            setDragInfo(null);
                            setDropTarget(null);
                          }}
                        >
                          <div className="ob-card-top">
                            <div className="ob-card-identity">
                              <UserRound size={14} strokeWidth={1.85} className="ob-card-user-icon" aria-hidden="true" />
                              <div className="ob-card-names">
                                <strong className="ob-client">{clientName}</strong>
                                <span className="ob-equipment">Lavarropas {o.equipment}</span>
                              </div>
                            </div>
                            <div className="ob-card-top-controls">
                              {canDrag && (
                                <span className="ob-card-grip" aria-hidden="true" title="Arrastrá para cambiar de columna">
                                  <GripVertical size={13.5} strokeWidth={2} />
                                </span>
                              )}
                              <button
                                type="button"
                                className="ob-card-more"
                                disabled={isMoving}
                                aria-label={`Mover o cambiar estado de ${o.id}`}
                                aria-haspopup="menu"
                                aria-expanded={contextMenu?.order.id === o.id}
                                onClick={e => {
                                  const btn = e.currentTarget;
                                  setContextMenu(prev => (prev?.order.id === o.id ? null : { order: o, anchor: btn }));
                                }}
                              >
                                <MoreHorizontal size={15} strokeWidth={2} aria-hidden="true" />
                              </button>
                            </div>
                          </div>

                          <div className="ob-card-meta-row">
                            <span className="ob-mode">
                              <ModeIcon size={13} strokeWidth={1.85} aria-hidden="true" />
                              {o.mode}
                            </span>
                            <StatusPill kind="repair" value={o.repair} showIcon />
                          </div>

                          <footer className="ob-card-actions">
                            <InlineOrder order={o} data={d} actions={actions} />
                            {column.id === 'pending' && (
                              <button
                                type="button"
                                className="ob-btn ob-btn--contact"
                                onClick={() => setContactOrder(o)}
                              >
                                <WhatsAppIcon />
                                <span>Contactar</span>
                              </button>
                            )}
                            {column.id === 'progress' && (
                              <button
                                type="button"
                                className="ob-btn ob-btn--update"
                                disabled={!actions || isMoving}
                                onClick={() => openMove(o, column.id, 'any')}
                              >
                                <RefreshCw size={12} strokeWidth={2} aria-hidden="true" />
                                <span>Actualizar estado</span>
                              </button>
                            )}
                            {column.id === 'ready' && <CollectDeliverButton order={o} />}
                            {column.id === 'other' && (
                              <button
                                type="button"
                                className="ob-btn ob-btn--update"
                                disabled={!actions || isMoving}
                                onClick={() => openMove(o, column.id, 'any')}
                              >
                                <RefreshCw size={12} strokeWidth={2} aria-hidden="true" />
                                <span>Actualizar estado</span>
                              </button>
                            )}
                          </footer>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="ob-list-panel">
            {allActiveOrders.length === 0 ? (
              <p className="ob-empty">No hay reparaciones activas para mostrar.</p>
            ) : (
              <div className="table-wrap">
                <table className="ob-list-table">
                  <thead>
                    <tr>
                      <th>Cliente y equipo</th>
                      <th>Modalidad</th>
                      <th>Estado</th>
                      <th>Cobro</th>
                      <th>Entrega</th>
                      <th className="ob-list-th-actions">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allActiveOrders.map(({ order: o }) => {
                      const clientName = d.clients.find(c => c.id === o.clientId)?.name ?? 'Cliente desconocido';
                      return (
                        <tr key={o.id}>
                          <td>
                            <div className="ob-list-client">
                              <span className="ob-list-avatar" aria-hidden="true">
                                <UserRound size={14} strokeWidth={1.85} />
                              </span>
                              <div className="ob-list-client-copy">
                                <strong>{clientName}</strong>
                                <span>Lavarropas {o.equipment}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="ob-list-mode">
                              <MapPin size={13} strokeWidth={1.85} aria-hidden="true" />
                              {o.mode}
                            </span>
                          </td>
                          <td><StatusPill kind="repair" value={o.repair} /></td>
                          <td><StatusPill kind="payment" value={paymentStatus(o)} /></td>
                          <td><StatusPill kind="delivery" value={o.delivery} /></td>
                          <td>
                            <div className="ob-list-actions">
                              <InlineOrder order={o} data={d} actions={actions} />
                              <button
                                type="button"
                                className="ob-list-more"
                                disabled={busyIds.current.has(o.id)}
                                aria-label={`Más acciones para ${o.id}`}
                                aria-haspopup="menu"
                                aria-expanded={contextMenu?.order.id === o.id}
                                onClick={e => {
                                  const btn = e.currentTarget;
                                  setContextMenu(prev => (prev?.order.id === o.id ? null : { order: o, anchor: btn }));
                                }}
                              >
                                <MoreHorizontal size={15} strokeWidth={2} aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <div className="ob-list-footer">
              <span className="ob-list-summary">
                {allActiveOrders.length === 1
                  ? '1 reparación activa'
                  : `${allActiveOrders.length} reparaciones activas`}
              </span>
              <button type="button" className="ob-btn ob-btn--update" onClick={onViewOrders}>
                Ver todas las órdenes →
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Metric Drawers: Trabajos activos, Cobrado hoy, Por cobrar */}
      <MetricDrawers
        metric={metric === 'active' || metric === 'collected' || metric === 'pending' ? (metric as PanelMetric) : null}
        data={d}
        stats={stats}
        onClose={() => setMetric(null)}
        onOpenFinance={onOpenFinance}
        onSelectOrder={(order, trigger) => orderSheet?.show(order, trigger)}
      />

      {/* Contextual Menu for card three-dots button */}
      {contextMenu && (
        <CardContextMenu
          order={d.orders.find(o => o.id === contextMenu.order.id) ?? contextMenu.order}
          anchor={contextMenu.anchor}
          canEdit={Boolean(actions)}
          busy={busy || busyIds.current.has(contextMenu.order.id)}
          onClose={() => setContextMenu(null)}
          onViewDetail={() => orderSheet?.show(contextMenu.order, contextMenu.anchor)}
          onEdit={() => orderSheet?.show(contextMenu.order, contextMenu.anchor, 'edit')}
          onRegisterPayment={() => orderSheet?.show(contextMenu.order, contextMenu.anchor, 'payment')}
          onChangeRepair={nextRepair => applyQuickRepair(contextMenu.order.id, nextRepair)}
        />
      )}

      {/* Existing Consultas nuevas SideSheet (untouched per scope) */}
      <SideSheet
        open={metric === 'leads'}
        titleId="overview-metric-title"
        onRequestClose={() => setMetric(null)}
        header={
          <div className="ob-sheet-heading">
            <h2 id="overview-metric-title">{metricNames.leads}</h2>
            <button type="button" onClick={() => setMetric(null)} aria-label="Cerrar detalle">
              <X aria-hidden="true" />
            </button>
          </div>
        }
        footer={
          <>
            <span>Solo lectura</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {onOpenConsultations && (
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    setMetric(null);
                    onOpenConsultations();
                  }}
                >
                  Ir a Consultas
                </button>
              )}
              <button type="button" onClick={() => setMetric(null)}>
                Cerrar detalle
              </button>
            </div>
          </>
        }
      >
        <h3>Estado de las consultas</h3>
        <Bars rows={charts.leads} />
        <p>Estados registrados actualmente.</p>
      </SideSheet>

      {/* Move / Update repair state SideSheet */}
      <SideSheet
        open={move !== null}
        titleId="overview-move-title"
        busy={busy}
        onRequestClose={() => {
          if (!busy) setMove(null);
        }}
        header={
          <div className="ob-sheet-heading">
            <h2 id="overview-move-title">Actualizar estado · {move?.id}</h2>
            <button type="button" disabled={busy} onClick={() => setMove(null)} aria-label="Cerrar movimiento">
              <X aria-hidden="true" />
            </button>
          </div>
        }
        footer={
          <>
            <button type="button" disabled={busy} onClick={() => setMove(null)}>
              Cancelar
            </button>
            <button
              type="button"
              className="primary ob-move-save"
              aria-busy={busy}
              disabled={!choice || busy}
              onClick={confirmMove}
            >
              Guardar estado
            </button>
          </>
        }
      >
        <p>Elegí el estado exacto que querés guardar. Cobro y entrega no cambian.</p>
        {move && (
          <fieldset disabled={busy} className="ob-move-fieldset">
            <legend>Estado de reparación</legend>
            {move.target === 'any'
              ? (
                  [
                    ['Pendientes', moveChoices.pending],
                    ['En proceso', moveChoices.progress],
                    ['Listos', moveChoices.ready],
                  ] as const
                ).map(([groupName, options]) => (
                  <div key={groupName} className="ob-move-group">
                    <strong>{groupName}</strong>
                    {options.map(label => (
                      <label className="ob-choice" key={label}>
                        <input
                          type="radio"
                          name="overview-move"
                          value={label}
                          checked={choice === label}
                          onChange={() => setChoice(label)}
                        />{' '}
                        {label}
                      </label>
                    ))}
                  </div>
                ))
              : moveChoices[move.target].map(label => (
                  <label className="ob-choice" key={label}>
                    <input
                      type="radio"
                      name="overview-move"
                      value={label}
                      checked={choice === label}
                      onChange={() => setChoice(label)}
                    />{' '}
                    {label}
                  </label>
                ))}
          </fieldset>
        )}
        {error && <p role="alert">{error}</p>}
      </SideSheet>

      {/* Contact client SideSheet */}
      <ContactDrawer
        order={contactOrder}
        client={contactClient ?? null}
        onClose={() => setContactOrder(null)}
      />
    </div>
  );
}
