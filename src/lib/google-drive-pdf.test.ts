import { describe, expect, it } from 'bun:test';
import { EMPTY_DATA, type Data } from '../repository';
import { GoogleAuthExpiredError } from './google-auth';
import {
  buildPdfFileName,
  buildSummaryPdf,
  DRIVE_BACKUP_FOLDER_NAME,
  exportSummaryPdfToDrive,
} from './google-drive-pdf';

const SAMPLE_DATA: Data = {
  ...EMPTY_DATA,
  clients: [{ id: 'CLI-1', name: 'María Pérez', phone: '099111222' }],
  orders: [
    {
      id: 'ORD-10',
      clientId: 'CLI-1',
      equipment: 'Heladera LG',
      mode: 'Domicilio',
      address: 'Bvar. Artigas 500',
      fault: 'No enfría',
      diagnosis: 'Gas bajo',
      parts: 'Gas R600',
      partsCost: 800,
      labor: 2200,
      quote: 3000,
      price: 3000,
      paid: 2000,
      repair: 'Listo',
      delivery: 'Pendiente',
      entry: '2026-11-22',
      finish: '',
      owner: 'Rodrigo',
      originalId: '',
    },
  ],
  expenses: [
    {
      id: 'EXP-1',
      description: 'Compra de gas refrigerante',
      category: 'Insumos',
      amount: 800,
      date: '2026-11-22',
    },
  ],
};

describe('google-drive-pdf', () => {
  it('builds a valid PDF 1.4 binary with KPIs, orders, and expenses', () => {
    const bytes = buildSummaryPdf(SAMPLE_DATA, new Date('2026-11-22T22:15:00-03:00'));
    const text = new TextDecoder().decode(bytes);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('RODRIGO REPARA - RESUMEN OPERATIVO Y FINANCIERO');
    expect(text).toContain('ORD-10');
    expect(text).toContain('Heladera LG');
    expect(text).toContain('Compra de gas refrigerante');
    expect(text.trimEnd().endsWith('%%EOF')).toBe(true);
  });

  it('creates backup folder when missing and uploads PDF via multipart request', async () => {
    const requests: Array<{ url: string; method: string; contentType: string }> = [];
    const fetchMock = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? 'GET';
      const headers = (init?.headers ?? {}) as Record<string, string>;
      requests.push({ url, method, contentType: headers['Content-Type'] ?? '' });

      if (method === 'GET' && url.includes('/drive/v3/files')) {
        return new Response(JSON.stringify({ files: [] }), { status: 200 });
      }
      if (method === 'POST' && url.includes('/drive/v3/files?fields=id')) {
        return new Response(JSON.stringify({ id: 'folder-99' }), { status: 200 });
      }
      if (method === 'POST' && url.includes('uploadType=multipart')) {
        return new Response(
          JSON.stringify({
            id: 'pdf-123',
            name: buildPdfFileName(new Date('2026-11-22T22:15:00')),
            webViewLink: 'https://drive.google.com/file/d/pdf-123/view',
          }),
          { status: 200 },
        );
      }
      return new Response('{}', { status: 500 });
    }) as typeof fetch;

    const result = await exportSummaryPdfToDrive({
      accessToken: 'tok-1',
      data: SAMPLE_DATA,
      fetchImpl: fetchMock,
      now: () => new Date('2026-11-22T22:15:00'),
    });

    expect(result.fileId).toBe('pdf-123');
    expect(result.folderId).toBe('folder-99');
    expect(result.webViewLink).toBe('https://drive.google.com/file/d/pdf-123/view');
    expect(requests).toHaveLength(3);
    expect(new URL(requests[0].url).searchParams.get('q')).toContain(DRIVE_BACKUP_FOLDER_NAME);
    expect(requests[2].contentType).toContain('multipart/related');
  });

  it('throws GoogleAuthExpiredError when Drive returns 401', async () => {
    const fetch401 = (async () => new Response('{}', { status: 401 })) as typeof fetch;
    await expect(
      exportSummaryPdfToDrive({
        accessToken: 'expired',
        data: SAMPLE_DATA,
        fetchImpl: fetch401,
      }),
    ).rejects.toBeInstanceOf(GoogleAuthExpiredError);
  });
});
