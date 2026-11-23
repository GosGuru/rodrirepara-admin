export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
] as const;

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const EXPIRY_SAFETY_MARGIN_MS = 60_000;

export class GoogleAuthExpiredError extends Error {
  constructor(message = 'Tu sesión de Google venció. Tocá "Conectar Google" para renovar.') {
    super(message);
    this.name = 'GoogleAuthExpiredError';
  }
}

export class GoogleAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GoogleAuthError';
  }
}

export type GoogleTokenResponse = {
  access_token?: string;
  expires_in?: number | string;
  error?: string;
  error_description?: string;
};

export type GoogleTokenClientLike = {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
};

export type GoogleOAuth2Like = {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: GoogleTokenResponse) => void;
    error_callback?: (error: { type?: string; message?: string }) => void;
  }) => GoogleTokenClientLike;
  revoke?: (token: string, done?: () => void) => void;
};

export interface GoogleAuthSession {
  connect(options?: { prompt?: 'consent' | '' }): Promise<string>;
  disconnect(): Promise<void>;
  getAccessToken(): string | null;
  isConnected(): boolean;
  invalidateToken(): void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: GoogleOAuth2Like;
      };
    };
  }
}

let gisLoadPromise: Promise<GoogleOAuth2Like> | null = null;

export function loadGoogleIdentityServices(): Promise<GoogleOAuth2Like> {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(
      new GoogleAuthError('Google OAuth solo está disponible en el navegador.'),
    );
  }
  const existing = window.google?.accounts?.oauth2;
  if (existing) return Promise.resolve(existing);

  if (gisLoadPromise) return gisLoadPromise;

  gisLoadPromise = new Promise<GoogleOAuth2Like>((resolve, reject) => {
    const finish = () => {
      const oauth2 = window.google?.accounts?.oauth2;
      if (oauth2) {
        resolve(oauth2);
      } else {
        gisLoadPromise = null;
        reject(
          new GoogleAuthError(
            'No se pudo inicializar Google Identity Services. Recargá la página e intentá de nuevo.',
          ),
        );
      }
    };

    const existingScript = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SCRIPT_URL}"]`,
    );
    if (existingScript) {
      existingScript.addEventListener('load', finish, { once: true });
      existingScript.addEventListener(
        'error',
        () => {
          gisLoadPromise = null;
          reject(
            new GoogleAuthError(
              'No se pudo cargar Google Identity Services. Revisá tu conexión o bloqueador de scripts.',
            ),
          );
        },
        { once: true },
      );
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = finish;
    script.onerror = () => {
      gisLoadPromise = null;
      reject(
        new GoogleAuthError(
          'No se pudo cargar Google Identity Services. Revisá tu conexión o bloqueador de scripts.',
        ),
      );
    };
    document.head.appendChild(script);
  });

  return gisLoadPromise;
}

function mapOAuthError(code?: string, description?: string): string {
  const normalized = (code || '').toLowerCase();
  if (normalized === 'popup_closed' || normalized === 'popup_closed_by_user') {
    return 'Se cerró la ventana de Google antes de completar el acceso.';
  }
  if (normalized === 'popup_failed_to_open') {
    return 'El navegador bloqueó la ventana de Google. Permití popups para este sitio y volvé a intentar.';
  }
  if (normalized === 'access_denied') {
    return 'No se otorgaron los permisos de Google Sheets y Drive.';
  }
  if (description && description.trim().length > 0) {
    return `Google rechazó el acceso: ${description.trim()}`;
  }
  return 'No se pudo conectar con Google. Verificá tu Client ID y los orígenes autorizados.';
}

export function createGoogleAuthSession(options: {
  clientId: string;
  loadOAuth2?: () => Promise<GoogleOAuth2Like>;
  now?: () => number;
}): GoogleAuthSession {
  const loadOAuth2 = options.loadOAuth2 ?? loadGoogleIdentityServices;
  const now = options.now ?? (() => Date.now());

  let accessToken: string | null = null;
  let expiresAt = 0;

  function getAccessToken(): string | null {
    if (!accessToken) return null;
    if (now() >= expiresAt - EXPIRY_SAFETY_MARGIN_MS) {
      accessToken = null;
      expiresAt = 0;
      return null;
    }
    return accessToken;
  }

  function invalidateToken(): void {
    accessToken = null;
    expiresAt = 0;
  }

  async function connect(connectOptions?: { prompt?: 'consent' | '' }): Promise<string> {
    if (!options.clientId.trim()) {
      throw new GoogleAuthError(
        'Falta configurar VITE_GOOGLE_CLIENT_ID en las variables de entorno.',
      );
    }

    const oauth2 = await loadOAuth2();

    return new Promise<string>((resolve, reject) => {
      let settled = false;
      const done = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };

      const client = oauth2.initTokenClient({
        client_id: options.clientId.trim(),
        scope: GOOGLE_SCOPES.join(' '),
        callback: (response) => {
          if (response.error || !response.access_token) {
            done(() =>
              reject(
                new GoogleAuthError(
                  mapOAuthError(response.error, response.error_description),
                ),
              ),
            );
            return;
          }
          const expiresInSec = Number(response.expires_in) || 3600;
          accessToken = response.access_token;
          expiresAt = now() + expiresInSec * 1000;
          done(() => resolve(response.access_token!));
        },
        error_callback: (err) => {
          done(() => reject(new GoogleAuthError(mapOAuthError(err?.type, err?.message))));
        },
      });

      client.requestAccessToken({ prompt: connectOptions?.prompt ?? '' });
    });
  }

  async function disconnect(): Promise<void> {
    const tokenToRevoke = accessToken;
    invalidateToken();
    if (!tokenToRevoke) return;
    try {
      const oauth2 = await loadOAuth2();
      if (oauth2.revoke) {
        await new Promise<void>((resolve) => {
          oauth2.revoke!(tokenToRevoke, () => resolve());
        });
      }
    } catch {
      // Local token is already cleared even if remote revocation fails.
    }
  }

  return {
    connect,
    disconnect,
    getAccessToken,
    isConnected: () => getAccessToken() !== null,
    invalidateToken,
  };
}
