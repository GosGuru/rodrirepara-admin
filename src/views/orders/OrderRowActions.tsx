import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Eye, MoreHorizontal } from 'lucide-react';
import type { Order } from '../../repository';
import { useOrderSheet } from '../../components/OrderSheetProvider';
import { SaveButton } from '../../components/ui/SaveButton';
import { useFloatingPopover } from '../../hooks/useFloatingPopover';
import { useSaveFeedback } from '../../hooks/useSaveFeedback';
import { CardContextMenu } from '../overview-board/CardContextMenu';
import { formatDisplayOrderId } from './order-helpers';

export function OrderRowActions({
  order,
  canEdit,
  busy,
  onQuickRepairChange,
  onConfirmCloseOrder,
  onActiveChange,
}: {
  order: Order;
  canEdit: boolean;
  busy: boolean;
  onQuickRepairChange: (order: Order, nextRepair: string) => void;
  onConfirmCloseOrder: (order: Order) => Promise<void>;
  onActiveChange?: (active: boolean) => void;
}) {
  const sheet = useOrderSheet();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const detailBtnRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const confirmId = useId();

  const closeFeedback = useSaveFeedback({
    defaultError: 'No se pudo cerrar la orden. Intentá de nuevo.',
    successHoldMs: 700,
  });

  const isActive = menuOpen || confirmCloseOpen;
  useEffect(() => {
    onActiveChange?.(isActive);
  }, [isActive, onActiveChange]);

  const dismissConfirm = useCallback(
    (returnFocus = false) => {
      if (closeFeedback.busy) return;
      setConfirmCloseOpen(false);
      closeFeedback.reset();
      if (returnFocus) {
        requestAnimationFrame(() => menuBtnRef.current?.focus());
      }
    },
    [closeFeedback],
  );

  const { style: confirmStyle, placement: confirmPlacement, portalTarget } = useFloatingPopover({
    open: confirmCloseOpen,
    anchorRef: menuBtnRef,
    floatingRef: confirmRef,
    onClose: () => dismissConfirm(false),
    align: 'end',
    minWidth: 276,
    maxWidth: 312,
    estimatedHeight: 170,
  });

  useEffect(() => {
    if (!confirmCloseOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !closeFeedback.busy) {
        event.preventDefault();
        dismissConfirm(true);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [confirmCloseOpen, closeFeedback.busy, dismissConfirm]);

  const handleCloseOrder = () => {
    void closeFeedback.run(
      () => onConfirmCloseOrder(order),
      () => {
        setConfirmCloseOpen(false);
        closeFeedback.reset();
      },
    );
  };

  const displayId = formatDisplayOrderId(order.id);
  const openInSheet = (mode?: 'edit' | 'payment' | null) => {
    const origin = detailBtnRef.current ?? menuBtnRef.current;
    if (origin) sheet?.show(order, origin, mode ?? null);
  };

  return (
    <div className="ov-row-actions">
      <button
        ref={detailBtnRef}
        type="button"
        className="ov-detail-btn"
        aria-label={`Ver detalle de ${order.id}`}
        onClick={(e) => sheet?.show(order, e.currentTarget, null)}
      >
        <Eye size={14} strokeWidth={1.9} aria-hidden="true" />
        <span>Ver detalle</span>
      </button>

      <button
        ref={menuBtnRef}
        type="button"
        className={`ov-more-row-btn${isActive ? ' is-open' : ''}`}
        aria-label={`Más acciones para ${order.id}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        disabled={busy}
        onClick={() => {
          setConfirmCloseOpen(false);
          closeFeedback.reset();
          setMenuOpen((prev) => !prev);
        }}
      >
        <MoreHorizontal size={16} strokeWidth={2} aria-hidden="true" />
      </button>

      {menuOpen && menuBtnRef.current && (
        <CardContextMenu
          order={order}
          anchor={menuBtnRef.current}
          canEdit={canEdit}
          busy={busy}
          onClose={() => setMenuOpen(false)}
          onViewDetail={() => openInSheet(null)}
          onEdit={() => openInSheet('edit')}
          onRegisterPayment={() => openInSheet('payment')}
          onChangeRepair={(nextRepair) => {
            if (nextRepair === 'Cerrado') {
              closeFeedback.reset();
              setConfirmCloseOpen(true);
              return;
            }
            onQuickRepairChange(order, nextRepair);
          }}
        />
      )}

      {confirmCloseOpen &&
        portalTarget &&
        createPortal(
          <div
            ref={confirmRef}
            id={confirmId}
            role="alertdialog"
            aria-label={`Confirmar cierre de orden ${order.id}`}
            className="ui-popover ov-confirm-popover"
            data-placement={confirmPlacement}
            style={confirmStyle}
          >
            <div className="ov-confirm-popover__head">
              <span className="ov-confirm-popover__icon" aria-hidden="true">
                <AlertTriangle size={15} strokeWidth={2.1} />
              </span>
              <div>
                <strong>¿Cerrar la orden {displayId}?</strong>
                <p>Pasará a estado Cerrado. No elimina el historial ni los cobros registrados.</p>
              </div>
            </div>

            {closeFeedback.error && (
              <p role="alert" className="ov-confirm-popover__error">
                {closeFeedback.error}
              </p>
            )}

            <div className="ov-confirm-popover__actions">
              <button
                type="button"
                className="ov-confirm-cancel"
                disabled={closeFeedback.busy}
                onClick={() => dismissConfirm(true)}
              >
                Cancelar
              </button>
              <SaveButton
                type="button"
                status={closeFeedback.status}
                idleLabel="Cerrar orden"
                savingLabel="Cerrando..."
                successLabel="Guardado"
                showIdleCheck={false}
                className="ov-confirm-danger-save"
                onClick={handleCloseOrder}
              />
            </div>
          </div>,
          portalTarget,
        )}
    </div>
  );
}
