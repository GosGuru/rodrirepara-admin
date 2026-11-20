import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import {
  AlertCircle,
  Check,
  CircleX,
  ClipboardList,
  Info,
  Layers,
  RotateCcw,
  Search,
  User,
  X,
} from 'lucide-react';
import type { Data, Order } from '../repository';
import type { WorkshopActions } from '../components/workshop/actions';
import { useFloatingPopover } from '../hooks/useFloatingPopover';
import { money, paymentStatus } from '../selectors';
import { ModeFilter } from './ModeFilter';
import { OrderIdCell } from './orders/OrderIdCell';
import { OrderRowActions } from './orders/OrderRowActions';
import { OrdersFiltersPopover } from './orders/OrdersFiltersPopover';
import { OrderStatusBadge } from './orders/OrderStatusBadge';
import {
  applyExtraOrderFilters,
  countActiveExtraFilters,
  EMPTY_EXTRA_FILTERS,
  formatCompactOrderDate,
  formatDisplayOrderId,
  getSearchSuggestions,
  type OrderExtraFilters,
} from './orders/order-helpers';
import './orders-view.css';

export type OrdersViewProps = {
  data: Data;
  actions?: WorkshopActions;
  filtered: Order[];
  query: string;
  mode: string;
  onQueryChange: (value: string) => void;
  onModeChange: (value: string) => void;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
};

type ActiveChip = {
  key: string;
  label: string;
  removeLabel: string;
  onRemove: () => void;
};

const TABLE_HEADERS = [
  'Orden y cliente',
  'Equipo / modalidad',
  'Reparación',
  'Cobro',
  'Entrega',
  'Detalle',
] as const;

