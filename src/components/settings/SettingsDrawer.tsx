import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Layers,
  LogOut,
  MessagesSquare,
  Package,
  Palette,
  Receipt,
  RotateCcw,
  Settings,
  UserPlus,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { SideSheet } from '../SideSheet';
import { SaveButton } from '../ui/SaveButton';
import { useSaveFeedback } from '../../hooks/useSaveFeedback';
import {
  defaultColors,
  resolveStageColorTokens,
  STAGE_META,
  stageColorsEqual,
  type Stage,
  type StageColors,
} from '../../views/kanban-color-settings';
import { ColorPickerPopover } from './ColorPickerPopover';
import './settings-drawer.css';

export type SettingsDrawerProps = {
  open: boolean;
  colors: StageColors;
  onSaveColors: (next: StageColors) => Promise<void> | void;
  onColorsSaved?: () => void;
  onOpenModule: (moduleView: 'Consultas' | 'Repuestos') => void;
  onCreateClient: () => void;
  onCreateExpense: () => void;
  onCreateRepair: () => void;
  onClose: () => void;
  userEmail?: string;
  onSignOut?: () => Promise<void> | void;
};

type PendingExitAction =
  | { type: 'close' }
  | { type: 'module'; view: 'Consultas' | 'Repuestos' }
  | { type: 'action'; action: 'client' | 'expense' | 'repair' };

const STAGE_ICONS: Record<Stage, typeof Clock> = {
  pending: Clock,
  progress: Wrench,
  ready: CheckCircle2,
};

