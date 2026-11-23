import type { Data } from '../repository';
import { GoogleAuthExpiredError } from './google-auth';

export type SheetCell = string | number;
export type SheetRow = SheetCell[];

export type SheetTabName =
  | 'clients'
  | 'orders'
  | 'leads'
  | 'payments'
  | 'expenses'
  | 'parts_purchases';

type TabSpec = {
  name: SheetTabName;
  lastCol: string;
  columnCount: number;
  createdAtIndex: number;
  buildRows: (data: Data, existingCreatedAt: Map<string, string>, fallbackIso: string) => SheetRow[];
};

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

function createdAtFor(
  id: string,
  existingCreatedAt: Map<string, string>,
  fallbackIso: string,
): string {
  return existingCreatedAt.get(id) || fallbackIso;
}

export const SHEET_TABS: readonly TabSpec[] = [
  {
    name: 'clients',
    lastCol: 'D',
    columnCount: 4,
    createdAtIndex: 3,
    buildRows: (data, existing, fallbackIso) =>
      data.clients.map((c) => [c.id, c.name, c.phone, createdAtFor(c.id, existing, fallbackIso)]),
  },
  {
    name: 'orders',
    lastCol: 'T',
    columnCount: 20,
    createdAtIndex: 19,
    buildRows: (data, existing, fallbackIso) =>
      data.orders.map((o) => [
        o.id,
        o.clientId,
        o.equipment,
        o.mode,
        o.address,
        o.fault,
        o.diagnosis,
        o.parts,
        o.partsCost,
        o.labor,
        o.quote,
        o.price === null ? '' : o.price,
        o.paid,
        o.repair,
        o.delivery,
        o.entry,
        o.finish,
        o.owner,
        o.originalId,
        createdAtFor(o.id, existing, fallbackIso),
      ]),
  },
  {
    name: 'leads',
    lastCol: 'H',
    columnCount: 8,
    createdAtIndex: 7,
    buildRows: (data, existing, fallbackIso) =>
      data.leads.map((l) => [
        l.id,
        l.name,
        l.phone,
        l.problem,
        l.date,
        l.source,
        l.state,
        createdAtFor(l.id, existing, fallbackIso),
      ]),
  },
  {
    name: 'payments',
    lastCol: 'E',
    columnCount: 5,
    createdAtIndex: 4,
    buildRows: (data, existing, fallbackIso) =>
      data.payments.map((p) => [
        p.id,
        p.orderId,
        p.amount,
        p.date,
        createdAtFor(p.id, existing, fallbackIso),
      ]),
  },
  {
    name: 'expenses',
    lastCol: 'F',
    columnCount: 6,
    createdAtIndex: 5,
    buildRows: (data, existing, fallbackIso) =>
      data.expenses.map((e) => [
        e.id,
        e.description,
        e.category,
        e.amount,
        e.date,
        createdAtFor(e.id, existing, fallbackIso),
      ]),
  },
  {
    name: 'parts_purchases',
    lastCol: 'I',
    columnCount: 9,
    createdAtIndex: 8,
    buildRows: (data, existing, fallbackIso) =>
      data.partsPurchases.map((p) => [
        p.id,
        p.name,
        p.cost,
        p.sale,
        p.supplier,
        p.date,
        p.orderId,
        p.quantity,
        createdAtFor(p.id, existing, fallbackIso),
      ]),
  },
];

export type SheetsSyncResult = {
  status: 'up-to-date' | 'synced';
  updatedTabs: SheetTabName[];
  totalRows: number;
  syncedAt: string;
};

type BatchGetResponse = {
  valueRanges?: Array<{
    range?: string;
    values?: unknown[][];
  }>;
};

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  return String(value).trim();
}

function normalizeExistingRows(rawRows: unknown[][] | undefined, columnCount: number): string[][] {
  if (!rawRows || rawRows.length === 0) return [];
  const normalized = rawRows.map((row) => {
    const padded: string[] = [];
    for (let i = 0; i < columnCount; i++) {
      padded.push(normalizeCell(row[i]));
    }
    return padded;
  });
  // Trim trailing completely empty rows returned by Sheets API.
  while (normalized.length > 0 && normalized[normalized.length - 1].every((cell) => cell === '')) {
    normalized.pop();
  }
  return normalized;
}

function normalizeDesiredRows(rows: SheetRow[], columnCount: number): string[][] {
  return rows.map((row) => {
    const padded: string[] = [];
    for (let i = 0; i < columnCount; i++) {
      padded.push(normalizeCell(row[i]));
    }
    return padded;
  });
}

export function rowsEqual(existing: string[][], desired: string[][]): boolean {
  if (existing.length !== desired.length) return false;
  for (let r = 0; r < existing.length; r++) {
    const a = existing[r];
    const b = desired[r];
    if (a.length !== b.length) return false;
    for (let c = 0; c < a.length; c++) {
      if (a[c] !== b[c]) return false;
    }
  }
  return true;
}

