import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, Palette, SlidersHorizontal, X } from 'lucide-react';
import { useFloatingPopover } from '../../hooks/useFloatingPopover';
import {
  BOARD_COLOR_PALETTE,
  getPaletteMatch,
  hexToHsv,
  hsvToHex,
  normalizeHexColor,
  resolveStageColorTokens,
  type Hsv,
} from '../../views/kanban-color-settings';

export type ColorPickerPopoverProps = {
  open: boolean;
  stageLabel: string;
  value: string;
  anchorRef: RefObject<HTMLElement | null>;
  onChange: (hex: string) => void;
  onInvalidChange?: (invalid: boolean) => void;
  onClose: () => void;
};

type PickerTab = 'palette' | 'custom';

export function ColorPickerPopover({
  open,
  stageLabel,
  value,
  anchorRef,
  onChange,
  onInvalidChange,
  onClose,
}: ColorPickerPopoverProps) {
  const baseId = useId();
  const floatingRef = useRef<HTMLDivElement>(null);
  const padRef = useRef<HTMLDivElement>(null);
  const hexInputRef = useRef<HTMLInputElement>(null);

  const normalizedValue = normalizeHexColor(value) ?? '#2563EB';
  const [tab, setTab] = useState<PickerTab>('palette');
  const [hexInput, setHexInput] = useState(normalizedValue);
  const [hexError, setHexError] = useState('');
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(normalizedValue));

  const { style, placement, portalTarget } = useFloatingPopover({
    open,
    anchorRef,
    floatingRef,
    onClose,
    minWidth: 312,
    maxWidth: 344,
    align: 'start',
    offset: 8,
    estimatedHeight: 332,
    repositionKey: `${tab}-${Boolean(hexError)}`,
  });

  // Keep local editor state synced whenever value changes externally (e.g. Reset or stage switch)
  useEffect(() => {
    const next = normalizeHexColor(value);
    if (!next) return;
    setHexInput(next);
    setHexError('');
    setHsv(hexToHsv(next));
    onInvalidChange?.(false);
  }, [value, open, onInvalidChange]);

  // Reset tab cleanly when opening for a new stage; focus popover for keyboard flow
  useEffect(() => {
    if (!open) return;
    const isPreset = Boolean(getPaletteMatch(normalizedValue));
    setTab(isPreset ? 'palette' : 'custom');
  }, [open, stageLabel]);

  // Close ONLY the popover on Escape so the parent SideSheet stays open
  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
        anchorRef.current?.focus();
      }
    }
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [open, onClose, anchorRef]);

  const applyValidColor = useCallback(
    (nextHex: string, nextHsv?: Hsv) => {
      const normalized = normalizeHexColor(nextHex);
      if (!normalized) return;
      setHexInput(normalized);
      setHexError('');
      setHsv(nextHsv ?? hexToHsv(normalized));
      onInvalidChange?.(false);
      onChange(normalized);
    },
    [onChange, onInvalidChange],
  );

  const updateFromPadClientPoint = useCallback(
    (clientX: number, clientY: number) => {
      const pad = padRef.current;
      if (!pad) return;
      const rect = pad.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const s = Math.round(Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)) * 100);
      const v = Math.round(Math.min(1, Math.max(0, 1 - (clientY - rect.top) / rect.height)) * 100);
      const nextHsv: Hsv = { h: hsv.h, s, v };
      applyValidColor(hsvToHex(nextHsv.h, nextHsv.s, nextHsv.v), nextHsv);
    },
    [hsv.h, applyValidColor],
  );

  function handlePadPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    updateFromPadClientPoint(event.clientX, event.clientY);
  }

  function handlePadPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    updateFromPadClientPoint(event.clientX, event.clientY);
  }

  function handlePadKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? 10 : 3;
    let nextS = hsv.s;
    let nextV = hsv.v;
    if (event.key === 'ArrowRight') nextS = Math.min(100, hsv.s + step);
    else if (event.key === 'ArrowLeft') nextS = Math.max(0, hsv.s - step);
    else if (event.key === 'ArrowUp') nextV = Math.min(100, hsv.v + step);
    else if (event.key === 'ArrowDown') nextV = Math.max(0, hsv.v - step);
    else return;

    event.preventDefault();
    const nextHsv: Hsv = { h: hsv.h, s: nextS, v: nextV };
    applyValidColor(hsvToHex(nextHsv.h, nextHsv.s, nextHsv.v), nextHsv);
  }

  function handleHexChange(raw: string) {
    const cleaned = raw.replace(/\s+/g, '').slice(0, 7);
    setHexInput(cleaned);
    const normalized = normalizeHexColor(cleaned);
    if (normalized) {
      setHexError('');
      setHsv(hexToHsv(normalized));
      onInvalidChange?.(false);
      onChange(normalized);
    } else {
      setHexError('Usá un código HEX de 6 dígitos (ej. #2563EB).');
      onInvalidChange?.(true);
    }
  }

  function handleHexBlur() {
    const normalized = normalizeHexColor(hexInput);
    if (normalized) {
      setHexInput(normalized);
      setHexError('');
      onInvalidChange?.(false);
    }
  }

  if (!open || !portalTarget) return null;

  const activeTokens = resolveStageColorTokens(normalizedValue);
  const matchedPreset = getPaletteMatch(normalizedValue);
  const hueHex = hsvToHex(hsv.h, 100, 100);

  return createPortal(
    <div
      ref={floatingRef}
      role="dialog"
      aria-label={`Elegir color para ${stageLabel}`}
      data-placement={placement}
      className="cfg-color-popover"
      style={style}
    >
      <div className="cfg-color-popover__top">
        <div className="cfg-color-popover__tabs" role="tablist" aria-label="Modo de selección de color">
          <button
            type="button"
            role="tab"
            id={`${baseId}-tab-palette`}
            aria-selected={tab === 'palette'}
            aria-controls={`${baseId}-panel-palette`}
            className={`cfg-color-tab${tab === 'palette' ? ' is-active' : ''}`}
            onClick={() => setTab('palette')}
          >
            <Palette size={13.5} strokeWidth={2} aria-hidden="true" />
            <span>Paleta</span>
          </button>
          <button
            type="button"
            role="tab"
            id={`${baseId}-tab-custom`}
            aria-selected={tab === 'custom'}
            aria-controls={`${baseId}-panel-custom`}
            className={`cfg-color-tab${tab === 'custom' ? ' is-active' : ''}`}
            onClick={() => {
              setTab('custom');
              requestAnimationFrame(() => hexInputRef.current?.focus());
            }}
          >
            <SlidersHorizontal size={13.5} strokeWidth={2} aria-hidden="true" />
            <span>Personalizado</span>
          </button>
        </div>
        <button
          type="button"
          className="cfg-color-popover__close"
          onClick={() => {
            onClose();
            anchorRef.current?.focus();
          }}
          aria-label={`Cerrar selector de color de ${stageLabel}`}
        >
          <X size={14} strokeWidth={2.2} aria-hidden="true" />
        </button>
      </div>

      {tab === 'palette' ? (
        <div
          id={`${baseId}-panel-palette`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-palette`}
          className="cfg-palette-panel"
        >
          <div className="cfg-swatch-grid" role="radiogroup" aria-label={`Paleta para ${stageLabel}`}>
            {BOARD_COLOR_PALETTE.map((option) => {
              const isSelected = option.hex === normalizedValue;
              const optionTokens = resolveStageColorTokens(option.hex);
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={`${option.name} (${option.hex})`}
                  title={`${option.name} · ${option.hex}`}
                  className={`cfg-swatch${isSelected ? ' is-selected' : ''}`}
                  style={{
                    '--swatch-color': option.hex,
                    '--swatch-ink': optionTokens.checkInk,
                  } as React.CSSProperties}
                  onClick={() => applyValidColor(option.hex)}
                >
                  {isSelected && <Check size={15} strokeWidth={2.7} aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <div className="cfg-popover-meta">
            <span className="cfg-popover-meta__label">
              {matchedPreset ? matchedPreset.name : 'Color personalizado'}
            </span>
            <code className="cfg-popover-meta__hex">{normalizedValue}</code>
          </div>
        </div>
      ) : (
        <div
          id={`${baseId}-panel-custom`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-custom`}
          className="cfg-custom-panel"
        >
          <div
            ref={padRef}
            role="slider"
            tabIndex={0}
            aria-label={`Saturación y brillo para ${stageLabel}`}
            aria-valuetext={`Saturación ${hsv.s}%, brillo ${hsv.v}%`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={hsv.s}
            className="cfg-color-pad"
            style={{ backgroundColor: hueHex }}
            onPointerDown={handlePadPointerDown}
            onPointerMove={handlePadPointerMove}
            onKeyDown={handlePadKeyDown}
          >
            <div className="cfg-color-pad__white" aria-hidden="true" />
            <div className="cfg-color-pad__black" aria-hidden="true" />
            <span
              className="cfg-color-pad__thumb"
              aria-hidden="true"
              style={{
                left: `${hsv.s}%`,
                top: `${100 - hsv.v}%`,
                backgroundColor: normalizedValue,
              }}
            />
          </div>

          <div className="cfg-hue-row">
            <label htmlFor={`${baseId}-hue`} className="sr-only">
              Matiz de color para {stageLabel}
            </label>
            <input
              id={`${baseId}-hue`}
              type="range"
              min={0}
              max={360}
              value={hsv.h}
              className="cfg-hue-slider"
              aria-label={`Matiz para ${stageLabel}`}
              onChange={(event) => {
                const nextH = Number(event.target.value);
                const nextHsv: Hsv = { h: nextH, s: Math.max(hsv.s, 10), v: Math.max(hsv.v, 10) };
                applyValidColor(hsvToHex(nextHsv.h, nextHsv.s, nextHsv.v), nextHsv);
              }}
            />
          </div>

          <div className="cfg-hex-field">
            <label htmlFor={`${baseId}-hex`} className="cfg-hex-field__label">
              Código HEX
            </label>
            <div className="cfg-hex-input-wrap" data-invalid={Boolean(hexError) || undefined}>
              <span
                className="cfg-hex-input-swatch"
                style={{ backgroundColor: normalizedValue }}
                aria-hidden="true"
              />
              <input
                ref={hexInputRef}
                id={`${baseId}-hex`}
                type="text"
                inputMode="text"
                autoComplete="off"
                spellCheck={false}
                maxLength={7}
                value={hexInput}
                placeholder="#2563EB"
                aria-invalid={Boolean(hexError) || undefined}
                aria-describedby={hexError ? `${baseId}-hex-err` : undefined}
                onChange={(event) => handleHexChange(event.target.value)}
                onBlur={handleHexBlur}
              />
            </div>
            {hexError && (
              <p id={`${baseId}-hex-err`} role="alert" className="cfg-hex-error">
                <AlertCircle size={13} aria-hidden="true" />
                <span>{hexError}</span>
              </p>
            )}
          </div>
        </div>
      )}

      <div
        className="cfg-contrast-preview"
        style={{
          backgroundColor: activeTokens.softBg,
          borderColor: activeTokens.border,
          color: activeTokens.headerText,
        }}
      >
        <span
          className="cfg-contrast-preview__dot"
          style={{ backgroundColor: activeTokens.accent }}
          aria-hidden="true"
        />
        <span className="cfg-contrast-preview__name">{stageLabel}</span>
        <span className="cfg-contrast-preview__badge" style={{ color: activeTokens.accent }}>
          Legible
        </span>
      </div>
    </div>,
    portalTarget,
  );
}
