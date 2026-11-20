import { describe, expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  SettingsDrawerBody,
  SettingsDrawerFooter,
  SettingsDrawerHeader,
} from './SettingsDrawer';
import { defaultColors } from '../../views/kanban-color-settings';

const noop = () => {};

describe('SettingsDrawer', () => {
  test('renders Apple-grade header with exact title, subtitle, and close button', () => {
    const html = renderToStaticMarkup(<SettingsDrawerHeader onClose={noop} />);
    expect(html).toContain('Configuración y módulos');
    expect(html).toContain('Personalizá Rodrigo Repara según tu forma de trabajar.');
    expect(html).toContain('aria-label="Cerrar configuración"');
  });

  test('renders 3 core sections without native selects, fake toggles, or invented modules', () => {
    const html = renderToStaticMarkup(
      <SettingsDrawerBody
        draftColors={defaultColors}
        activeStage={null}
        isDirty={false}
        isDefault={true}
        onOpenModule={noop}
        onQuickAction={noop}
        onStageToggle={noop}
        onResetDefaults={noop}
      />,
    );

    // 3 sections
    expect(html).toContain('Módulos del sistema');
    expect(html).toContain('Acciones rápidas');
    expect(html).toContain('Colores del tablero');

    // Modules: Consultas (Próximamente) & Repuestos (Disponible)
    expect(html).toContain('Consultas');
    expect(html).toContain('Próximamente');
    expect(html).toContain('Repuestos');
    expect(html).toContain('Disponible');

    // Quick actions
    expect(html).toContain('Nuevo cliente');
    expect(html).toContain('Registrar gasto');
    expect(html).toContain('Nueva reparación');

    // Board color rows + HEX + preview + reset button
    expect(html).toContain('Pendientes');
    expect(html).toContain('#D97706');
    expect(html).toContain('En proceso');
    expect(html).toContain('#2563EB');
    expect(html).toContain('Listos');
    expect(html).toContain('#15803D');
    expect(html).toContain('Vista previa');
    expect(html).toContain('Restablecer colores predeterminados');

    // Strict exclusions: no native select, no fake checkboxes/switches, no unrequested settings
    expect(html).not.toContain('<select');
    expect(html).not.toContain('role="switch"');
    expect(html).not.toContain('type="checkbox"');
    expect(html).not.toContain('Apariencia');
    expect(html).not.toContain('Notificaciones');
    expect(html).not.toContain('Equipo y acceso');
  });

  test('shows dirty badge on preview and error alert when save fails', () => {
    const html = renderToStaticMarkup(
      <SettingsDrawerBody
        draftColors={{ ...defaultColors, pending: '#7C3AED' }}
        activeStage="pending"
        isDirty={true}
        isDefault={false}
        saveError="No se pudieron guardar los colores en este navegador."
        onOpenModule={noop}
        onQuickAction={noop}
        onStageToggle={noop}
        onResetDefaults={noop}
      />,
    );

    expect(html).toContain('#7C3AED');
    expect(html).toContain('Sin guardar');
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('No se pudieron guardar los colores en este navegador.');
  });

  test('footer renders profile, Cancelar, universal SaveButton states, and unsaved guard', () => {
    const idleHtml = renderToStaticMarkup(
      <SettingsDrawerFooter
        isDirty={true}
        hasInvalidHex={false}
        saveStatus="idle"
        busy={false}
        pendingExit={null}
        onKeepEditing={noop}
        onDiscard={noop}
        onCancel={noop}
        onSave={noop}
      />,
    );
    expect(idleHtml).toContain('Rodrigo');
    expect(idleHtml).toContain('Administrador');
    expect(idleHtml).toContain('Cancelar');
    expect(idleHtml).toContain('Guardar cambios');
    expect(idleHtml).toContain('ui-save-btn');
    expect(idleHtml).not.toContain('Tenés cambios de colores sin guardar.');

    const dirtyGuardHtml = renderToStaticMarkup(
      <SettingsDrawerFooter
        isDirty={true}
        hasInvalidHex={false}
        saveStatus="idle"
        busy={false}
        pendingExit={{ type: 'close' }}
        onKeepEditing={noop}
        onDiscard={noop}
        onCancel={noop}
        onSave={noop}
      />,
    );
    expect(dirtyGuardHtml).toContain('Tenés cambios de colores sin guardar.');
    expect(dirtyGuardHtml).toContain('Seguir editando');
    expect(dirtyGuardHtml).toContain('Descartar cambios');

    const successHtml = renderToStaticMarkup(
      <SettingsDrawerFooter
        isDirty={true}
        hasInvalidHex={false}
        saveStatus="success"
        busy={true}
        pendingExit={null}
        onKeepEditing={noop}
        onDiscard={noop}
        onCancel={noop}
        onSave={noop}
      />,
    );
    expect(successHtml).toContain('data-status="success"');
    expect(successHtml).toContain('Guardado');
  });
});
