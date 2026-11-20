import { useEffect, useRef, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, X } from 'lucide-react';
import './ui-primitives.css';

export type ToastTone = 'success' | 'error';

export type ToastProps = {
  message: string;
  tone?: ToastTone;
  durationMs?: number;
  onDismiss: () => void;
  statusRef?: RefObject<HTMLDivElement | null>;
  portal?: boolean;
};

export function Toast({
  message,
  tone = 'success',
  durationMs = 3800,
  onDismiss,
  statusRef,
  portal = false,
}: ToastProps) {
  const pausedRef = useRef(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!message || durationMs <= 0) return;
    let remaining = durationMs;
    let start = Date.now();
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (pausedRef.current) return;
      start = Date.now();
      timer = setTimeout(() => {
        onDismissRef.current();
      }, remaining);
    };

    schedule();
    return () => {
      if (timer) clearTimeout(timer);
      remaining = Math.max(0, remaining - (Date.now() - start));
    };
  }, [message, durationMs]);

  if (!message) return null;

  const content = (
    <div className="ui-toast-layer">
      <div
        ref={statusRef}
        role={tone === 'error' ? 'alert' : 'status'}
        aria-live={tone === 'error' ? 'assertive' : 'polite'}
        tabIndex={-1}
        className={`ui-toast${tone === 'error' ? ' ui-toast--error' : ''}`}
        onMouseEnter={() => { pausedRef.current = true; }}
        onMouseLeave={() => { pausedRef.current = false; }}
      >
        <span className="ui-toast__badge" aria-hidden="true">
          {tone === 'error' ? <AlertCircle size={14} strokeWidth={2.2} /> : <Check size={14} strokeWidth={2.6} />}
        </span>
        <span className="ui-toast__text">{message}</span>
        <button
          type="button"
          className="ui-toast__close"
          onClick={onDismiss}
          aria-label="Cerrar aviso"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );

  if (portal && typeof document !== 'undefined' && document.body) {
    return createPortal(content, document.body);
  }
  return content;
}
