import type { Data } from '../repository';
import { GoogleAuthExpiredError } from './google-auth';

export const DRIVE_BACKUP_FOLDER_NAME = 'Rodrigo Repara - Respaldos PDF';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3/files';

export type DrivePdfUploadResult = {
  fileId: string;
  name: string;
  webViewLink: string;
  folderId: string;
};

function formatCurrency(value: number): string {
  return `$ ${Math.round(value).toLocaleString('es-UY')}`;
}

function formatReportTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

export function buildPdfFileName(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const ymd = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const hm = `${pad(date.getHours())}${pad(date.getMinutes())}`;
  return `Rodrigo-Repara-Resumen-${ymd}-${hm}.pdf`;
}

// Encode text as WinAnsi (ISO-8859-1 subset) hex/escaped bytes for PDF Type1 Helvetica.
function escapePdfText(input: string): string {
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if (code === 0x28 || code === 0x29 || code === 0x5c) {
      out += `\\${input[i]}`;
    } else if (code >= 0x20 && code <= 0x7e) {
      out += input[i];
    } else if (code >= 0xa0 && code <= 0xff) {
      out += `\\${code.toString(8).padStart(3, '0')}`;
    } else if (code === 0x2022) {
      out += '\\225'; // bullet in WinAnsi
    } else if (code === 0x2013 || code === 0x2014) {
      out += '-';
    } else {
      out += ' ';
    }
  }
  return out;
}