function extractCreatedAtMap(existingRows: string[][], createdAtIndex: number): Map<string, string> {
  const map = new Map<string, string>();
  for (const row of existingRows) {
    const id = row[0];
    const createdAt = row[createdAtIndex];
    if (id && createdAt) {
      map.set(id, createdAt);
    }
  }
  return map;
}

async function parseGoogleError(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as { error?: { message?: string } };
    if (json?.error?.message) return json.error.message;
  } catch {
    // Ignore parse error.
  }
  return `Error HTTP ${response.status}`;
}

export async function syncDataToGoogleSheets(options: {
  accessToken: string;
  spreadsheetId: string;
  data: Data;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}): Promise<SheetsSyncResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const nowDate = (options.now ?? (() => new Date()))();
  const nowIso = nowDate.toISOString();

  if (!options.spreadsheetId.trim()) {
    throw new Error('Falta configurar el ID del Google Sheet.');
  }

  const encodedId = encodeURIComponent(options.spreadsheetId.trim());
  const headers = {
    Authorization: `Bearer ${options.accessToken}`,
    'Content-Type': 'application/json',
  };

  // 1. Read all 6 data tabs in a single batchGet (never touches Resumen_Diario).
  const params = new URLSearchParams();
  params.set('valueRenderOption', 'UNFORMATTED_VALUE');
  for (const tab of SHEET_TABS) {
    params.append('ranges', `${tab.name}!A2:${tab.lastCol}`);
  }

  const readRes = await fetchImpl(
    `${SHEETS_API_BASE}/${encodedId}/values:batchGet?${params.toString()}`,
    { method: 'GET', headers: { Authorization: headers.Authorization } },
  );

  if (readRes.status === 401) {
    throw new GoogleAuthExpiredError();
  }
  if (!readRes.ok) {
    const detail = await parseGoogleError(readRes);
    throw new Error(`No se pudo leer el Google Sheet (${detail}).`);
  }

  const batchPayload = (await readRes.json()) as BatchGetResponse;
  const valueRanges = batchPayload.valueRanges ?? [];

  const updates: Array<{ range: string; values: SheetRow[] }> = [];
  const clears: string[] = [];
  const updatedTabs: SheetTabName[] = [];
  let totalRows = 0;

  // 2. Compare each tab deterministically; only write tabs that actually changed.
  for (let i = 0; i < SHEET_TABS.length; i++) {
    const tab = SHEET_TABS[i];
    const existingNormalized = normalizeExistingRows(valueRanges[i]?.values, tab.columnCount);
    const createdAtMap = extractCreatedAtMap(existingNormalized, tab.createdAtIndex);
    const desiredRows = tab.buildRows(options.data, createdAtMap, nowIso);
    const desiredNormalized = normalizeDesiredRows(desiredRows, tab.columnCount);

    totalRows += desiredRows.length;

    if (rowsEqual(existingNormalized, desiredNormalized)) {
      continue;
    }

    updatedTabs.push(tab.name);

    if (desiredRows.length > 0) {
      const endRow = desiredRows.length + 1;
      updates.push({
        range: `${tab.name}!A2:${tab.lastCol}${endRow}`,
        values: desiredRows,
      });
    }

    if (existingNormalized.length > desiredRows.length) {
      const clearStartRow = desiredRows.length + 2;
      const clearEndRow = existingNormalized.length + 1;
      clears.push(`${tab.name}!A${clearStartRow}:${tab.lastCol}${clearEndRow}`);
    }
  }

  if (updatedTabs.length === 0) {
    return {
      status: 'up-to-date',
      updatedTabs: [],
      totalRows,
      syncedAt: nowIso,
    };
  }

  // 3. Apply value updates in one batchUpdate (RAW keeps JSON numbers numeric for SUM formulas,
  // preserves leading zeros in Uruguayan phones and YYYY-MM-DD dates, and prevents formula injection).
  if (updates.length > 0) {
    const updateRes = await fetchImpl(
      `${SHEETS_API_BASE}/${encodedId}/values:batchUpdate`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          valueInputOption: 'RAW',
          data: updates,
        }),
      },
    );

    if (updateRes.status === 401) {
      throw new GoogleAuthExpiredError();
    }
    if (!updateRes.ok) {
      const detail = await parseGoogleError(updateRes);
      throw new Error(`No se pudieron escribir datos en Google Sheets (${detail}).`);
    }
  }

  // 4. Clear only trailing rows without deleting rows or touching formatting.
  if (clears.length > 0) {
    const clearRes = await fetchImpl(
      `${SHEETS_API_BASE}/${encodedId}/values:batchClear`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({ ranges: clears }),
      },
    );

    if (clearRes.status === 401) {
      throw new GoogleAuthExpiredError();
    }
    if (!clearRes.ok) {
      const detail = await parseGoogleError(clearRes);
      throw new Error(`No se pudieron limpiar filas sobrantes en Google Sheets (${detail}).`);
    }
  }

  return {
    status: 'synced',
    updatedTabs,
    totalRows,
    syncedAt: nowIso,
  };
}
