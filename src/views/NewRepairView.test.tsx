import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { NewRepairView } from './NewRepairView';

const sampleClients = [
  { id: 'c1', name: 'Juan', phone: '099 333 333' },
  { id: 'c2', name: 'María', phone: '099 555 555' },
];

describe('NewRepairView', () => {
  test('renders dedicated creation view with Back button, all real fields, custom controls, and SaveButton', () => {
    const html = renderToStaticMarkup(
      <NewRepairView
        clients={sampleClients}
        onBack={() => {}}
        onCreateClient={async () => 'c3'}
        onSaveRepair={async () => {}}
        onClientCreated={() => {}}
        onRepairSaved={() => {}}
      />,
    );
    expect(html).toContain('Volver');
    expect(html).toContain('Nueva reparación');
    expect(html).toContain('Crear una nueva orden de trabajo');
    expect(html).toContain('Cliente');
    expect(html).toContain('Agregar cliente');
    expect(html).toContain('Equipo y modelo');
    expect(html).toContain('Modalidad');
    expect(html).toContain('Fecha de ingreso');
    expect(html).toContain('Dirección o recepción');
    expect(html).toContain('Falla informada');
    expect(html).toContain('Cancelar');
    expect(html).toContain('Guardar reparación');
    // Must use custom Select, custom DatePicker, and Searchable Combobox — zero native select/date inputs
    expect(html).not.toContain('<select');
    expect(html).not.toContain('type="date"');
    // Must not render nested forms or stacked dialogs
    expect(html).not.toContain('<dialog');
  });

  test('renders inline Nuevo cliente subflow step without stacked dialogs', () => {
    const html = renderToStaticMarkup(
      <NewRepairView
        clients={sampleClients}
        initialStep="client"
        onBack={() => {}}
        onCreateClient={async () => 'c3'}
        onSaveRepair={async () => {}}
        onClientCreated={() => {}}
        onRepairSaved={() => {}}
      />,
    );
    expect(html).toContain('Volver a la reparación');
    expect(html).toContain('Nuevo cliente');
    expect(html).toContain('Agregar un cliente a tu base');
    expect(html).toContain('Nombre');
    expect(html).toContain('Teléfono');
    expect(html).toContain('Cancelar');
    expect(html).toContain('Guardar cliente');
    expect(html).not.toContain('<dialog');
  });
});
