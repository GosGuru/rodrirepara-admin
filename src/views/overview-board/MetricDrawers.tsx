import { useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard,
  FileText,
  FolderOpen,
  Info,
  UserRound,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import type { Data, Order } from '../../repository';
import { repairColumns, type RepairColumn } from '../repair-board';
import { SideSheet } from '../../components/SideSheet';
import { StatusPill } from '../../components/StatusPill';
import { todayIsoLocal } from '../../utils/date';
import './panels.css';

export type PanelMetric = 'active' | 'collected' | 'pending';

type Stats = { collected: number; active: number; pending: number; leads: number };

function compactMoney(n: number): string {
  return '$' + n.toLocaleString('es-AR');
}

function formatDayMonth(date: Date): string {
  return new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'long' }).format(date);
}

function formatShortPaymentDate(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const d = new Date(`${iso}T00:00:00`);
  if (!Number.isFinite(d.valueOf())) return iso;
  return new Intl.DateTimeFormat('es-UY', { day: 'numeric', month: 'short' }).format(d);
}

export function MetricDrawers({
  metric,
  data,
  stats,
  onClose,
  onSelectOrder,
  onOpenFinance,
}: {
  metric: PanelMetric | null;
  data: Data;
  stats: Stats;
  onClose: () => void;
  onSelectOrder: (order: Order, trigger: HTMLElement) => void;
  onOpenFinance?: () => void;
}) {
  const [stageFilter, setStageFilter] = useState<RepairColumn['id'] | 'all'>('all');
  const [showOtherOrders, setShowOtherOrders] = useState(false);

  const columns = useMemo(() => repairColumns(data.orders), [data.orders]);
  const activeOrders = useMemo(() => {
    const selected = stageFilter === 'all' ? columns : columns.filter(c => c.id === stageFilter);
    return selected.flatMap(c => c.orders);
  }, [columns, stageFilter]);

  const stageCounts = useMemo(() => {
    const map: Record<string, number> = { pending: 0, progress: 0, ready: 0 };
    for (const c of columns) {
      if (c.id in map) map[c.id] = c.orders.length;
    }
    return map;
  }, [columns]);

  const todayIso = todayIsoLocal();
  const todayLabel = formatDayMonth(new Date());

  const todayPayments = useMemo(
    () => data.payments.filter(p => p.date === todayIso),
    [data.payments, todayIso],
  );
  const recentPayments = useMemo(
    () =>
      [...data.payments]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 6),
    [data.payments],
  );

  const pendingOrders = useMemo(
    () =>
      data.orders
        .filter(o => o.price !== null && o.price > o.paid)
        .map(o => ({ order: o, balance: o.price! - o.paid })),
    [data.orders],
  );

  const otherOrders = useMemo(
    () => data.orders.filter(o => o.repair !== 'Cerrado' && (o.price === null || o.paid >= o.price)),
    [data.orders],
  );
  const noPriceCount = otherOrders.filter(o => o.price === null).length;
  const zeroBalanceCount = otherOrders.filter(o => o.price !== null && o.paid >= o.price).length;

  function clientName(clientId: string): string {
    return data.clients.find(c => c.id === clientId)?.name ?? 'Cliente desconocido';
  }

  function handleClose() {
    setStageFilter('all');
    setShowOtherOrders(false);
    onClose();
  }

  function openOrder(order: Order, trigger: HTMLElement) {
    handleClose();
    onSelectOrder(order, trigger);
  }

  const headerConfig =
    metric === 'active'
      ? {
          icon: Wrench,
          tone: 'blue',
          title: 'Trabajos activos',
          subtitle: 'Estado actual de todas las reparaciones en curso',
        }
      : metric === 'collected'
        ? {
            icon: CreditCard,
            tone: 'green',
            title: 'Cobrado hoy',
            subtitle: 'Cobros registrados el día de hoy',
          }
        : {
            icon: Clock,
            tone: 'amber',
            title: 'Por cobrar',
            subtitle: 'Órdenes con precio final pendiente de cobro',
          };

  const HeaderIcon = headerConfig.icon;

  return (
    <SideSheet
      open={metric !== null}
      titleId="metric-drawer-title"
      className="side-sheet--panel side-sheet--metric"
      onRequestClose={handleClose}
      header={
        <div className="md-header">
          <div className="md-header__left">
            <span className={`md-header__icon md-header__icon--${headerConfig.tone}`} aria-hidden="true">
              <HeaderIcon size={19} strokeWidth={1.9} />
            </span>
            <div className="md-header__copy">
              <h2 id="metric-drawer-title">{headerConfig.title}</h2>
              <p>{headerConfig.subtitle}</p>
            </div>
          </div>
          <button
            type="button"
            className="md-close-btn"
            onClick={handleClose}
            aria-label={`Cerrar ${headerConfig.title}`}
          >
            <X size={18} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </div>
      }
    >
      {/* PANEL 1: TRABAJOS ACTIVOS */}
      {metric === 'active' && (
        <div className="md-stack">
          <div className="md-stage-grid" role="group" aria-label="Filtrar por etapa">
            {(
              [
                ['pending', 'Pendientes', stageCounts.pending],
                ['progress', 'En proceso', stageCounts.progress],
                ['ready', 'Listos', stageCounts.ready],
              ] as const
            ).map(([stageId, label, count]) => {
              const active = stageFilter === stageId;
              return (
                <button
                  key={stageId}
                  type="button"
                  className={`md-stage-card md-stage-card--${stageId}${active ? ' is-selected' : ''}`}
                  aria-pressed={active}
                  onClick={() => setStageFilter(prev => (prev === stageId ? 'all' : stageId))}
                >
                  <span className="md-stage-card__label">
                    <span className={`md-dot md-dot--${stageId}`} aria-hidden="true" />
                    <span>{label}</span>
                  </span>
                  <strong>{count}</strong>
                </button>
              );
            })}
          </div>

          {activeOrders.length === 0 ? (
            <div className="md-empty-card">
              <span className="md-empty-card__icon" aria-hidden="true">
                <Wrench size={20} strokeWidth={1.7} />
              </span>
              <strong>No hay reparaciones en esta etapa</strong>
              <p>Las órdenes activas aparecerán listadas aquí.</p>
            </div>
          ) : (
            <ul className="md-order-list" aria-label="Reparaciones activas">
              {activeOrders.map(order => (
                <li key={order.id}>
                  <button
                    type="button"
                    className="md-order-row"
                    onClick={e => openOrder(order, e.currentTarget)}
                  >
                    <span className="md-row-avatar" aria-hidden="true">
                      <UserRound size={15} strokeWidth={1.85} />
                    </span>
                    <span className="md-row-info">
                      <strong>{clientName(order.clientId)}</strong>
                      <span>Lavarropas {order.equipment}</span>
                    </span>
                    <span className="md-row-right">
                      <StatusPill kind="repair" value={order.repair} />
                      <ChevronRight size={15} strokeWidth={2} className="md-row-chevron" aria-hidden="true" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* PANEL 2: COBRADO HOY */}
      {metric === 'collected' && (
        <div className="md-stack">
          <div className="md-hero-grid">
            <div className="md-hero-main">
              <span className="md-hero-label">Total cobrado hoy</span>
              <strong className="md-hero-value">{compactMoney(stats.collected)}</strong>
              <span className="md-hero-sub">
                {todayPayments.length === 1
                  ? '1 cobro registrado'
                  : `${todayPayments.length} cobros registrados`}
              </span>
            </div>
            <div className="md-hero-aside">
              <Calendar size={18} strokeWidth={1.85} aria-hidden="true" />
              <div>
                <span>Hoy</span>
                <strong>{todayLabel}</strong>
              </div>
            </div>
          </div>

          <div className="md-section-head">
            <h3>Últimos cobros</h3>
            {onOpenFinance && (
              <button
                type="button"
                className="md-link-btn"
                onClick={() => {
                  handleClose();
                  onOpenFinance();
                }}
              >
                Ver historial →
              </button>
            )}
          </div>

          {todayPayments.length === 0 ? (
            <>
              <div className="md-empty-card">
                <span className="md-empty-card__icon" aria-hidden="true">
                  <FolderOpen size={20} strokeWidth={1.7} />
                </span>
                <strong>Aún no hay cobros hoy</strong>
                <p>Los cobros que registres hoy se mostrarán aquí.</p>
              </div>

              {recentPayments.length > 0 && (
                <div className="md-recent-wrap">
                  <h4 className="md-subhead">Cobros anteriores</h4>
                  <ul className="md-order-list" aria-label="Cobros anteriores">
                    {recentPayments.map(payment => {
                      const ord = data.orders.find(o => o.id === payment.orderId);
                      return (
                        <li key={payment.id}>
                          <button
                            type="button"
                            className="md-order-row"
                            disabled={!ord}
                            onClick={e => {
                              if (ord) openOrder(ord, e.currentTarget);
                            }}
                          >
                            <span className="md-row-avatar md-row-avatar--green" aria-hidden="true">
                              <CheckCircle2 size={15} strokeWidth={2} />
                            </span>
                            <span className="md-row-info">
                              <strong>
                                {payment.orderId} · {ord ? clientName(ord.clientId) : 'Orden'}
                              </strong>
                              <span>{formatShortPaymentDate(payment.date)}</span>
                            </span>
                            <span className="md-row-right">
                              <strong className="md-row-amount">{compactMoney(payment.amount)}</strong>
                              {ord && <ChevronRight size={15} strokeWidth={2} className="md-row-chevron" aria-hidden="true" />}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <ul className="md-order-list" aria-label="Cobros de hoy">
              {todayPayments.map(payment => {
                const ord = data.orders.find(o => o.id === payment.orderId);
                return (
                  <li key={payment.id}>
                    <button
                      type="button"
                      className="md-order-row"
                      disabled={!ord}
                      onClick={e => {
                        if (ord) openOrder(ord, e.currentTarget);
                      }}
                    >
                      <span className="md-row-avatar md-row-avatar--green" aria-hidden="true">
                        <CheckCircle2 size={15} strokeWidth={2} />
                      </span>
                      <span className="md-row-info">
                        <strong>
                          {payment.orderId} · {ord ? clientName(ord.clientId) : 'Orden'}
                        </strong>
                        <span>{formatShortPaymentDate(payment.date)}</span>
                      </span>
                      <span className="md-row-right">
                        <strong className="md-row-amount">{compactMoney(payment.amount)}</strong>
                        {ord && <ChevronRight size={15} strokeWidth={2} className="md-row-chevron" aria-hidden="true" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* PANEL 3: POR COBRAR */}
      {metric === 'pending' && (
        <div className="md-stack">
          <div className="md-hero-grid">
            <div className="md-hero-main">
              <span className="md-hero-label">Saldo pendiente</span>
              <strong className="md-hero-value">{compactMoney(stats.pending)}</strong>
            </div>
            <div className="md-hero-aside">
              <FileText size={18} strokeWidth={1.85} aria-hidden="true" />
              <div>
                <strong>
                  {pendingOrders.length === 1 ? '1 orden' : `${pendingOrders.length} órdenes`}
                </strong>
                <span>con saldo por cobrar</span>
              </div>
            </div>
          </div>

          <div className="md-section-head">
            <h3>Órdenes pendientes de cobro</h3>
          </div>

          {pendingOrders.length === 0 ? (
            <div className="md-empty-card">
              <span className="md-empty-card__icon" aria-hidden="true">
                <CheckCircle2 size={20} strokeWidth={1.7} />
              </span>
              <strong>Sin saldos pendientes</strong>
              <p>Todas las órdenes con precio final definido están cubiertas.</p>
            </div>
          ) : (
            <ul className="md-order-list" aria-label="Órdenes pendientes de cobro">
              {pendingOrders.map(({ order, balance }) => (
                <li key={order.id}>
                  <button
                    type="button"
                    className="md-order-row"
                    onClick={e => openOrder(order, e.currentTarget)}
                  >
                    <span className="md-row-avatar" aria-hidden="true">
                      <UserRound size={15} strokeWidth={1.85} />
                    </span>
                    <span className="md-row-info">
                      <strong>
                        {order.id} · {clientName(order.clientId)}
                      </strong>
                      <span>Lavarropas {order.equipment}</span>
                    </span>
                    <span className="md-row-right">
                      <strong className="md-row-amount">{compactMoney(balance)}</strong>
                      <ChevronRight size={15} strokeWidth={2} className="md-row-chevron" aria-hidden="true" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="md-section-head md-section-head--spaced">
            <h3 className="md-heading-info">
              <span>Otras órdenes</span>
              <Info size={14} strokeWidth={1.9} aria-hidden="true" />
            </h3>
          </div>

          <button
            type="button"
            className="md-order-row md-order-row--summary"
            aria-expanded={showOtherOrders}
            onClick={() => setShowOtherOrders(prev => !prev)}
          >
            <span className="md-row-avatar" aria-hidden="true">
              <Wallet size={15} strokeWidth={1.85} />
            </span>
            <span className="md-row-info">
              <strong>Órdenes sin saldo pendiente</strong>
              <span>
                {noPriceCount > 0 && zeroBalanceCount > 0
                  ? `${noPriceCount} sin precio final · ${zeroBalanceCount} sin saldo ($0)`
                  : noPriceCount > 0
                    ? `${noPriceCount} ${noPriceCount === 1 ? 'orden' : 'órdenes'} sin precio final definido`
                    : `${zeroBalanceCount} ${zeroBalanceCount === 1 ? 'orden' : 'órdenes'} con saldo $0`}
              </span>
            </span>
            <ChevronRight
              size={15}
              strokeWidth={2}
              className={`md-row-chevron${showOtherOrders ? ' is-open' : ''}`}
              aria-hidden="true"
            />
          </button>

          {showOtherOrders && otherOrders.length > 0 && (
            <ul className="md-order-list md-order-list--nested" aria-label="Órdenes sin saldo pendiente">
              {otherOrders.map(order => (
                <li key={order.id}>
                  <button
                    type="button"
                    className="md-order-row"
                    onClick={e => openOrder(order, e.currentTarget)}
                  >
                    <span className="md-row-avatar" aria-hidden="true">
                      <UserRound size={15} strokeWidth={1.85} />
                    </span>
                    <span className="md-row-info">
                      <strong>
                        {order.id} · {clientName(order.clientId)}
                      </strong>
                      <span>Lavarropas {order.equipment}</span>
                    </span>
                    <span className="md-row-right">
                      <span className="md-row-muted-tag">
                        {order.price === null ? 'Sin precio' : 'Cobrado'}
                      </span>
                      <ChevronRight size={15} strokeWidth={2} className="md-row-chevron" aria-hidden="true" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </SideSheet>
  );
}