export function OrdersView({
  data: d,
  filtered,
  query,
  mode,
  onQueryChange,
  onModeChange,
  actions,
  loading = false,
  error = '',
  onRetry,
}: OrdersViewProps) {
  const searchId = useId();
  const suggestionsId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const [extraFilters, setExtraFilters] = useState<OrderExtraFilters>(EMPTY_EXTRA_FILTERS);
  const [searchFocused, setSearchFocused] = useState(false);
  const [activeSuggestionIdx, setActiveSuggestionIdx] = useState(-1);
  const [activeRowId, setActiveRowId] = useState<string | null>(null);
  const [savingRowId, setSavingRowId] = useState<string | null>(null);
  const [savedRowId, setSavedRowId] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<{
    message: string;
    retry?: () => void;
  } | null>(null);

  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const clientById = useMemo(
    () => new Map(d.clients.map((client) => [client.id, client.name])),
    [d.clients],
  );

  const visibleOrders = useMemo(
    () => applyExtraOrderFilters(filtered, extraFilters),
    [filtered, extraFilters],
  );

  const suggestions = useMemo(
    () => getSearchSuggestions(d, query, 5),
    [d, query],
  );

  const suggestionsOpen = searchFocused && query.trim().length > 0 && suggestions.length > 0;

  useEffect(() => {
    setActiveSuggestionIdx(-1);
  }, [query]);

  const {
    style: suggestionsStyle,
    placement: suggestionsPlacement,
    portalTarget: suggestionsPortal,
  } = useFloatingPopover({
    open: suggestionsOpen,
    anchorRef: searchBoxRef,
    floatingRef: suggestionsRef,
    onClose: () => setSearchFocused(false),
    matchWidth: true,
    minWidth: 260,
    estimatedHeight: 240,
  });

  const extraCount = countActiveExtraFilters(extraFilters);
  const hasAnyFilter = Boolean(query.trim()) || mode !== 'Todas' || extraCount > 0;

  const clearAllFilters = useCallback(() => {
    onQueryChange('');
    onModeChange('Todas');
    setExtraFilters({ ...EMPTY_EXTRA_FILTERS });
    setSearchFocused(false);
  }, [onQueryChange, onModeChange]);

  const activeChips: ActiveChip[] = useMemo(() => {
    const chips: ActiveChip[] = [];
    if (query.trim()) {
      chips.push({
        key: 'query',
        label: `Búsqueda: ${query.trim()}`,
        removeLabel: 'Quitar filtro de búsqueda',
        onRemove: () => onQueryChange(''),
      });
    }
    if (mode !== 'Todas') {
      chips.push({
        key: 'mode',
        label: `Modalidad: ${mode}`,
        removeLabel: 'Quitar filtro de modalidad',
        onRemove: () => onModeChange('Todas'),
      });
    }
    if (extraFilters.repair !== 'Todos') {
      chips.push({
        key: 'repair',
        label: `Reparación: ${extraFilters.repair}`,
        removeLabel: 'Quitar filtro de reparación',
        onRemove: () => setExtraFilters((prev) => ({ ...prev, repair: 'Todos' })),
      });
    }
    if (extraFilters.payment !== 'Todos') {
      chips.push({
        key: 'payment',
        label: `Cobro: ${extraFilters.payment}`,
        removeLabel: 'Quitar filtro de cobro',
        onRemove: () => setExtraFilters((prev) => ({ ...prev, payment: 'Todos' })),
      });
    }
    if (extraFilters.delivery !== 'Todos') {
      chips.push({
        key: 'delivery',
        label: `Entrega: ${extraFilters.delivery}`,
        removeLabel: 'Quitar filtro de entrega',
        onRemove: () => setExtraFilters((prev) => ({ ...prev, delivery: 'Todos' })),
      });
    }
    return chips;
  }, [query, mode, extraFilters, onQueryChange, onModeChange]);

  const markRowSaved = useCallback((orderId: string) => {
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    setSavedRowId(orderId);
    savedTimerRef.current = setTimeout(() => {
      setSavedRowId((current) => (current === orderId ? null : current));
    }, 1500);
  }, []);

  const handleQuickRepairChange = useCallback(
    async (order: Order, nextRepair: string) => {
      if (!actions || savingRowId) return;
      setMutationError(null);
      setSavingRowId(order.id);
      try {
        await actions.updateOrder(order.id, { repair: nextRepair });
        markRowSaved(order.id);
      } catch (err) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : 'No se pudo actualizar la orden. Revisá los datos y volvé a intentar.';
        setMutationError({
          message,
          retry: () => void handleQuickRepairChange(order, nextRepair),
        });
      } finally {
        setSavingRowId((current) => (current === order.id ? null : current));
      }
    },
    [actions, savingRowId, markRowSaved],
  );

  const handleConfirmCloseOrder = useCallback(
    async (order: Order) => {
      if (!actions) return;
      setMutationError(null);
      await actions.updateOrder(order.id, { repair: 'Cerrado' });
      markRowSaved(order.id);
    },
    [actions, markRowSaved],
  );

  const selectSuggestion = (orderId: string) => {
    onQueryChange(orderId);
    setSearchFocused(false);
    setActiveSuggestionIdx(-1);
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (!suggestionsOpen) {
      if (event.key === 'Escape' && query) {
        event.preventDefault();
        onQueryChange('');
      }
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveSuggestionIdx((prev) => (prev + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveSuggestionIdx((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
    } else if (event.key === 'Enter' && activeSuggestionIdx >= 0) {
      event.preventDefault();
      const target = suggestions[activeSuggestionIdx];
      if (target) selectSuggestion(target.order.id);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setSearchFocused(false);
    }
  };

  const isEmptyDatabase = !loading && !error && d.orders.length === 0;
  const isNoResults = !loading && !error && d.orders.length > 0 && visibleOrders.length === 0;

  return (
    <section className="panel orders-view mv-orders ov-card" aria-label="Seguimiento de reparaciones">
      <div className="ov-card__header">
        <div className="ov-card__title-group">
          <span className="ov-card__icon" aria-hidden="true">
            <Layers size={18} strokeWidth={2} />
          </span>
          <div className="ov-card__titles">
            <h2>Seguimiento de reparaciones</h2>
            <p>Reparación, cobro y entrega se siguen por separado.</p>
          </div>
        </div>
        <span className="ov-card__count" aria-live="polite">
          {visibleOrders.length} órdenes
        </span>
      </div>

      <div className="ov-toolbar">
        <div className="ov-search-col">
          <label htmlFor={searchId} className="ov-filter-field__label sr-only">
            Buscar cliente, equipo, falla u orden
          </label>
          <div
            ref={searchBoxRef}
            className={`ov-search-box${searchFocused ? ' is-focused' : ''}`}
          >
            <span className="ov-search-box__icon" aria-hidden="true">
              <Search size={16} strokeWidth={2} aria-hidden="true" />
            </span>
            <input
              ref={searchInputRef}
              id={searchId}
              type="search"
              value={query}
              placeholder="Buscar cliente, equipo, falla u orden"
              autoComplete="off"
              aria-autocomplete="list"
              aria-expanded={suggestionsOpen}
              aria-controls={suggestionsOpen ? suggestionsId : undefined}
              aria-activedescendant={
                suggestionsOpen && activeSuggestionIdx >= 0
                  ? `${suggestionsId}-item-${activeSuggestionIdx}`
                  : undefined
              }
              onFocus={() => setSearchFocused(true)}
              onChange={(event) => {
                onQueryChange(event.target.value);
                setSearchFocused(true);
              }}
              onKeyDown={handleSearchKeyDown}
            />
            {query.length > 0 && (
              <button
                type="button"
                className="ov-search-box__clear"
                aria-label="Limpiar búsqueda"
                onClick={() => {
                  onQueryChange('');
                  searchInputRef.current?.focus();
                }}
              >
                <X size={14} strokeWidth={2.2} aria-hidden="true" />
              </button>
            )}
          </div>

          {suggestionsOpen &&
            suggestionsPortal &&
            createPortal(
              <div
                ref={suggestionsRef}
                id={suggestionsId}
                role="listbox"
                aria-label="Coincidencias rápidas"
                className="ui-popover ov-suggestions"
                data-placement={suggestionsPlacement}
                style={suggestionsStyle}
              >
                {suggestions.map((item, idx) => (
                  <button
                    key={item.order.id}
                    id={`${suggestionsId}-item-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={idx === activeSuggestionIdx}
                    className={`ov-suggestion-item${idx === activeSuggestionIdx ? ' is-active' : ''}`}
                    onMouseEnter={() => setActiveSuggestionIdx(idx)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      selectSuggestion(item.order.id);
                    }}
                  >
                    <span className="ov-suggestion-item__avatar" aria-hidden="true">
                      <User size={15} strokeWidth={1.85} />
                    </span>
                    <span className="ov-suggestion-item__copy">
                      <strong>{item.clientName || 'Cliente sin nombre'}</strong>
                      <small>
                        {formatDisplayOrderId(item.order.id)} · {item.order.equipment}
                      </small>
                    </span>
                  </button>
                ))}
              </div>,
              suggestionsPortal,
            )}
        </div>

        <ModeFilter value={mode} onChange={onModeChange} />

        <OrdersFiltersPopover filters={extraFilters} onChange={setExtraFilters} />

        <div className="ov-filter-field ov-filter-field--reset">
          <button
            type="button"
            className="orders-view__reset ov-reset-btn"
            onClick={clearAllFilters}
            disabled={!hasAnyFilter}
          >
            <CircleX size={15} strokeWidth={2} aria-hidden="true" />
            <span>Limpiar filtros</span>
          </button>
        </div>
      </div>

      {hasAnyFilter && (
        <div className="ov-active-filters" aria-label="Filtros activos">
          <span className="ov-active-filters__label">Filtros activos:</span>
          <div className="ov-active-filters__chips">
            {activeChips.map((chip) => (
              <span key={chip.key} className="ov-chip">
                <span>{chip.label}</span>
                <button
                  type="button"
                  className="ov-chip__remove"
                  aria-label={chip.removeLabel}
                  onClick={chip.onRemove}
                >
                  <X size={12} strokeWidth={2.3} aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {(error || mutationError) && (
        <div role="alert" className="ov-alert">
          <AlertCircle size={16} strokeWidth={2.1} aria-hidden="true" />
          <p>{error || mutationError?.message}</p>
          <div className="ov-alert__actions">
            {(onRetry || mutationError?.retry) && (
              <button
                type="button"
                className="ov-alert__retry"
                onClick={() => {
                  if (error && onRetry) onRetry();
                  else if (mutationError?.retry) mutationError.retry();
                }}
              >
                <RotateCcw size={13} strokeWidth={2.2} aria-hidden="true" />
                <span>Reintentar</span>
              </button>
            )}
            {mutationError && !error && (
              <button
                type="button"
                className="ov-icon-close"
                aria-label="Cerrar error"
                onClick={() => setMutationError(null)}
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}

      {loading ? (
        <div className="ov-skeleton-wrap" aria-busy="true" aria-live="polite" aria-label="Cargando órdenes">
          {Array.from({ length: 5 }).map((_, idx) => (
            <div key={idx} className="ov-skeleton-row">
              <div className="ov-skeleton-stack">
                <span className="ov-skeleton-bar ov-skeleton-bar--md" />
                <span className="ov-skeleton-bar ov-skeleton-bar--sm" />
              </div>
              <div className="ov-skeleton-stack">
                <span className="ov-skeleton-bar ov-skeleton-bar--lg" />
                <span className="ov-skeleton-bar ov-skeleton-bar--xs" />
              </div>
              <span className="ov-skeleton-pill" />
              <div className="ov-skeleton-stack">
                <span className="ov-skeleton-pill ov-skeleton-pill--sm" />
                <span className="ov-skeleton-bar ov-skeleton-bar--md" />
              </div>
              <span className="ov-skeleton-pill ov-skeleton-pill--sm" />
              <div className="ov-skeleton-actions">
                <span className="ov-skeleton-btn" />
                <span className="ov-skeleton-dot" />
              </div>
            </div>
          ))}
        </div>
      ) : isEmptyDatabase ? (
        <div className="ov-empty">
          <span className="ov-empty__icon" aria-hidden="true">
            <ClipboardList size={22} strokeWidth={1.8} />
          </span>
          <h3>Todavía no hay órdenes cargadas</h3>
          <p>Cuando registres una reparación, vas a poder seguir su estado, cobro y entrega desde acá.</p>
        </div>
      ) : isNoResults ? (
        <div className="ov-empty">
          <span className="ov-empty__icon" aria-hidden="true">
            <Search size={20} strokeWidth={1.85} />
          </span>
          <h3>No hay trabajos con estos filtros</h3>
          <p>Probá ampliar la búsqueda o restablecer los filtros activos.</p>
          <button type="button" className="ov-empty__reset" onClick={clearAllFilters}>
            <CircleX size={15} strokeWidth={2} aria-hidden="true" />
            <span>Limpiar filtros</span>
          </button>
        </div>
      ) : (
        <div className="table-wrap ov-table-wrap" tabIndex={0} role="region" aria-label="Listado de órdenes de trabajo">
          <table className="ov-table">
            <thead>
              <tr>
                {TABLE_HEADERS.map((heading) => (
                  <th key={heading} scope="col">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleOrders.map((order) => {
                const clientName = clientById.get(order.clientId) ?? 'Sin cliente';
                const compactDate = formatCompactOrderDate(order.entry);
                const payStatus = paymentStatus(order);
                const isRowActive = activeRowId === order.id;
                const isRowSaving = savingRowId === order.id;
                const isRowSaved = savedRowId === order.id;

                return (
                  <tr
                    key={order.id}
                    className={`ov-row${isRowActive ? ' is-active' : ''}${isRowSaved ? ' is-saved' : ''}`}
                  >
                    <td className="ov-cell-order" data-label="Orden y cliente">
                      <div className="ov-cell-stack">
                        <OrderIdCell id={order.id} />
                        <span className="ov-client-line">
                          <User size={13} strokeWidth={1.9} className="ov-client-line__icon" aria-hidden="true" />
                          <span className="ov-client-line__name" title={clientName}>
                            {clientName}
                          </span>
                          {compactDate && (
                            <>
                              <span className="ov-client-line__sep" aria-hidden="true">·</span>
                              <time dateTime={order.entry} className="ov-client-line__date">
                                {compactDate}
                              </time>
                            </>
                          )}
                        </span>
                      </div>
                    </td>

                    <td className="ov-cell-equipment" data-label="Equipo / modalidad">
                      <div className="ov-cell-stack">
                        <strong className="ov-equipment" title={order.equipment}>
                          {order.equipment}
                        </strong>
                        <span className="ov-mode-sub">{order.mode}</span>
                      </div>
                    </td>

                    <td className="ov-cell-repair" data-label="Reparación">
                      <div className="ov-status-cell">
                        <OrderStatusBadge kind="repair" value={order.repair} />
                        {isRowSaving && (
                          <span className="ov-row-feedback ov-row-feedback--saving" aria-live="polite">
                            <span className="ov-mini-spinner" aria-hidden="true" />
                            <span>Guardando…</span>
                          </span>
                        )}
                        {!isRowSaving && isRowSaved && (
                          <span className="ov-row-feedback ov-row-feedback--saved" aria-live="polite">
                            <Check size={12} strokeWidth={2.6} aria-hidden="true" />
                            <span>Guardado</span>
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="ov-cell-payment" data-label="Cobro">
                      <div className="ov-cell-stack ov-cell-stack--tight">
                        <OrderStatusBadge kind="payment" value={payStatus} />
                        <span className="ov-amount">
                          {money(order.paid)} /{' '}
                          {order.price === null ? 'sin precio final' : money(order.price)}
                        </span>
                      </div>
                    </td>

                    <td className="ov-cell-delivery" data-label="Entrega">
                      <OrderStatusBadge kind="delivery" value={order.delivery} />
                    </td>

                    <td className="ov-cell-actions" data-label="Detalle">
                      <OrderRowActions
                        order={order}
                        canEdit={Boolean(actions)}
                        busy={isRowSaving}
                        onQuickRepairChange={handleQuickRepairChange}
                        onConfirmCloseOrder={handleConfirmCloseOrder}
                        onActiveChange={(active) => {
                          setActiveRowId((current) => {
                            if (active) return order.id;
                            return current === order.id ? null : current;
                          });
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="ov-footer-note">
        <Info size={15} strokeWidth={2} className="ov-footer-note__icon" aria-hidden="true" />
        <p>
          Terminado <strong>no</strong> significa cobrado; cobrado <strong>no</strong> significa
          entregado.
        </p>
      </div>
    </section>
  );
}
