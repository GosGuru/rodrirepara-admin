import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './side-sheet.css';

export type SideSheetProps = {
  open: boolean;
  titleId: string;
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  busy?: boolean;
  onRequestClose: () => void;
};

/** Controlled visual shell; callers retain record identity and form state. */
export function SideSheet({ open, titleId, header, children, footer, busy = false, onRequestClose }: SideSheetProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const origin = useRef<HTMLElement | null>(null);
  const requestClose = useRef(onRequestClose);
  const blocked = useRef(busy);
  const [mounted, setMounted] = useState(false);
  const [entered, setEntered] = useState(false);
  requestClose.current = onRequestClose;
  blocked.current = busy;

  // Native close finishes top-layer focus cleanup before choosing a safe return target.
  function restoreFocus() {
    if (dialog.current?.open) return;
    if (origin.current?.isConnected) {
      origin.current.focus();
      if (document.activeElement === origin.current && origin.current !== document.body) return;
    }
    const status = document.querySelector<HTMLElement>('main [role="status"][tabindex="-1"]');
    const fallback = status?.getClientRects().length ? status : document.querySelector<HTMLElement>('main h1');
    if (fallback?.getClientRects().length) {
      if (!fallback.hasAttribute('tabindex')) fallback.setAttribute('tabindex', '-1');
      fallback.focus();
    }
  }

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (!mounted || !dialog.current) return;
    const element = dialog.current;
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (open) {
      if (!element.open) {
        origin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        element.showModal();
      }
      frame = requestAnimationFrame(() => setEntered(true));
    } else if (element.open) {
      setEntered(false);
      const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220;
      timer = setTimeout(() => {
        element.close();
      }, duration);
    }
    return () => {
      cancelAnimationFrame(frame);
      if (timer !== undefined) clearTimeout(timer);
    };
  }, [open, mounted]);

  useEffect(() => {
    if (!open || !mounted) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open, mounted]);

  useEffect(() => () => {
    if (origin.current?.isConnected && document.activeElement === document.body) origin.current.focus();
  }, []);

  if (!mounted) return null;
  return createPortal(
    <dialog
      ref={dialog}
      className={`side-sheet${entered ? ' side-sheet--entered' : ''}`}
      aria-labelledby={titleId}
      aria-busy={busy || undefined}
      onClose={restoreFocus}
      onCancel={event => { event.preventDefault(); if (!blocked.current) requestClose.current(); }}
      onClick={event => {
        if (event.target !== event.currentTarget || blocked.current) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) requestClose.current();
      }}
    >
      <header className="side-sheet__header">{header}</header>
      <div className="side-sheet__body">{children}</div>
      {footer !== undefined && <footer className="side-sheet__footer">{footer}</footer>}
    </dialog>,
    document.body,
  );
}
