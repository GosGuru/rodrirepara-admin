import { describe, expect, it } from 'bun:test';
import { EMPTY_DATA, MemoryStorage, type Data } from '../repository';
import {
  extractSpreadsheetId,
  getGoogleConfig,
  saveStoredSheetId,
} from './google-config';
import {
  createGoogleAuthSession,
  GOOGLE_SCOPES,
  GoogleAuthExpiredError,
  type GoogleOAuth2Like,
} from './google-auth';
import { syncDataToGoogleSheets } from './google-sheets-sync';

const SAMPLE_DATA: Data = {
  clients: [{ id: 'CLI-1', name: 'Ana Gómez', phone: '099111222' }],
  orders: [
    {
      id: 'ORD-1',
      clientId: 'CLI-1',
      equipment: 'Lavarropas Samsung',
      mode: 'Taller',
      address: 'Av. Italia 1234',
      fault: 'No centrifuga',
      diagnosis: 'Bomba obstruida',
      parts: 'Bomba desagote',
      partsCost: 1200,
      labor: 1800,
      quote: 3000,
      price: 3000,
      paid: 1500,
      repair: 'En reparación',
      delivery: 'Pendiente',
      entry: '2026-11-20',
      finish: '',
      owner: 'Rodrigo',
      originalId: '',
    },
  ],
  leads: [
    {
      id: 'LEAD-1',
      name: 'Carlos Ruiz',
      phone: '098333444',
      problem: 'Heladera no enfría',
      date: '2026-11-21',
      source: 'WhatsApp',
      state: 'Nuevo',
    },
  ],
  payments: [{ id: 'PAY-1', orderId: 'ORD-1', amount: 1500, date: '2026-11-21' }],
  expenses: [
    {
      id: 'EXP-1',
      description: 'Compra de repuestos',
      category: 'Repuestos',
      amount: 1200,
      date: '2026-11-21',
    },
  ],
  partsPurchases: [
    {
      id: 'PART-1',
      name: 'Bomba desagote',
      cost: 1200,
      sale: 1800,
      supplier: 'Repuestos Sur',
      date: '2026-11-21',
      orderId: 'ORD-1',
      quantity: 1,
    },
  ],
};

describe('google-config', () => {
  it('extracts spreadsheet ID from full URL and raw ID', () => {
    expect(
      extractSpreadsheetId(
        'https://docs.google.com/spreadsheets/d/1mQWfNTI5Ca9EDRW0zI68Vfz9ypNWNMZAPQS97qbf1ZQ/edit?usp=sharing',
      ),
    ).toBe('1mQWfNTI5Ca9EDRW0zI68Vfz9ypNWNMZAPQS97qbf1ZQ');
    expect(extractSpreadsheetId('1mQWfNTI5Ca9EDRW0zI68Vfz9ypNWNMZAPQS97qbf1ZQ')).toBe(
      '1mQWfNTI5Ca9EDRW0zI68Vfz9ypNWNMZAPQS97qbf1ZQ',
    );
    expect(extractSpreadsheetId('not-valid')).toBeNull();
  });

  it('prefers stored sheet ID over env default', () => {
    const storage = new MemoryStorage();
    const env = {
      VITE_GOOGLE_CLIENT_ID: 'client-123.apps.googleusercontent.com',
      VITE_GOOGLE_SHEET_ID: '1mQWfNTI5Ca9EDRW0zI68Vfz9ypNWNMZAPQS97qbf1ZQ',
    };
    expect(getGoogleConfig(env, storage).spreadsheetId).toBe(
      '1mQWfNTI5Ca9EDRW0zI68Vfz9ypNWNMZAPQS97qbf1ZQ',
    );
    saveStoredSheetId(
      'https://docs.google.com/spreadsheets/d/2aBCdEFgHIjKLmNOpQRstUVwXYz0123456789abcdef/edit',
      storage,
    );
    expect(getGoogleConfig(env, storage).spreadsheetId).toBe(
      '2aBCdEFgHIjKLmNOpQRstUVwXYz0123456789abcdef',
    );
  });
});

