import { useCallback, useMemo, useRef, useState } from 'react';
import type { Data } from '../repository';
import {
  buildSpreadsheetUrl,
  getGoogleConfig,
  saveStoredSheetId,
} from '../lib/google-config';
import {
  createGoogleAuthSession,
  GoogleAuthExpiredError,
  type GoogleAuthSession,
} from '../lib/google-auth';
import {
  syncDataToGoogleSheets,
  type SheetsSyncResult,
} from '../lib/google-sheets-sync';
import {
  exportSummaryPdfToDrive,
  type DrivePdfUploadResult,
} from '../lib/google-drive-pdf';

export type GoogleSyncStatus =
  | 'idle'
  | 'connecting'
  | 'syncing'
  | 'exporting'
  | 'synced'
  | 'up-to-date'
  | 'expired'
  | 'error';

export type GoogleSyncController = {
  configured: boolean;
  connected: boolean;
  busy: boolean;
  status: GoogleSyncStatus;
  statusMessage: string;
  errorMessage: string;
  lastSyncedAt: string | null;
  lastPdfLink: string | null;
  lastPdfName: string | null;
  spreadsheetId: string;
  spreadsheetUrl: string;
  connectAndSync: (data: Data) => Promise<void>;
  syncNow: (data: Data) => Promise<void>;
  syncAfterMutation: (data: Data) => void;
  exportPdfToDrive: (data: Data) => Promise<DrivePdfUploadResult | null>;
  disconnect: () => Promise<void>;
  updateSpreadsheetId: (input: string) => boolean;
};

type UseGoogleSyncDeps = {
  onNotice?: (message: string) => void;
  session?: GoogleAuthSession;
  syncFn?: typeof syncDataToGoogleSheets;
  exportPdfFn?: typeof exportSummaryPdfToDrive;
};

