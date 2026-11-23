export type GoogleConfig = {
  clientId: string;
  spreadsheetId: string;
};

type EnvRecord = {
  VITE_GOOGLE_CLIENT_ID?: string;
  NEXT_PUBLIC_GOOGLE_CLIENT_ID?: string;
  VITE_GOOGLE_SHEET_ID?: string;
  NEXT_PUBLIC_GOOGLE_SHEET_ID?: string;
};

export const GOOGLE_SHEET_STORAGE_KEY = 'rodrigo-crm:google-sheet-id';

const SHEET_ID_PATTERN = /^[a-zA-Z0-9-_]{20,128}$/;
const SHEET_URL_PATTERN = /\/spreadsheets\/d\/([a-zA-Z0-9-_]{20,128})(?:\/|$|\?|#)/;

export function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const fromUrl = trimmed.match(SHEET_URL_PATTERN);
  if (fromUrl?.[1]) return fromUrl[1];
  if (SHEET_ID_PATTERN.test(trimmed)) return trimmed;
  return null;
}

export function buildSpreadsheetUrl(spreadsheetId: string): string {
  return `https://docs.google.com/spreadsheets/d/${encodeURIComponent(spreadsheetId)}/edit`;
}

function defaultStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readStoredSheetId(storage: Storage | null = defaultStorage()): string {
  if (!storage) return '';
  try {
    const raw = storage.getItem(GOOGLE_SHEET_STORAGE_KEY);
    return raw ? extractSpreadsheetId(raw) ?? '' : '';
  } catch {
    return '';
  }
}

export function saveStoredSheetId(
  input: string,
  storage: Storage | null = defaultStorage(),
): string | null {
  const id = extractSpreadsheetId(input);
  if (!id) return null;
  if (storage) {
    try {
      storage.setItem(GOOGLE_SHEET_STORAGE_KEY, id);
    } catch {
      // Non-fatal: caller still gets the validated ID for the current session.
    }
  }
  return id;
}

export function clearStoredSheetId(storage: Storage | null = defaultStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(GOOGLE_SHEET_STORAGE_KEY);
  } catch {
    // Ignore storage access errors.
  }
}

export function getGoogleConfig(
  env: EnvRecord = (import.meta.env ?? {}) as EnvRecord,
  storage: Storage | null = defaultStorage(),
): GoogleConfig {
  const clientId = (
    env.VITE_GOOGLE_CLIENT_ID ||
    env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
    ''
  ).trim();
  const envSheetRaw = (
    env.VITE_GOOGLE_SHEET_ID ||
    env.NEXT_PUBLIC_GOOGLE_SHEET_ID ||
    ''
  ).trim();
  const storedSheetId = readStoredSheetId(storage);
  const spreadsheetId = storedSheetId || extractSpreadsheetId(envSheetRaw) || '';
  return { clientId, spreadsheetId };
}

export function isGoogleConfigured(
  env?: EnvRecord,
  storage?: Storage | null,
): boolean {
  return getGoogleConfig(env, storage).clientId.length > 0;
}