export function SettingsDrawer({
  open,
  colors,
  onSaveColors,
  onColorsSaved,
  onOpenModule,
  onCreateClient,
  onCreateExpense,
  onCreateRepair,
  onClose,
  userEmail,
  onSignOut,
}: SettingsDrawerProps) {
  const [draftColors, setDraftColors] = useState<StageColors>(colors);
  const [activeStage, setActiveStage] = useState<Stage | null>(null);
  const [hasInvalidHex, setHasInvalidHex] = useState(false);
  const [pendingExit, setPendingExit] = useState<PendingExitAction | null>(null);

  const stageRefs = useRef<Record<Stage, HTMLButtonElement | null>>({
    pending: null,
    progress: null,
    ready: null,
  });
  const activeAnchorRef = useRef<HTMLButtonElement | null>(null);

  const save = useSaveFeedback({
    successHoldMs: 740,
    defaultError:
      'No se pudieron guardar los colores en este navegador. Revisá el espacio disponible y volvé a intentar.',
  });

  // Reset draft whenever drawer opens or saved colors change while closed
  useEffect(() => {
    if (open) {
      setDraftColors(colors);
      setActiveStage(null);
      setHasInvalidHex(false);
      setPendingExit(null);
      save.reset();
    }
  }, [open, colors, save.reset]);

  const isDirty = !stageColorsEqual(draftColors, colors);
  const isDefault = stageColorsEqual(draftColors, defaultColors);

  const executeExit = useCallback(
    (action: PendingExitAction) => {
      setActiveStage(null);
      setPendingExit(null);
      setHasInvalidHex(false);
      setDraftColors(colors);
      save.reset();

      if (action.type === 'close') {
        onClose();
      } else if (action.type === 'module') {
        onClose();
        onOpenModule(action.view);
      } else if (action.action === 'client') {
        onClose();
        onCreateClient();
      } else if (action.action === 'expense') {
        onClose();
        onCreateExpense();
      } else {
        onClose();
        onCreateRepair();
      }
    },
    [colors, onClose, onCreateClient, onCreateExpense, onCreateRepair, onOpenModule, save],
  );

  const requestExit = useCallback(
    (action: PendingExitAction) => {
      if (save.busy) return;
      if (isDirty) {
        setActiveStage(null);
        setPendingExit(action);
        return;
      }
      executeExit(action);
    },
    [executeExit, isDirty, save.busy],
  );

  function handleStageToggle(stage: Stage) {
    if (save.busy) return;
    if (activeStage === stage) {
      setActiveStage(null);
      setHasInvalidHex(false);
      return;
    }
    activeAnchorRef.current = stageRefs.current[stage];
    setHasInvalidHex(false);
    setPendingExit(null);
    setActiveStage(stage);
  }

  function handleStageColorChange(stage: Stage, hex: string) {
    setDraftColors((prev) => ({ ...prev, [stage]: hex }));
    setPendingExit(null);
    if (save.status === 'error') save.reset();
  }

  function handleResetDefaults() {
    if (save.busy || isDefault) return;
    setDraftColors({ ...defaultColors });
    setHasInvalidHex(false);
    setPendingExit(null);
    if (save.status === 'error') save.reset();
  }

  async function handleSave() {
    if (save.busy || !isDirty || hasInvalidHex) return;
    setActiveStage(null);
    setPendingExit(null);
    await save.run(
      async () => {
        await onSaveColors(draftColors);
      },
      () => {
        onColorsSaved?.();
        onClose();
      },
    );
  }

  const activeStageMeta = activeStage
    ? STAGE_META.find((item) => item.id === activeStage) ?? null
    : null;

  return (
    <SideSheet
      open={open}
      titleId="app-settings-title"
      className="side-sheet--settings"
      busy={save.busy}
      onRequestClose={() => requestExit({ type: 'close' })}
      header={
        <SettingsDrawerHeader
          busy={save.busy}
          onClose={() => requestExit({ type: 'close' })}
        />
      }
      footer={
        <SettingsDrawerFooter
          isDirty={isDirty}
          hasInvalidHex={hasInvalidHex}
          saveStatus={save.status}
          busy={save.busy}
          pendingExit={pendingExit}
          userEmail={userEmail}
          onSignOut={onSignOut}
          onKeepEditing={() => setPendingExit(null)}
          onDiscard={() => executeExit(pendingExit ?? { type: 'close' })}
          onCancel={() => requestExit({ type: 'close' })}
          onSave={handleSave}
        />
      }
    >
      <SettingsDrawerBody
        draftColors={draftColors}
        activeStage={activeStage}
        isDirty={isDirty}
        isDefault={isDefault}
        busy={save.busy}
        saveError={save.error}
        stageRefs={stageRefs}
        onOpenModule={(moduleView) => requestExit({ type: 'module', view: moduleView })}
        onQuickAction={(action) => requestExit({ type: 'action', action })}
        onStageToggle={handleStageToggle}
        onResetDefaults={handleResetDefaults}
      />

      {activeStage && activeStageMeta && (
        <ColorPickerPopover
          open={open && Boolean(activeStage)}
          stageLabel={activeStageMeta.label}
          value={draftColors[activeStage]}
          anchorRef={activeAnchorRef}
          onChange={(hex) => handleStageColorChange(activeStage, hex)}
          onInvalidChange={setHasInvalidHex}
          onClose={() => {
            setActiveStage(null);
            setHasInvalidHex(false);
          }}
        />
      )}
    </SideSheet>
  );
}

export function SettingsDrawerHeader({
  busy = false,
  onClose,
}: {
  busy?: boolean;
  onClose: () => void;
}) {
  return (
    <div className="cfg-header">
      <div className="cfg-header__lead">
        <span className="cfg-header__icon" aria-hidden="true">
          <Settings size={19} strokeWidth={2} />
        </span>
        <div className="cfg-header__copy">
          <h2 id="app-settings-title">Configuración y módulos</h2>
          <p>Personalizá Rodrigo Repara según tu forma de trabajar.</p>
        </div>
      </div>
      <button
        type="button"
        className="cfg-close-btn"
        disabled={busy}
        onClick={onClose}
        aria-label="Cerrar configuración"
      >
        <X size={18} strokeWidth={2} aria-hidden="true" />
      </button>
    </div>
  );
}

