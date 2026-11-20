import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Copy } from 'lucide-react';
import { useFloatingPopover } from '../../hooks/useFloatingPopover';
import { formatDisplayOrderId, isLongOrderId } from './order-helpers';

export function OrderIdCell({ id }: { id: string }) {
  const long = isLongOrderId(id);
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const popoverId = useId();

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    setCopied(false);
    if (returnFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  const { style, placement, portalTarget } = useFloatingPopover({
    open: long && open,
    anchorRef: triggerRef,
    floatingRef,
    onClose: () => close(false),
    minWidth: 260,
    maxWidth: 360,
    estimatedHeight: 96,
  });

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, close]);

  if (!long) {
    return <strong className="ov-order-id">{id}</strong>;
  }

  const display = formatDisplayOrderId(id);

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  return (
    <span className="ov-order-id-wrap">
      <button
        ref={triggerRef}
        type="button"
        className="ov-order-id ov-order-id--long"
        title={id}
        aria-label={`Identificador completo ${id}. Ver o copiar identificador`}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{display}</span>
      </button>
      {open &&
        portalTarget &&
        createPortal(
          <div
            ref={floatingRef}
            id={popoverId}
            role="dialog"
            aria-label="Identificador completo de la orden"
            className="ui-popover ov-id-popover"
            data-placement={placement}
            style={style}
          >
            <span className="ov-id-popover__label">Identificador completo</span>
            <code className="ov-id-popover__code">{id}</code>
            <div className="ov-id-popover__actions">
              <button type="button" className="ov-id-popover__copy" onClick={handleCopy}>
                {copied ? (
                  <>
                    <Check size={13} strokeWidth={2.4} aria-hidden="true" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy size={13} strokeWidth={2} aria-hidden="true" />
                    <span>Copiar ID</span>
                  </>
                )}
              </button>
            </div>
          </div>,
          portalTarget,
        )}
    </span>
  );
}