function truncate(value: string, max: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, Math.max(1, max - 3))}...`;
}

type PdfLine = {
  text: string;
  size: number;
  bold?: boolean;
  gapAfter?: number;
};

function buildReportLines(data: Data, generatedAt: Date): PdfLine[] {
  const clientById = new Map(data.clients.map((c) => [c.id, c.name]));
  const totalFacturado = data.orders.reduce((sum, o) => sum + (o.price ?? o.quote ?? 0), 0);
  const totalCobrado = data.orders.reduce((sum, o) => sum + o.paid, 0);
  const saldoPendiente = Math.max(0, totalFacturado - totalCobrado);
  const totalGastos = data.expenses.reduce((sum, e) => sum + e.amount, 0);
  const flujoNeto = totalCobrado - totalGastos;
  const pendientesEntrega = data.orders.filter((o) => o.delivery === 'Pendiente').length;
  const entregadas = data.orders.filter((o) => o.delivery === 'Entregado').length;

  const lines: PdfLine[] = [
    { text: 'RODRIGO REPARA - RESUMEN OPERATIVO Y FINANCIERO', size: 15, bold: true, gapAfter: 6 },
    {
      text: `Generado: ${formatReportTimestamp(generatedAt)}   |   Respaldo automático desde CRM Web`,
      size: 9,
      gapAfter: 16,
    },
    { text: '1. INDICADORES CLAVE', size: 12, bold: true, gapAfter: 6 },
    {
      text: `Facturación total: ${formatCurrency(totalFacturado)}    |    Total cobrado: ${formatCurrency(totalCobrado)}    |    Saldo pendiente: ${formatCurrency(saldoPendiente)}`,
      size: 10,
      gapAfter: 4,
    },
    {
      text: `Total gastos: ${formatCurrency(totalGastos)}    |    Flujo neto (cobros - gastos): ${formatCurrency(flujoNeto)}`,
      size: 10,
      gapAfter: 4,
    },
    {
      text: `Órdenes: ${data.orders.length} (${pendientesEntrega} pendientes, ${entregadas} entregadas)    |    Clientes: ${data.clients.length}    |    Gastos: ${data.expenses.length}`,
      size: 10,
      gapAfter: 16,
    },
    { text: `2. ÓRDENES DE TRABAJO (${data.orders.length})`, size: 12, bold: true, gapAfter: 6 },
  ];

  if (data.orders.length === 0) {
    lines.push({ text: 'Sin órdenes registradas todavía.', size: 10, gapAfter: 14 });
  } else {
    for (const order of data.orders) {
      const clientName = clientById.get(order.clientId) ?? order.clientId;
      const amount = order.price ?? order.quote;
      lines.push({
        text: `${order.id}  |  ${truncate(clientName, 22)}  |  ${truncate(order.equipment, 24)}  |  ${order.repair} (${order.delivery})`,
        size: 9,
        bold: true,
        gapAfter: 2,
      });
      lines.push({
        text: `   Ingreso: ${order.entry}  |  Total: ${formatCurrency(amount)}  |  Cobrado: ${formatCurrency(order.paid)}  |  Falla: ${truncate(order.fault, 38)}`,
        size: 8.5,
        gapAfter: 6,
      });
    }
    lines.push({ text: '', size: 8, gapAfter: 8 });
  }

  lines.push({ text: `3. GASTOS REGISTRADOS (${data.expenses.length})`, size: 12, bold: true, gapAfter: 6 });

  if (data.expenses.length === 0) {
    lines.push({ text: 'Sin gastos registrados todavía.', size: 10, gapAfter: 10 });
  } else {
    for (const exp of data.expenses) {
      lines.push({
        text: `${exp.date}  |  ${truncate(exp.category, 18)}  |  ${truncate(exp.description, 38)}  |  ${formatCurrency(exp.amount)}`,
        size: 9,
        gapAfter: 4,
      });
    }
  }

  return lines;
}

function paginateLines(lines: PdfLine[]): string[] {
  const pageHeight = 842; // A4
  const marginTop = 52;
  const marginBottom = 48;
  const marginLeft = 44;

  const pages: string[] = [];
  let commands: string[] = [];
  let y = pageHeight - marginTop;

  const flushPage = () => {
    if (commands.length > 0) {
      pages.push(commands.join('\n'));
      commands = [];
    }
    y = pageHeight - marginTop;
  };

  for (const line of lines) {
    const lineHeight = line.size + (line.gapAfter ?? 4);
    if (y - lineHeight < marginBottom) {
      flushPage();
    }
    if (line.text.length > 0) {
      const font = line.bold ? 'F2' : 'F1';
      commands.push(
        `BT /${font} ${line.size} Tf 1 0 0 1 ${marginLeft} ${y.toFixed(1)} Tm (${escapePdfText(line.text)}) Tj ET`,
      );
    }
    y -= lineHeight;
  }

  flushPage();
  return pages.length > 0 ? pages : ['BT /F1 11 Tf 1 0 0 1 44 790 Tm (Rodrigo Repara) Tj ET'];
}

export function buildSummaryPdf(data: Data, generatedAt: Date = new Date()): Uint8Array {
  const pageStreams = paginateLines(buildReportLines(data, generatedAt));
  const objects: string[] = [];

  // 1: Catalog, 2: Pages, 3: Helvetica, 4: Helvetica-Bold
  const firstPageObjId = 5;
  const pageObjIds: number[] = [];

  for (let i = 0; i < pageStreams.length; i++) {
    pageObjIds.push(firstPageObjId + i * 2);
  }

  objects.push('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
  objects.push(
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjIds.length} >>\nendobj\n`,
  );
  objects.push(
    '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>\nendobj\n',
  );
  objects.push(
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>\nendobj\n',
  );

  for (let i = 0; i < pageStreams.length; i++) {
    const pageId = firstPageObjId + i * 2;
    const contentId = pageId + 1;
    const stream = pageStreams[i];
    objects.push(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`,
    );
    objects.push(
      `${contentId} 0 obj\n<< /Length ${stream.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
    );
  }

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let byteOffset = 0;

  const pushText = (text: string) => {
    const bytes = encoder.encode(text);
    chunks.push(bytes);
    byteOffset += bytes.length;
  };

  pushText('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');

  for (const obj of objects) {
    offsets.push(byteOffset);
    pushText(obj);
  }

  const xrefOffset = byteOffset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  pushText(xref);

  const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLength);
  let cursor = 0;
  for (const chunk of chunks) {
    result.set(chunk, cursor);
    cursor += chunk.length;
  }
  return result;
}

