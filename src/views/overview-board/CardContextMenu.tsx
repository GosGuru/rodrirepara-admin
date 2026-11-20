import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowLeftRight,
  Check,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  Eye,
  Pencil,
  Trash2,
} from 'lucide-react';
import type { Order } from '../../repository';
import { moveChoices } from '../repair-board';
import './panels.css';

const ALL_REPAIR_STATES = [
  ...moveChoices.pending,
  ...moveChoices.progress,
  ...moveChoices.ready,
] as const;

export function CardContextMenu({
  order,
  anchor,
  canEdit,
  busy,
  onClose,
  onViewDetail,
  onEdit,
  onRegisterPayment,
  onChangeRepair,
}: {
  order: Order;
  anchor: HTMLElement;
  canEdit: boolean;
  busy: boolean;
  onClose: () => void;
  onViewDetail: () => void;
  onEdit: () => void;
  onRegisterPayment: () => void;
  onChangeRepair: (nextRepair: string) => void;
}) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [statesOpen, setStatesOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number; subLeft: boolean }>({
    top: -9999,
    left: -9999,
    subLeft: false,
  });

  const noBalance = order.price !== null && order.paid >= order.price;
  const isReady = order.repair === 'Terminado';

  useLayoutEffect(() => {
    function computePosition() {
      const rect = anchor.getBoundingClientRect();
      const menuW = 204;
      const menuH = menuRef.current?.offsetHeight || 256;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Anchor right edge near trigger right edge (matching reference placement)
      let left = rect.right - menuW;
      if (left < 10) left = Math.min(vw - menuW - 10, rect.left);
      if (left + menuW > vw - 10) left = vw - menuW - 10;

      let top = rect.bottom + 6;
      if (top + menuH > vh - 12 && rect.top - menuH - 6 > 12) {
        top = rect.top - menuH - 6;
      } else if (top + menuH > vh - 12) {
        top = Math.max(12, vh - menuH - 12);
      }

      const subLeft = left + menuW + 196 > vw - 10;
      setPos({ top, left, subLeft });
    }
    computePosition();
    window.addEventListener('resize', computePosition);
    window.addEventListener('scroll', onClose, true);
    return () => {
      window.removeEventListener('resize', computePosition);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [anchor, onClose]);

  useEffect(() => {
    const first = menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)');
    first?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        anchor.focus();
        return;
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        const items = Array.from(
          menuRef.current?.querySelectorAll<HTMLButtonElement>(':scope > [role="menuitem"]:not(:disabled), :scope > .cm-sub-wrap > [role="menuitem"]:not(:disabled)') ?? [],
        );
        if (!items.length) return;
        e.preventDefault();
        const idx = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === 'ArrowDown' ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
        items[next]?.focus();
      }
    }

    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (target && (menuRef.current?.contains(target) || anchor.contains(target))) return;
      onClose();
    }

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [anchor, onClose]);

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      aria-label={`Acciones de ${order.id}`}
      className="cm-menu"
      style={{ top: pos.top, left: pos.left }}
    >
      <button
        type="button"
        role="menuitem"
        className="cm-item"
        onClick={() => {
          onClose();
          onViewDetail();
        }}
      >
        <Eye size={15} strokeWidth={1.85} aria-hidden="true" />
        <span>Ver detalle</span>
      </button>

      <button
        type="button"
        role="menuitem"
        className="cm-item"
        disabled={!canEdit || busy}
        onClick={() => {
          onClose();
          onEdit();
        }}
      >
        <Pencil size={15} strokeWidth={1.85} aria-hidden="true" />
        <span>Editar reparación</span>
      </button>

      <div className="cm-sub-wrap">
        <button
          type="button"
          role="menuitem"
          aria-haspopup="menu"
          aria-expanded={statesOpen}
          className={`cm-item cm-item--has-sub${statesOpen ? ' is-open' : ''}`}
          disabled={!canEdit || busy}
          onClick={() => setStatesOpen(prev => !prev)}
        >
          <ArrowLeftRight size={15} strokeWidth={1.85} aria-hidden="true" />
          <span>Cambiar estado</span>
          <ChevronRight size={14} strokeWidth={2} className="cm-item__chevron" aria-hidden="true" />
        </button>

        {statesOpen && (
          <div
            role="menu"
            aria-label="Seleccionar nuevo estado"
            className={`cm-submenu${pos.subLeft ? ' cm-submenu--left' : ''}`}
          >
            {ALL_REPAIR_STATES.map(stateLabel => {
              const current = order.repair === stateLabel;
              return (
                <button
                  key={stateLabel}
                  type="button"
                  role="menuitemradio"
                  aria-checked={current}
                  className={`cm-sub-item${current ? ' is-current' : ''}`}
                  disabled={busy}
                  onClick={() => {
                    onClose();
                    if (!current) onChangeRepair(stateLabel);
                  }}
                >
                  <span>{stateLabel}</span>
                  {current && <Check size={13} strokeWidth={2.3} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <button
        type="button"
        role="menuitem"
        className="cm-item"
        disabled={!canEdit || busy || noBalance}
        title={noBalance ? 'El precio final ya está cubierto' : undefined}
        onClick={() => {
          onClose();
          onRegisterPayment();
        }}
      >
        <CreditCard size={15} strokeWidth={1.85} aria-hidden="true" />
        <span>Registrar cobro</span>
      </button>

      <button
        type="button"
        role="menuitem"
        className="cm-item"
        disabled={!canEdit || busy || isReady}
        onClick={() => {
          onClose();
          onChangeRepair('Terminado');
        }}
      >
        <CheckCircle2 size={15} strokeWidth={1.85} aria-hidden="true" />
        <span>Marcar como lista</span>
      </button>

      <div className="cm-divider" role="separator" />

      <button
        type="button"
        role="menuitem"
        className="cm-item cm-item--danger"
        disabled={!canEdit || busy}
        onClick={() => {
          onClose();
          onChangeRepair('Cerrado');
        }}
      >
        <Trash2 size={15} strokeWidth={1.85} aria-hidden="true" />
        <span>Cerrar orden</span>
      </button>
    </div>,
    document.body,
  );
}
