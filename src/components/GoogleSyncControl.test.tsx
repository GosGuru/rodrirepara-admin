import { describe, expect, it } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { EMPTY_DATA } from '../repository';
import type { GoogleSyncController } from '../hooks/useGoogleSync';
import { Header } from '../Header';
import { GoogleSyncControl } from './GoogleSyncControl';

function makeController(overrides: Partial<GoogleSyncController> = {}): GoogleSyncController {
  return {
    configured: true,
    connected: false,
    busy: false,
    status: 'idle',
    statusMessage: '',
    errorMessage: '',
    lastSyncedAt: null,
    lastPdfLink: null,
    lastPdfName: null,
    spreadsheetId: '1mQWfNTI5Ca9EDRW0zI68Vfz9ypNWNMZAPQS97qbf1ZQ',
    spreadsheetUrl:
      'https://docs.google.com/spreadsheets/d/1mQWfNTI5Ca9EDRW0zI68Vfz9ypNWNMZAPQS97qbf1ZQ/edit',
    connectAndSync: async () => {},
    syncNow: async () => {},
    syncAfterMutation: () => {},
    exportPdfToDrive: async () => null,
    disconnect: async () => {},
    updateSpreadsheetId: () => true,
    ...overrides,
  };
}

describe('GoogleSyncControl', () => {
  it('renders accessible disconnected trigger with aria-label', () => {
    const html = renderToStaticMarkup(
      <GoogleSyncControl sync={makeController()} data={EMPTY_DATA} />,
    );
    expect(html).toContain('aria-label="Respaldo en Google Sheets y Google Drive"');
    expect(html).toContain('Google Sheets');
    expect(html).not.toContain('gsync-trigger--connected');
  });

  it('renders active connected state inside Header chrome', () => {
    const html = renderToStaticMarkup(
      <Header
        view="Resumen"
        dashboardChrome
        data={EMPTY_DATA}
        googleSync={makeController({
          connected: true,
          status: 'up-to-date',
          statusMessage: 'Todo al día · 22:15',
        })}
        onCreateRepair={() => {}}
        onCreateExpense={() => {}}
      />,
    );
    expect(html).toContain('Sheets activo');
    expect(html).toContain('gsync-trigger--connected');
  });
});