async function ensureBackupFolder(
  accessToken: string,
  folderName: string,
  fetchImpl: typeof fetch,
): Promise<string> {
  const escaped = folderName.replace(/'/g, "\\'");
  const q = `mimeType='application/vnd.google-apps.folder' and name='${escaped}' and trashed=false`;
  const searchParams = new URLSearchParams({
    q,
    fields: 'files(id,name)',
    pageSize: '1',
  });

  const searchRes = await fetchImpl(`${DRIVE_API_BASE}?${searchParams.toString()}`, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (searchRes.status === 401) throw new GoogleAuthExpiredError();
  if (!searchRes.ok) {
    throw new Error(`No se pudo consultar Google Drive (HTTP ${searchRes.status}).`);
  }

  const searchJson = (await searchRes.json()) as { files?: Array<{ id?: string }> };
  if (searchJson.files?.[0]?.id) {
    return searchJson.files[0].id;
  }

  const createRes = await fetchImpl(`${DRIVE_API_BASE}?fields=id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (createRes.status === 401) throw new GoogleAuthExpiredError();
  if (!createRes.ok) {
    throw new Error(`No se pudo crear la carpeta en Google Drive (HTTP ${createRes.status}).`);
  }

  const created = (await createRes.json()) as { id?: string };
  if (!created.id) {
    throw new Error('Google Drive no devolvió el ID de la carpeta creada.');
  }
  return created.id;
}

function buildMultipartBody(
  metadata: Record<string, unknown>,
  pdfBytes: Uint8Array,
  boundary: string,
): Uint8Array {
  const encoder = new TextEncoder();
  const preamble = encoder.encode(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(
      metadata,
    )}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`,
  );
  const epilogue = encoder.encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(preamble.length + pdfBytes.length + epilogue.length);
  body.set(preamble, 0);
  body.set(pdfBytes, preamble.length);
  body.set(epilogue, preamble.length + pdfBytes.length);
  return body;
}

export async function exportSummaryPdfToDrive(options: {
  accessToken: string;
  data: Data;
  folderName?: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}): Promise<DrivePdfUploadResult> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const nowDate = (options.now ?? (() => new Date()))();
  const folderName = options.folderName ?? DRIVE_BACKUP_FOLDER_NAME;

  const folderId = await ensureBackupFolder(options.accessToken, folderName, fetchImpl);
  const fileName = buildPdfFileName(nowDate);
  const pdfBytes = buildSummaryPdf(options.data, nowDate);

  const boundary = `rodrigo_pdf_${nowDate.getTime()}`;
  const multipartBody = buildMultipartBody(
    {
      name: fileName,
      mimeType: 'application/pdf',
      parents: [folderId],
    },
    pdfBytes,
    boundary,
  );

  const uploadRes = await fetchImpl(
    `${DRIVE_UPLOAD_BASE}?uploadType=multipart&fields=id,name,webViewLink`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartBody as unknown as BodyInit,
    },
  );

  if (uploadRes.status === 401) throw new GoogleAuthExpiredError();
  if (!uploadRes.ok) {
    throw new Error(`No se pudo subir el PDF a Google Drive (HTTP ${uploadRes.status}).`);
  }

  const uploaded = (await uploadRes.json()) as {
    id?: string;
    name?: string;
    webViewLink?: string;
  };
  if (!uploaded.id) {
    throw new Error('Google Drive no devolvió el archivo subido.');
  }

  return {
    fileId: uploaded.id,
    name: uploaded.name || fileName,
    webViewLink: uploaded.webViewLink || `https://drive.google.com/file/d/${uploaded.id}/view`,
    folderId,
  };
}
