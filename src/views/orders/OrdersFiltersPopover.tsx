import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { Select } from '../../components/ui/Select';
import {
  countActiveExtraFilters,
  DELIVERY_FILTER_OPTIONS,
  EMPTY_EXTRA_FILTERS,
  PAYMENT_FILTER_OPTIONS,
  REPAIR_FILTER_OPTIONS,
  type OrderExtraFilters,
} from './order-helpers';

export function OrdersFiltersPopover({
  filters,
  onChange,
}: {
  filters: OrderExtraFilters;
  onChange: (next: OrderExtraFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<CSSProperties>({ position: 'fixed', visibility: 'hidden' });
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();
  const repairLabelId = useId();

  const activeCount = countActiveExtraFilters(filters);

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  const updatePosition = useCallback(() => {
    const anchor = triggerRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    const margin = 12;
    const width = Math.min(324, window.innerWidth - margin * 2);
    const estH = popoverRef.current?.offsetHeight || 292;
    const spaceBelow = window.innerHeight - rect.bottom - margin;
    const spaceAbove = rect.top - margin;
    const flipTop = spaceBelow < Math.min(estH, 240) && spaceAbove > spaceBelow;

    const top = flipTop
      ? Math.max(margin, rect.top - estH - 8)
      : Math.min(window.innerHeight - estH - margin, rect.bottom + 8);
    let left = rect.right - width;
    if (left < margin) left = margin;
    if (left + width > window.innerWidth - margin) {
      left = Math.max(margin, window.innerWidth - width - margin);
    }

    setPlacement(flipTop ? 'top' : 'bottom');
    setPos({
      position: 'fixed',
      top: Math.round(top),
      left: Math.round(left),
      width: Math.round(width),
      visibility: 'visible',
    });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const raf = requestAnimationFrame(updatePosition);
    return () => cancelAnimationFrame(raf);
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;

    function handleMouseDown(event: MouseEvent) {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      // Keep open when interacting with a nested portaled Select listbox
      if (target.closest?.('.ui-popover')) return;
      close(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      }
    }

    function handleScroll(event: Event) {
      const target = event.target as HTMLElement | null;
      if (target && (popoverRef.current?.contains(target) || target.closest?.('.ui-popover'))) {
        return;
      }
      updatePosition();
    }

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [open, close, updatePosition]);

  const portalTarget = typeof document !== 'undefined' ? document.body : null;

  return (
    <div className="ov-filter-field ov-filter-field--more">
      <button
        ref={triggerRef}
        type="button"
        className={`ov-more-btn${activeCount > 0 ? ' is-active' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={() => setOpen((prev) => !prev)}
      >
        <SlidersHorizontal size={15} strokeWidth={1.95} aria-hidden="true" />
        <span>Más filtros</span>
        {activeCount > 0 && (
          <span className="ov-more-btn__badge" aria-label={`${activeCount} filtros adicionales activos`}>
            {activeCount}
          </span>
        )}
      </button>

      {open &&
        portalTarget &&
        createPortal(
          <div
            ref={popoverRef}
            id={popoverId}
            role="dialog"
            aria-label="Filtros adicionales de estado"
            className="ui-popover ov-more-popover"
            data-placement={placement}
            style={pos}
          >
            <div className="ov-more-popover__header">
              <div>
                <strong>Filtros por estado</strong>
                <p>Reparación, cobro y entrega son independientes.</p>
              </div>
              <button
                type="button"
                className="ov-icon-close"
                onClick={() => close(true)}
                aria-label="Cerrar filtros"
              >
                <X size={15} aria-hidden="true" />
              </button>
            </div>

            <div className="ov-more-popover__body">
              <div className="ov-more-group">
                <span id={repairLabelId} className="ov-more-group__label">
                  Reparación
                </span>
                <Select
                  value={filters.repair}
                  onChange={(repair) => onChange({ ...filters, repair })}
                  options={REPAIR_FILTER_OPTIONS}
                  ariaLabelledBy={repairLabelId}
                />
              </div>

              <fieldset className="ov-more-group">
                <legend className="ov-more-group__label">Cobro</legend>
                <div className="ov-seg-row" role="group" aria-label="Filtrar por estado de cobro">
                  {PAYMENT_FILTER_OPTIONS.map((opt) => {
                    const active = filters.payment === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        aria-pressed={active}
                        className={`ov-seg-btn${active ? ' is-selected' : ''}`}
                        onClick={() => onChange({ ...filters, payment: opt.value })}
                      >
                        {opt.value === 'Todos' ? 'Todos' : opt.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="ov-more-group">
                <legend className="ov-more-group__label">Entrega</legend>
                <div className="ov-seg-row" role="group" aria-label="Filtrar por estado de entrega">
                  {DELIVERY_FILTER_OPTIONS.map((opt) => {
                    const active = filters.delivery === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        aria-pressed={active}
                        className={`ov-seg-btn${active ? ' is-selected' : ''}`}
                        onClick={() => onChange({ ...filters, delivery: opt.value })}
                      >
                        {opt.value === 'Todos' ? 'Todas' : opt.label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            </div>

            <div className="ov-more-popover__footer">
              <button
                type="button"
                className="ov-text-btn"
                disabled={activeCount === 0}
                onClick={() => onChange({ ...EMPTY_EXTRA_FILTERS })}
              >
                Restablecer
              </button>
              <button type="button" className="ov-done-btn" onClick={() => close(true)}>
                Listo
              </button>
            </div>
          </div>,
          portalTarget,
        )}
    </div>
  );
}