describe('google-auth', () => {
  it('connects with least-privilege scopes, caches token until expiry, and revokes on disconnect', async () => {
    let clock = 1_000_000;
    let revokedToken = '';
    let capturedScope = '';
    const oauth2: GoogleOAuth2Like = {
      initTokenClient(config) {
        capturedScope = config.scope;
        return {
          requestAccessToken() {
            config.callback({ access_token: 'tok-abc', expires_in: 3600 });
          },
        };
      },
      revoke(token, done) {
        revokedToken = token;
        done?.();
      },
    };

    const session = createGoogleAuthSession({
      clientId: 'client-id',
      loadOAuth2: async () => oauth2,
      now: () => clock,
    });

    const token = await session.connect();
    expect(token).toBe('tok-abc');
    expect(capturedScope).toBe(GOOGLE_SCOPES.join(' '));
    expect(session.isConnected()).toBe(true);

    // Advance past expiry safety margin (3600s - 60s = 3540s)
    clock += 3_550_000;
    expect(session.getAccessToken()).toBeNull();
    expect(session.isConnected()).toBe(false);

    await session.connect();
    await session.disconnect();
    expect(revokedToken).toBe('tok-abc');
    expect(session.isConnected()).toBe(false);
  });
});

describe('syncDataToGoogleSheets', () => {
  it('writes all 6 data tabs with exact schema and never touches Resumen_Diario', async () => {
    const calls: Array<{ url: string; method: string; body?: unknown }> = [];
    const fetchMock = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      const body = init?.body ? JSON.parse(String(init.body)) : undefined;
      calls.push({ url, method, body });

      if (url.includes('values:batchGet')) {
        return new Response(
          JSON.stringify({
            valueRanges: [{}, {}, {}, {}, {}, {}],
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({}), { status: 200 });
    }) as typeof fetch;

    const result = await syncDataToGoogleSheets({
      accessToken: 'tok-1',
      spreadsheetId: '1mQWfNTI5Ca9EDRW0zI68Vfz9ypNWNMZAPQS97qbf1ZQ',
      data: SAMPLE_DATA,
      fetchImpl: fetchMock,
      now: () => new Date('2026-11-22T22:00:00.000Z'),
    });

    expect(result.status).toBe('synced');
    expect(result.updatedTabs).toEqual([
      'clients',
      'orders',
      'leads',
      'payments',
      'expenses',
      'parts_purchases',
    ]);
    expect(result.totalRows).toBe(6);

    const getCall = calls.find((c) => c.url.includes('values:batchGet'));
    expect(getCall?.url).not.toContain('Resumen_Diario');

    const updateCall = calls.find((c) => c.url.includes('values:batchUpdate'));
    expect(updateCall?.method).toBe('POST');
    const payload = updateCall?.body as {
      valueInputOption: string;
      data: Array<{ range: string; values: unknown[][] }>;
    };
    expect(payload.valueInputOption).toBe('USER_ENTERED');
    expect(payload.data[0].range).toBe('clients!A2:D2');
    expect(payload.data[0].values[0]).toEqual([
      'CLI-1',
      'Ana Gómez',
      '099111222',
      '2026-11-22T22:00:00.000Z',
    ]);
    expect(payload.data[1].range).toBe('orders!A2:T2');
    expect(payload.data[1].values[0][11]).toBe(3000); // price is numeric
    expect(payload.data[4].range).toBe('expenses!A2:F2');
    expect(payload.data[4].values[0]).toEqual([
      'EXP-1',
      'Compra de repuestos',
      'Repuestos',
      1200,
      '2026-11-21',
      '2026-11-22T22:00:00.000Z',
    ]);
  });

  it('is 100% idempotent: skips all writes when sheet already matches CRM data', async () => {
    const calls: string[] = [];
    const fetchMock = (async (input: RequestInfo | URL) => {
      const url = String(input);
      calls.push(url);
      return new Response(
        JSON.stringify({
          valueRanges: [
            { values: [['CLI-1', 'Ana Gómez', '099111222', '2026-11-20T10:00:00.000Z']] },
            {
              values: [
                [
                  'ORD-1',
                  'CLI-1',
                  'Lavarropas Samsung',
                  'Taller',
                  'Av. Italia 1234',
                  'No centrifuga',
                  'Bomba obstruida',
                  'Bomba desagote',
                  1200,
                  1800,
                  3000,
                  3000,
                  1500,
                  'En reparación',
                  'Pendiente',
                  '2026-11-20',
                  '',
                  'Rodrigo',
                  '',
                  '2026-11-20T10:00:00.000Z',
                ],
              ],
            },
            {
              values: [
                [
                  'LEAD-1',
                  'Carlos Ruiz',
                  '098333444',
                  'Heladera no enfría',
                  '2026-11-21',
                  'WhatsApp',
                  'Nuevo',
                  '2026-11-21T10:00:00.000Z',
                ],
              ],
            },
            { values: [['PAY-1', 'ORD-1', 1500, '2026-11-21', '2026-11-21T10:00:00.000Z']] },
            {
              values: [
                [
                  'EXP-1',
                  'Compra de repuestos',
                  'Repuestos',
                  1200,
                  '2026-11-21',
                  '2026-11-21T10:00:00.000Z',
                ],
              ],
            },
            {
              values: [
                [
                  'PART-1',
                  'Bomba desagote',
                  1200,
                  1800,
                  'Repuestos Sur',
                  '2026-11-21',
                  'ORD-1',
                  1,
                  '2026-11-21T10:00:00.000Z',
                ],
              ],
            },
          ],
        }),
        { status: 200 },
      );
    }) as typeof fetch;

    const result = await syncDataToGoogleSheets({
      accessToken: 'tok-1',
      spreadsheetId: '1mQWfNTI5Ca9EDRW0zI68Vfz9ypNWNMZAPQS97qbf1ZQ',
      data: SAMPLE_DATA,
      fetchImpl: fetchMock,
      now: () => new Date('2026-11-22T23:00:00.000Z'),
    });

    expect(result.status).toBe('up-to-date');
    expect(result.updatedTabs).toEqual([]);
    expect(calls).toHaveLength(1); // Only batchGet, ZERO writes!
  });

  it('clears only trailing rows when data shrinks and throws GoogleAuthExpiredError on 401', async () => {
    const clearBodies: unknown[] = [];
    const fetchShrink = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes('values:batchGet')) {
        return new Response(
          JSON.stringify({
            valueRanges: [
              { values: [['CLI-1', 'Ana', '099', '2026-11-20T00:00:00.000Z']] },
              {},
              {},
              {},
              {},
              {},
            ],
          }),
          { status: 200 },
        );
      }
      if (url.includes('values:batchClear')) {
        clearBodies.push(JSON.parse(String(init?.body)));
      }
      return new Response(JSON.stringify({}), { status: 200 });
    }) as typeof fetch;

    const shrinkResult = await syncDataToGoogleSheets({
      accessToken: 'tok-1',
      spreadsheetId: '1mQWfNTI5Ca9EDRW0zI68Vfz9ypNWNMZAPQS97qbf1ZQ',
      data: EMPTY_DATA,
      fetchImpl: fetchShrink,
    });
    expect(shrinkResult.status).toBe('synced');
    expect(shrinkResult.updatedTabs).toEqual(['clients']);
    expect(clearBodies).toEqual([{ ranges: ['clients!A2:D2'] }]);

    const fetch401 = (async () => new Response('{}', { status: 401 })) as typeof fetch;
    await expect(
      syncDataToGoogleSheets({
        accessToken: 'expired',
        spreadsheetId: '1mQWfNTI5Ca9EDRW0zI68Vfz9ypNWNMZAPQS97qbf1ZQ',
        data: EMPTY_DATA,
        fetchImpl: fetch401,
      }),
    ).rejects.toBeInstanceOf(GoogleAuthExpiredError);
  });
});
