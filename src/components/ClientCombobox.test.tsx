import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { ClientCombobox, filterClients } from './ClientCombobox';

const sampleClients = [
  { id: 'c1', name: 'María Pérez', phone: '099 555 555' },
  { id: 'c2', name: 'Juan Gómez', phone: '099 333 333' },
  { id: 'c3', name: 'Pedro Silva', phone: '099 444 444' },
];

describe('ClientCombobox', () => {
  test('filters clients accent-insensitively by name or phone', () => {
    expect(filterClients(sampleClients, 'maria').map((c) => c.id)).toEqual(['c1']);
    expect(filterClients(sampleClients, 'GOMEZ').map((c) => c.id)).toEqual(['c2']);
    expect(filterClients(sampleClients, '444').map((c) => c.id)).toEqual(['c3']);
    expect(filterClients(sampleClients, '   ').map((c) => c.id)).toEqual(['c1', 'c2', 'c3']);
    expect(filterClients(sampleClients, 'inexistente')).toEqual([]);
  });

  test('renders unified searchable combobox without native select and keeps Agregar cliente visible', () => {
    const html = renderToStaticMarkup(
      <ClientCombobox
        id="repair-client"
        clients={sampleClients}
        value="c1"
        onChange={() => {}}
        onAddClient={() => {}}
      />,
    );
    expect(html).not.toContain('<select');
    expect(html).toContain('role="combobox"');
    expect(html).toContain('Buscar por nombre o teléfono');
    expect(html).toContain('María Pérez · 099 555 555');
    expect(html).toContain('Agregar cliente');
    expect(html).toContain('name="client"');
    expect(html).toContain('value="c1"');
  });

  test('exposes error state with aria-invalid when validation fails', () => {
    const html = renderToStaticMarkup(
      <ClientCombobox
        id="repair-client"
        clients={sampleClients}
        value=""
        error
        onChange={() => {}}
        onAddClient={() => {}}
      />,
    );
    expect(html).toContain('aria-invalid="true"');
  });
});
