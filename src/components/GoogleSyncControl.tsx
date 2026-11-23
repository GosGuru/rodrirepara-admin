import { useEffect, useId, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  FileDown,
  FileSpreadsheet,
  RefreshCw,
} from 'lucide-react';
import type { Data } from '../repository';
import type { GoogleSyncController } from '../hooks/useGoogleSync';
import './google-sync.css';

export function GoogleSyncControl({
  sync,
  data,
}: {
  sync: GoogleSyncController;
  data?: Data;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('mousedown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  const isWarning = sync.status === 'expired' || sync.status === 'error';
  const triggerClass = [
    'gsync-trigger',
    sync.connected ? 'gsync-trigger--connected' : '',
    isWarning ? 'gsync-trigger--warning' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const triggerLabel =
    sync.status === 'syncing'
      ? 'Sincronizando…'
      : sync.status === 'exporting'
        ? 'Exportando PDF…'
        : sync.status === 'connecting'
          ? 'Conectando…'
          : sync.connected
            ? 'Sheets activo'
            : 'Google Sheets';

  return (
    <div className="gsync-wrap" ref={wrapRef}>
      <button
        type="button"
        className={triggerClass}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label="Respaldo en Google Sheets y Google Drive"
        onClick={() => setOpen((prev) => !prev)}
      >
        {sync.busy ? (
          <RefreshCw size={14} strokeWidth={2} className="gsync-spin" aria-hidden="true" />
        ) : (
          <FileSpreadsheet size={14} strokeWidth={2} aria-hidden="true" />
        )}
        <span>{triggerLabel}</span>
        <span
          className={`gsync-dot ${
            sync.connected ? 'gsync-dot--on' : isWarning ? 'gsync-dot--warn' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Sincronización con Google Sheets y Drive"
          className="gsync-popover"
        >
          <div className="gsync-popover__head">
            <div>
              <h2 className="gsync-popover__title">Respaldo Google</h2>
              <p className="gsync-popover__sub">
                Al guardar clientes, órdenes, cobros o gastos se actualiza el Sheet automáticamente.
              </p>
            </div>
            <span
              className={`gsync-badge ${
                sync.connected ? 'gsync-badge--on' : isWarning ? 'gsync-badge--warn' : ''
              }`}
            >
              {sync.connected
                ? 'Conectado'
                : sync.status === 'expired'
                  ? 'Renovar'
                  : 'Desconectado'}
            </span>
          </div>

          {sync.statusMessage && (
            <p className="gsync-status-line" role="status">
              <CheckCircle2 size={13.5} aria-hidden="true" />
              <span>{sync.statusMessage}</span>
            </p>
          )}

          {sync.errorMessage && (
            <p className="gsync-error" role="alert">
              <AlertCircle
                size={13.5}
                style={{ verticalAlign: 'text-bottom', marginRight: 5 }}
                aria-hidden="true"
              />
              {sync.errorMessage}
            </p>
          )}

          <div className="gsync-actions">
            <button
              type="button"
              className="gsync-btn gsync-btn--primary"
              disabled={sync.busy || !data || !sync.configured}
              onClick={() => {
                if (data) void sync.syncNow(data);
              }}
            >
              <RefreshCw
                size={14}
                strokeWidth={2}
                className={sync.status === 'syncing' ? 'gsync-spin' : undefined}
                aria-hidden="true"
              />
              <span>
                {sync.connected ? 'Sincronizar Sheets ahora' : 'Conectar y sincronizar Sheets'}
              </span>
            </button>

            <button
              type="button"
              className="gsync-btn gsync-btn--secondary"
              disabled={sync.busy || !data || !sync.configured}
              onClick={() => {
                if (data) void sync.exportPdfToDrive(data);
              }}
            >
              <FileDown size={14} strokeWidth={2} aria-hidden="true" />
              <span>Exportar PDF a Google Drive</span>
            </button>
          </div>

          <div className="gsync-links">
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {sync.spreadsheetUrl && (
                <a
                  href={sync.spreadsheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gsync-link"
                >
                  <span>Abrir Sheet</span>
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              )}
              {sync.lastPdfLink && (
                <a
                  href={sync.lastPdfLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gsync-link"
                >
                  <span>Ver último PDF</span>
                  <ExternalLink size={12} aria-hidden="true" />
                </a>
              )}
            </div>

            {sync.connected && (
              <button
                type="button"
                className="gsync-disconnect"
                disabled={sync.busy}
                onClick={() => void sync.disconnect()}
              >
                Desconectar
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
