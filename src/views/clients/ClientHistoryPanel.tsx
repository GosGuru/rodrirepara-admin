import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  ClipboardList,
  Home,
  Info,
  MapPin,
  Phone,
  RotateCcw,
  Truck,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import type { Client, Order } from '../../repository';
import type { WorkshopActions } from '../../components/workshop/actions';
import { money, paymentStatus } from '../../selectors';
import { OrderIdCell } from '../orders/OrderIdCell';
import { OrderRowActions } from '../orders/OrderRowActions';
import { OrderStatusBadge } from '../orders/OrderStatusBadge';
import { formatDisplayOrderId } from '../orders/order-helpers';
import {
  formatClientHistoryDate,
  formatOrderCountLabel,
  getAvatarTone,
  getClientInitial,
  summarizeClientOrders,
} from './client-helpers';

const INITIAL_VISIBLE_ORDERS = 20;
const ORDERS_PAGE_STEP = 20;

export type ClientHistoryPanelProps = {
  client: Client | null;
  orders: readonly Order[];
  totalClients: number;
  actions?: WorkshopActions;
  onBackToDirectory?: () => void;
};

export function ClientHistoryPanel({
  client,
  orders,
  totalClients,
  actions,
  onBackToDirectory,
}: ClientHistoryPanelProps) {
  const [visibleLimit, setVisibleLimit] = useState(INITIAL_VISIBLE_ORDERS);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [savedRowId, setSavedRowId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<{
    message: string;
    retry?: () => void;
  } | null>(null);

  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setVisibleLimit(INITIAL_VISIBLE_ORDERS);
    setActiveRowId(null);
    setMutationError(null);
  }, [client?.id]);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const flashSavedRow = useCallback((orderId: string) => {
    setSavedRowId(orderId);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    savedTimerRef.current = setTimeout(() => {
      setSavedRowId((current) => (current === orderId ? null : current));
      savedTimerRef.current = null;
    }, 1500);
  }, []);

  const handleQuickRepairChange = useCallback(
    async (order: Order, nextRepair: string) => {
      if (!actions) return;
      setMutationError(null);
      setSavingRowId(order.id);
      try {
        await actions.updateOrder(order.id, { repair: nextRepair });
        flashSavedRow(order.id);
      } catch (err) {
        setMutationError({
          message:
            err instanceof Error && err.message
              ? err.message
              : `No se pudo actualizar ${formatDisplayOrderId(order.id)}.`,
          retry: () => {
            void handleQuickRepairChange(order, nextRepair);
          },
        });
      } finally {
        setSavingRowId((current) => (current === order.id ? null : current));
      }
    },
    [actions, flashSavedRow],
  );

  const handleConfirmCloseOrder = useCallback(
    async (order: Order) => {
      if (!actions) return;
      setMutationError(null);
      setSavingRowId(order.id);
      try {
        await actions.updateOrder(order.id, { repair: 'Cerrado' });
        flashSavedRow(order.id);
      } finally {
        setSavingRowId((current) => (current === order.id ? null : current));
      }
    },
    [actions, flashSavedRow],
  );

  const summary = useMemo(() => summarizeClientOrders(orders), [orders]);

  if (!client) {
    return (
      <div className="cv-detail-card cv-detail-card--empty" aria-live="polite">
        <div className="cv-empty-selection">
          <span className="cv-empty-selection__icon" aria-hidden="true">
            <Users size={22} strokeWidth={1.8} />
          </span>
          <h2>Seleccioná un cliente</h2>
          <p>
            Elegí una persona del directorio para consultar sus datos y el historial completo de sus reparaciones.
          </p>
          {totalClients > 0 && (
            <span className="cv-empty-selection__hint">
              {totalClients === 1
                ? '1 cliente registrado en el directorio'
                : `${totalClients} clientes registrados en el directorio`}
            </span>
          )}
        </div>
      </div>
    );
  }

  const tone = getAvatarTone(client.id || client.name);
  const initial = getClientInitial(client.name);
  const visibleOrders = orders.slice(0, visibleLimit);
  const remainingOrders = Math.max(0, orders.length - visibleOrders.length);
  const canEdit = Boolean(actions);

  return (
    <div key={client.id} className="cv-detail-card cv-panel-enter">
      {onBackToDirectory && (
        <div className="cv-mobile-back-bar">
          <button
            type="button"
            className="cv-mobile-back-btn"
            onClick={onBackToDirectory}
          >
            <ArrowLeft size={15} strokeWidth={2.1} aria-hidden="true" />
            <span>Volver a clientes</span>
          </button>
        </div>
      )}

      <header className="cv-profile-header">
        <div className="cv-profile-identity">
          <span
            className={`cv-avatar cv-avatar--lg cv-avatar--${tone}`}
            aria-hidden="true"
          >
            {initial}
          </span>
          <div className="cv-profile-text">
            <h2>{client.name}</h2>
            <div className="cv-profile-meta">
              <span className="cv-profile-phone">
                <Phone size={13} strokeWidth={2} aria-hidden="true" />
                <span>{client.phone}</span>
              </span>
              {summary.latestDate && (
                <>
                  <span className="cv-dot-sep" aria-hidden="true">·</span>
                  <span className="cv-profile-activity">
                    Última actividad: {formatClientHistoryDate(summary.latestDate)}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
        <span className="cv-profile-count">{formatOrderCountLabel(summary.total)}</span>
      </header>

      <div className="cv-summary-grid" aria-label={`Resumen de órdenes de ${client.name}`}>
        <div className="cv-summary-tile">
          <span className="cv-summary-tile__icon cv-summary-tile__icon--orders" aria-hidden="true">
            <ClipboardList size={15} strokeWidth={2} />
          </span>
          <div className="cv-summary-tile__body">
            <strong className="cv-summary-tile__value">{summary.total}</strong>
            <span className="cv-summary-tile__label">
              {summary.total === 1 ? 'Orden' : 'Órdenes'}
            </span>
          </div>
        </div>

        <div className="cv-summary-tile">
          <span className="cv-summary-tile__icon cv-summary-tile__icon--finished" aria-hidden="true">
            <CheckCircle2 size={15} strokeWidth={2} />
          </span>
          <div className="cv-summary-tile__body">
            <strong className="cv-summary-tile__value">{summary.finished}</strong>
            <span className="cv-summary-tile__label">
              {summary.finished === 1 ? 'Terminada' : 'Terminadas'}
            </span>
          </div>
        </div>

        <div className="cv-summary-tile">
          <span className="cv-summary-tile__icon cv-summary-tile__icon--delivered" aria-hidden="true">
            <Truck size={15} strokeWidth={2} />
          </span>
          <div className="cv-summary-tile__body">
            <strong className="cv-summary-tile__value">{summary.delivered}</strong>
            <span className="cv-summary-tile__label">
              {summary.delivered === 1 ? 'Entregada' : 'Entregadas'}
            </span>
          </div>
        </div>
      </div>

      <section className="cv-history-section" aria-label={`Historial de reparaciones de ${client.name}`}>
        <div className="cv-history-header">
          <h3>Historial de reparaciones</h3>
          <span className="cv-history-count">{formatOrderCountLabel(orders.length)}</span>
        </div>

        {mutationError && (
          <div className="ov-inline-error cv-inline-error" role="alert">
            <AlertCircle size={15} strokeWidth={2} aria-hidden="true" />
            <span>{mutationError.message}</span>
            <div className="ov-inline-error__actions">
              {mutationError.retry && (
                <button
                  type="button"
                  className="ov-inline-error__retry"
                  onClick={mutationError.retry}
                >
                  <RotateCcw size={13} strokeWidth={2} aria-hidden="true" />
                  <span>Reintentar</span>
                </button>
              )}
              <button
                type="button"
                className="ov-inline-error__dismiss"
                aria-label="Cerrar aviso de error"
                onClick={() => setMutationError(null)}
              >
                <X size={14} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {orders.length === 0 ? (
          <div className="cv-no-orders" role="status">
            <span className="cv-no-orders__icon" aria-hidden="true">
              <Wrench size={18} strokeWidth={1.8} />
            </span>
            <div>
              <strong>Sin reparaciones registradas</strong>
              <p>Este cliente todavía no tiene órdenes registradas.</p>
            </div>
          </div>
        ) : (
          <>
            <ol
              className="cv-orders-list"
              aria-label={`Historial de ${client.name}, más reciente primero`}
            >
              {visibleOrders.map((order) => {
                const payState = paymentStatus(order);
                const isRowActive = activeRowId === order.id;
                const isRowSaving = savingRowId === order.id;
                const isRowSaved = savedRowId === order.id;
                const isDomicilio = order.mode === 'Domicilio';

                return (
                  <li
                    key={order.id}
                    className={`cv-order-card${isRowActive ? ' is-active' : ''}${
                      isRowSaving ? ' is-saving' : ''
                    }`}
                  >
                    <div className="cv-order-card__top">
                      <div className="cv-order-identity">
                        <span className="cv-order-tile" aria-hidden="true">
                          <Wrench size={15} strokeWidth={1.9} />
                        </span>
                        <div className="cv-order-heading">
                          <div className="cv-order-title-line">
                            <OrderIdCell id={order.id} />
                            <span className="cv-dot-sep" aria-hidden="true">·</span>
                            <strong className="cv-order-equipment">{order.equipment}</strong>
                            {order.originalId && (
                              <span
                                className="cv-warranty-tag"
                                title={`Garantía vinculada a ${order.originalId}`}
                              >
                                Garantía de {formatDisplayOrderId(order.originalId)}
                              </span>
                            )}
                          </div>
                          <div className="cv-order-meta">
                            <span className="cv-order-meta__item">
                              <Calendar size={12} strokeWidth={2} aria-hidden="true" />
                              <span>
                                Ingreso:{' '}
                                {order.entry ? (
                                  <time dateTime={order.entry}>
                                    {formatClientHistoryDate(order.entry)}
                                  </time>
                                ) : (
                                  'Sin fecha'
                                )}
                              </span>
                            </span>
                            {order.finish && (
                              <>
                                <span className="cv-dot-sep" aria-hidden="true">·</span>
                                <span className="cv-order-meta__item">
                                  <span>
                                    Finalización:{' '}
                                    <time dateTime={order.finish}>
                                      {formatClientHistoryDate(order.finish)}
                                    </time>
                                  </span>
                                </span>
                              </>
                            )}
                            <span className="cv-dot-sep" aria-hidden="true">·</span>
                            <span className="cv-order-meta__item">
                              {isDomicilio ? (
                                <MapPin size={12} strokeWidth={2} aria-hidden="true" />
                              ) : (
                                <Home size={12} strokeWidth={2} aria-hidden="true" />
                              )}
                              <span>{order.mode}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="cv-order-actions">
                        <OrderRowActions
                          order={order}
                          canEdit={canEdit}
                          busy={isRowSaving}
                          onQuickRepairChange={(target, nextRepair) => {
                            void handleQuickRepairChange(target, nextRepair);
                          }}
                          onConfirmCloseOrder={handleConfirmCloseOrder}
                          onActiveChange={(active) => {
                            setActiveRowId((prev) => {
                              if (active) return order.id;
                              return prev === order.id ? null : prev;
                            });
                          }}
                        />
                        {isRowSaving && (
                          <span className="ov-row-feedback" aria-live="polite">
                            <span className="ui-save-btn__spinner" aria-hidden="true" />
                            <span>Guardando…</span>
                          </span>
                        )}
                        {!isRowSaving && isRowSaved && (
                          <span className="ov-row-feedback ov-row-feedback--ok" aria-live="polite">
                            <Check size={12} strokeWidth={2.5} aria-hidden="true" />
                            <span>Actualizada</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="cv-order-statuses" aria-label={`Estados de ${order.id}`}>
                      <div className="cv-status-group">
                        <span className="cv-status-group__label">Reparación</span>
                        <OrderStatusBadge kind="repair" value={order.repair} />
                      </div>

                      <div className="cv-status-group">
                        <span className="cv-status-group__label">Cobro</span>
                        <div className="cv-status-payment">
                          <OrderStatusBadge kind="payment" value={payState} />
                          <span className="cv-status-payment__amount">
                            {order.price === null
                              ? 'Sin precio final'
                              : `${money(order.paid)} / ${money(order.price)}`}
                          </span>
                        </div>
                      </div>

                      <div className="cv-status-group">
                        <span className="cv-status-group__label">Entrega</span>
                        <OrderStatusBadge kind="delivery" value={order.delivery} />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>

            {remainingOrders > 0 && (
              <div className="cv-load-more">
                <button
                  type="button"
                  className="cv-load-more__btn"
                  onClick={() => setVisibleLimit((prev) => prev + ORDERS_PAGE_STEP)}
                >
                  Mostrar más órdenes ({remainingOrders}{' '}
                  {remainingOrders === 1 ? 'restante' : 'restantes'})
                </button>
              </div>
            )}

            <p className="cv-history-footnote">
              <Info size={13} strokeWidth={2} aria-hidden="true" />
              <span>Terminado no significa cobrado; cobrado no significa entregado.</span>
            </p>
          </>
        )}
      </section>
    </div>
  );
}