function formatTimeShort(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-UY', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

export function useGoogleSync(deps: UseGoogleSyncDeps = {}): GoogleSyncController {
  const initialConfig = useMemo(() => getGoogleConfig(), []);
  const [spreadsheetId, setSpreadsheetId] = useState(initialConfig.spreadsheetId);
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState<GoogleSyncStatus>('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [lastPdfLink, setLastPdfLink] = useState<string | null>(null);
  const [lastPdfName, setLastPdfName] = useState<string | null>(null);

  const clientId = initialConfig.clientId;
  const configured = clientId.length > 0;
  const spreadsheetUrl = spreadsheetId ? buildSpreadsheetUrl(spreadsheetId) : '';

  const sessionRef = useRef<GoogleAuthSession | null>(deps.session ?? null);
  if (!sessionRef.current) {
    sessionRef.current = createGoogleAuthSession({ clientId });
  }

  const syncFn = deps.syncFn ?? syncDataToGoogleSheets;
  const exportPdfFn = deps.exportPdfFn ?? exportSummaryPdfToDrive;
  const onNoticeRef = useRef(deps.onNotice);
  onNoticeRef.current = deps.onNotice;

  const syncQueueRef = useRef<Promise<void>>(Promise.resolve());

  const ensureToken = useCallback(
    async (interactive: boolean): Promise<string | null> => {
      const session = sessionRef.current!;
      const existing = session.getAccessToken();
      if (existing) {
        setConnected(true);
        return existing;
      }
      if (!interactive) {
        setConnected(false);
        return null;
      }
      setStatus('connecting');
      setErrorMessage('');
      const token = await session.connect();
      setConnected(true);
      return token;
    },
    [],
  );

  const runSync = useCallback(
    async (
      data: Data,
      options: { interactive: boolean; silentWhenDisconnected?: boolean },
    ): Promise<SheetsSyncResult | null> => {
      if (!configured) {
        if (options.interactive) {
          setStatus('error');
          setErrorMessage('Falta configurar VITE_GOOGLE_CLIENT_ID en el entorno.');
        }
        return null;
      }
      if (!spreadsheetId.trim()) {
        if (options.interactive) {
          setStatus('error');
          setErrorMessage('Pegá la URL o el ID de tu Google Sheet antes de sincronizar.');
        }
        return null;
      }

      try {
        const token = await ensureToken(options.interactive);
        if (!token) {
          if (!options.silentWhenDisconnected) {
            setStatus('idle');
          }
          return null;
        }

        setStatus('syncing');
        setErrorMessage('');
        const result = await syncFn({
          accessToken: token,
          spreadsheetId,
          data,
        });

        setLastSyncedAt(result.syncedAt);
        const timeLabel = formatTimeShort(result.syncedAt);
        if (result.status === 'up-to-date') {
          setStatus('up-to-date');
          setStatusMessage(timeLabel ? `Todo al día · ${timeLabel}` : 'Todo al día');
          if (options.interactive) {
            onNoticeRef.current?.('Google Sheets ya estaba al día (sin cambios).');
          }
        } else {
          setStatus('synced');
          const count = result.updatedTabs.length;
          const label = count === 1 ? '1 pestaña actualizada' : `${count} pestañas actualizadas`;
          setStatusMessage(timeLabel ? `${label} · ${timeLabel}` : label);
          if (options.interactive) {
            onNoticeRef.current?.(`Google Sheets sincronizado (${label}).`);
          }
        }
        return result;
      } catch (err: unknown) {
        if (err instanceof GoogleAuthExpiredError) {
          sessionRef.current?.invalidateToken();
          setConnected(false);
          setStatus('expired');
          setErrorMessage(err.message);
          onNoticeRef.current?.(err.message);
          return null;
        }
        const message =
          err instanceof Error && err.message.trim().length > 0
            ? err.message
            : 'No se pudo sincronizar con Google Sheets.';
        setStatus('error');
        setErrorMessage(message);
        if (options.interactive) {
          onNoticeRef.current?.(message);
        }
        return null;
      }
    },
    [configured, ensureToken, spreadsheetId, syncFn],
  );

  const enqueueSync = useCallback(
    (data: Data, options: { interactive: boolean; silentWhenDisconnected?: boolean }) => {
      const next = syncQueueRef.current.then(
        () => runSync(data, options).then(() => undefined),
        () => runSync(data, options).then(() => undefined),
      );
      syncQueueRef.current = next;
      return next;
    },
    [runSync],
  );

  const syncNow = useCallback(
    async (data: Data) => {
      await enqueueSync(data, { interactive: true });
    },
    [enqueueSync],
  );

  const connectAndSync = useCallback(
    async (data: Data) => {
      await enqueueSync(data, { interactive: true });
    },
    [enqueueSync],
  );

  const syncAfterMutation = useCallback(
    (data: Data) => {
      // Never block or fail CRM mutations when Google is not connected.
      if (!configured || !spreadsheetId.trim()) return;
      if (!sessionRef.current?.isConnected()) return;
      void enqueueSync(data, { interactive: false, silentWhenDisconnected: true });
    },
    [configured, enqueueSync, spreadsheetId],
  );

  const exportPdfToDrive = useCallback(
    async (data: Data): Promise<DrivePdfUploadResult | null> => {
      if (!configured) {
        setStatus('error');
        setErrorMessage('Falta configurar VITE_GOOGLE_CLIENT_ID en el entorno.');
        return null;
      }
      try {
        const token = await ensureToken(true);
        if (!token) return null;

        setStatus('exporting');
        setErrorMessage('');
        const uploaded = await exportPdfFn({
          accessToken: token,
          data,
        });
        setLastPdfLink(uploaded.webViewLink);
        setLastPdfName(uploaded.name);
        setStatus('synced');
        setStatusMessage(`PDF guardado en Drive · ${uploaded.name}`);
        onNoticeRef.current?.(`PDF guardado en Google Drive (${uploaded.name}).`);
        return uploaded;
      } catch (err: unknown) {
        if (err instanceof GoogleAuthExpiredError) {
          sessionRef.current?.invalidateToken();
          setConnected(false);
          setStatus('expired');
          setErrorMessage(err.message);
          onNoticeRef.current?.(err.message);
          return null;
        }
        const message =
          err instanceof Error && err.message.trim().length > 0
            ? err.message
            : 'No se pudo exportar el PDF a Google Drive.';
        setStatus('error');
        setErrorMessage(message);
        onNoticeRef.current?.(message);
        return null;
      }
    },
    [configured, ensureToken, exportPdfFn],
  );

  const disconnect = useCallback(async () => {
    await sessionRef.current?.disconnect();
    setConnected(false);
    setStatus('idle');
    setStatusMessage('');
    setErrorMessage('');
    onNoticeRef.current?.('Cuenta de Google desconectada.');
  }, []);

  const updateSpreadsheetId = useCallback((input: string): boolean => {
    const saved = saveStoredSheetId(input);
    if (!saved) return false;
    setSpreadsheetId(saved);
    setErrorMessage('');
    return true;
  }, []);

  const busy = status === 'connecting' || status === 'syncing' || status === 'exporting';

  return {
    configured,
    connected,
    busy,
    status,
    statusMessage,
    errorMessage,
    lastSyncedAt,
    lastPdfLink,
    lastPdfName,
    spreadsheetId,
    spreadsheetUrl,
    connectAndSync,
    syncNow,
    syncAfterMutation,
    exportPdfToDrive,
    disconnect,
    updateSpreadsheetId,
  };
}
