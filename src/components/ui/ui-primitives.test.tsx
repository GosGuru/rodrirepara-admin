import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { SaveButton } from './SaveButton';
import { Toast } from './Toast';
import { Select } from './Select';
import { DatePicker } from './DatePicker';

describe('SaveButton', () => {
  test('renders idle, saving, success, and error states with stable width sizers and aria-busy', () => {
    const idle = renderToStaticMarkup(<SaveButton status="idle" idleLabel="Guardar reparación" />);
    expect(idle).toContain('Guardar reparación');
    expect(idle).toContain('data-status="idle"');
    expect(idle).not.toContain('disabled=""');

    const saving = renderToStaticMarkup(<SaveButton status="saving" idleLabel="Guardar reparación" />);
    expect(saving).toContain('Guardando...');
    expect(saving).toContain('aria-busy="true"');
    expect(saving).toContain('disabled=""');
    expect(saving).toContain('data-status="saving"');

    const success = renderToStaticMarkup(<SaveButton status="success" idleLabel="Guardar reparación" />);
    expect(success).toContain('Guardado');
    expect(success).toContain('data-status="success"');
    expect(success).toContain('ui-save-btn__check');

    const error = renderToStaticMarkup(<SaveButton status="error" idleLabel="Guardar reparación" />);
    expect(error).toContain('Guardar reparación');
    expect(error).toContain('data-status="error"');
    expect(error).not.toContain('disabled=""');
  });
});

describe('Toast', () => {
  test('renders accessible status role with message and dismiss button', () => {
    const html = renderToStaticMarkup(
      <Toast message="Reparación registrada correctamente." onDismiss={() => {}} />,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('tabindex="-1"');
    expect(html).toContain('Reparación registrada correctamente.');
    expect(html).toContain('Cerrar aviso');
  });
});

describe('Custom Select', () => {
  test('renders accessible combobox without native select element and exposes current value', () => {
    const html = renderToStaticMarkup(
      <Select
        id="mode-field"
        name="mode"
        value="Taller"
        onChange={() => {}}
        options={[
          { value: 'Taller', label: 'Taller' },
          { value: 'Domicilio', label: 'Domicilio' },
        ]}
      />,
    );
    expect(html).not.toContain('<select');
    expect(html).toContain('role="combobox"');
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('Taller');
    expect(html).toContain('type="hidden"');
    expect(html).toContain('name="mode"');
    expect(html).toContain('value="Taller"');
  });
});

describe('Custom DatePicker', () => {
  test('renders Uruguayan dd/mm/aaaa display without native date input and syncs hidden ISO value', () => {
    const html = renderToStaticMarkup(
      <DatePicker id="entry-date" name="date" value="2026-11-19" onChange={() => {}} />,
    );
    expect(html).not.toContain('type="date"');
    expect(html).toContain('value="19/11/2026"');
    expect(html).toContain('name="date"');
    expect(html).toContain('value="2026-11-19"');
    expect(html).toContain('Abrir calendario');
  });
});