export function SettingsDrawerBody({
  draftColors,
  activeStage,
  isDirty,
  isDefault,
  busy = false,
  saveError = '',
  stageRefs,
  onOpenModule,
  onQuickAction,
  onStageToggle,
  onResetDefaults,
}: {
  draftColors: StageColors;
  activeStage: Stage | null;
  isDirty: boolean;
  isDefault: boolean;
  busy?: boolean;
  saveError?: string;
  stageRefs?: React.MutableRefObject<Record<Stage, HTMLButtonElement | null>>;
  onOpenModule: (moduleView: 'Consultas' | 'Repuestos') => void;
  onQuickAction: (action: 'client' | 'expense' | 'repair') => void;
  onStageToggle: (stage: Stage) => void;
  onResetDefaults: () => void;
}) {
  return (
    <div className="cfg-body">
      {/* 1. Módulos del sistema */}
      <section className="cfg-section" aria-labelledby="cfg-sec-modules">
        <div className="cfg-section__head">
          <span className="cfg-section__icon" aria-hidden="true">
            <Layers size={16} strokeWidth={2} />
          </span>
          <div>
            <h3 id="cfg-sec-modules">Módulos del sistema</h3>
            <p>Accedé a las áreas complementarias de tu taller.</p>
          </div>
        </div>

        <div className="cfg-modules-grid">
          <button
            type="button"
            className="cfg-module-card cfg-module-card--consultas"
            disabled={busy}
            onClick={() => onOpenModule('Consultas')}
          >
            <div className="cfg-module-card__head">
              <span className="cfg-module-card__icon cfg-module-card__icon--lavender" aria-hidden="true">
                <MessagesSquare size={17} strokeWidth={2} />
              </span>
              <div className="cfg-module-card__title-row">
                <strong>Consultas</strong>
                <span className="cfg-pill cfg-pill--soon">Próximamente</span>
              </div>
            </div>
            <p className="cfg-module-card__desc">
              Registro manual activo. Integración con WhatsApp e Instagram próximamente.
            </p>
            <span className="cfg-module-card__link">
              <span>Abrir consultas</span>
              <ChevronRight size={13.5} strokeWidth={2.2} aria-hidden="true" />
            </span>
          </button>

          <button
            type="button"
            className="cfg-module-card cfg-module-card--repuestos"
            disabled={busy}
            onClick={() => onOpenModule('Repuestos')}
          >
            <div className="cfg-module-card__head">
              <span className="cfg-module-card__icon cfg-module-card__icon--blue" aria-hidden="true">
                <Package size={17} strokeWidth={2} />
              </span>
              <div className="cfg-module-card__title-row">
                <strong>Repuestos</strong>
                <span className="cfg-pill cfg-pill--ready">Disponible</span>
              </div>
            </div>
            <p className="cfg-module-card__desc">
              Consultá compras registradas de repuestos y sus órdenes asociadas.
            </p>
            <span className="cfg-module-card__link">
              <span>Abrir repuestos</span>
              <ChevronRight size={13.5} strokeWidth={2.2} aria-hidden="true" />
            </span>
          </button>
        </div>
      </section>

      {/* 2. Acciones rápidas */}
      <section className="cfg-section" aria-labelledby="cfg-sec-actions">
        <div className="cfg-section__head">
          <span className="cfg-section__icon" aria-hidden="true">
            <Zap size={16} strokeWidth={2} />
          </span>
          <div>
            <h3 id="cfg-sec-actions">Acciones rápidas</h3>
            <p>Atajos directos para cargar información sin cambiar de contexto.</p>
          </div>
        </div>

        <div className="cfg-actions-grid">
          <button
            type="button"
            className="cfg-action-card"
            disabled={busy}
            onClick={() => onQuickAction('client')}
          >
            <span className="cfg-action-card__icon cfg-action-card__icon--lavender" aria-hidden="true">
              <UserPlus size={16} strokeWidth={2} />
            </span>
            <span className="cfg-action-card__text">
              <strong>Nuevo cliente</strong>
              <small>Agregar a tu base</small>
            </span>
          </button>

          <button
            type="button"
            className="cfg-action-card"
            disabled={busy}
            onClick={() => onQuickAction('expense')}
          >
            <span className="cfg-action-card__icon cfg-action-card__icon--amber" aria-hidden="true">
              <Receipt size={16} strokeWidth={2} />
            </span>
            <span className="cfg-action-card__text">
              <strong>Registrar gasto</strong>
              <small>Cargar gasto operativo</small>
            </span>
          </button>

          <button
            type="button"
            className="cfg-action-card"
            disabled={busy}
            onClick={() => onQuickAction('repair')}
          >
            <span className="cfg-action-card__icon cfg-action-card__icon--blue" aria-hidden="true">
              <Wrench size={16} strokeWidth={2} />
            </span>
            <span className="cfg-action-card__text">
              <strong>Nueva reparación</strong>
              <small>Crear orden de trabajo</small>
            </span>
          </button>
        </div>
      </section>

      {/* 3. Colores del tablero */}
      <section className="cfg-section cfg-section--last" aria-labelledby="cfg-sec-colors">
        <div className="cfg-section__head cfg-section__head--split">
          <div className="cfg-section__head-main">
            <span className="cfg-section__icon" aria-hidden="true">
              <Palette size={16} strokeWidth={2} />
            </span>
            <div>
              <h3 id="cfg-sec-colors">Colores del tablero</h3>
              <p>Personalizá los encabezados del Kanban. Se guardan solo en este navegador.</p>
            </div>
          </div>

          <button
            type="button"
            className="cfg-reset-btn"
            disabled={busy || isDefault}
            onClick={onResetDefaults}
            aria-label="Restablecer colores predeterminados"
          >
            <RotateCcw size={13.5} strokeWidth={2} aria-hidden="true" />
            <span>Restablecer colores predeterminados</span>
          </button>
        </div>

        <div className="cfg-colors-layout">
          <div className="cfg-stages-list" role="group" aria-label="Estados del tablero Kanban">
            {STAGE_META.map(({ id, label }) => {
              const Icon = STAGE_ICONS[id];
              const hex = draftColors[id];
              const tokens = resolveStageColorTokens(hex);
              const isSelected = activeStage === id;

              return (
                <button
                  key={id}
                  ref={(node) => {
                    if (stageRefs) stageRefs.current[id] = node;
                  }}
                  type="button"
                  disabled={busy}
                  aria-expanded={isSelected}
                  aria-haspopup="dialog"
                  aria-label={`Color de ${label}: ${hex}. Editar color`}
                  className={`cfg-stage-row${isSelected ? ' is-open' : ''}`}
                  style={{
                    '--stage-soft': tokens.softBg,
                    '--stage-accent': tokens.accent,
                    '--stage-border': tokens.border,
                  } as React.CSSProperties}
                  onClick={() => onStageToggle(id)}
                >
                  <span className="cfg-stage-row__left">
                    <span className="cfg-stage-row__icon" aria-hidden="true">
                      <Icon size={15} strokeWidth={2} />
                    </span>
                    <span className="cfg-stage-row__name">{label}</span>
                  </span>

                  <span className="cfg-stage-row__right">
                    <span
                      className="cfg-stage-row__swatch"
                      style={{ backgroundColor: tokens.primary }}
                      aria-hidden="true"
                    />
                    <code className="cfg-stage-row__hex">{tokens.primary}</code>
                    <ChevronDown
                      size={14}
                      strokeWidth={2.2}
                      className="cfg-stage-row__chevron"
                      aria-hidden="true"
                    />
                  </span>
                </button>
              );
            })}
          </div>

          <div className="cfg-preview-card" aria-label="Vista previa del tablero Kanban">
            <div className="cfg-preview-card__head">
              <div>
                <span className="cfg-preview-card__title">Vista previa</span>
                <span className="cfg-preview-card__sub">Así se verán las columnas del tablero</span>
              </div>
              {isDirty && (
                <span className="cfg-preview-card__dirty">Sin guardar</span>
              )}
            </div>

            <div className="cfg-preview-board" aria-hidden="true">
              {STAGE_META.map(({ id, label }) => {
                const Icon = STAGE_ICONS[id];
                const tokens = resolveStageColorTokens(draftColors[id]);

                return (
                  <div
                    key={id}
                    className="cfg-preview-col"
                    style={{ borderColor: tokens.border }}
                  >
                    <div
                      className="cfg-preview-col__header"
                      style={{
                        backgroundColor: tokens.softBg,
                        color: tokens.headerText,
                      }}
                    >
                      <Icon size={12.5} strokeWidth={2.1} style={{ color: tokens.accent, flex: 'none' }} />
                      <span>{label}</span>
                    </div>
                    <div className="cfg-preview-col__body">
                      <div className="cfg-preview-skeleton">
                        <span className="cfg-preview-skeleton__line cfg-preview-skeleton__line--lg" />
                        <span className="cfg-preview-skeleton__line cfg-preview-skeleton__line--sm" />
                      </div>
                      <div className="cfg-preview-skeleton">
                        <span className="cfg-preview-skeleton__line cfg-preview-skeleton__line--md" />
                        <span className="cfg-preview-skeleton__line cfg-preview-skeleton__line--xs" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {saveError && (
          <div role="alert" className="cfg-save-error">
            <AlertCircle size={15} strokeWidth={2} aria-hidden="true" />
            <span>{saveError}</span>
          </div>
        )}
      </section>
    </div>
  );
}

export function SettingsDrawerFooter({
  isDirty,
  hasInvalidHex,
  saveStatus,
  busy,
  pendingExit,
  userEmail,
  onSignOut,
  onKeepEditing,
  onDiscard,
  onCancel,
  onSave,
}: {
  isDirty: boolean;
  hasInvalidHex: boolean;
  saveStatus: 'idle' | 'saving' | 'success' | 'error';
  busy: boolean;
  pendingExit: PendingExitAction | null;
  userEmail?: string;
  onSignOut?: () => Promise<void> | void;
  onKeepEditing: () => void;
  onDiscard: () => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className="cfg-footer-wrap">
      {pendingExit && (
        <div className="cfg-unsaved-bar" role="alert">
          <span>Tenés cambios de colores sin guardar.</span>
          <div className="cfg-unsaved-bar__actions">
            <button
              type="button"
              className="cfg-unsaved-btn"
              onClick={onKeepEditing}
            >
              Seguir editando
            </button>
            <button
              type="button"
              className="cfg-unsaved-btn cfg-unsaved-btn--discard"
              onClick={onDiscard}
            >
              Descartar cambios
            </button>
          </div>
        </div>
      )}

      <div className="cfg-footer">
        <div className="cfg-profile" title={userEmail || undefined}>
          <span className="cfg-profile__avatar" aria-hidden="true">R</span>
          <span className="cfg-profile__text">
            <strong>Rodrigo</strong>
            <span className="cfg-profile__sep" aria-hidden="true">·</span>
            <span>{userEmail || 'Administrador'}</span>
          </span>
          {onSignOut && (
            <button
              type="button"
              className="cfg-signout-btn"
              disabled={busy}
              onClick={() => void onSignOut()}
            >
              <LogOut size={13} strokeWidth={2} aria-hidden="true" />
              <span>Cerrar sesión</span>
            </button>
          )}
        </div>

        <div className="cfg-footer__actions">
          <button
            type="button"
            className="cfg-cancel-btn"
            disabled={busy}
            onClick={onCancel}
          >
            Cancelar
          </button>
          <SaveButton
            status={saveStatus}
            idleLabel="Guardar cambios"
            savingLabel="Guardando..."
            successLabel="Guardado"
            type="button"
            disabled={!isDirty || hasInvalidHex}
            onClick={onSave}
          />
        </div>
      </div>
    </div>
  );
}
