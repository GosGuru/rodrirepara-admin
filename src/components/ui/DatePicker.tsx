import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useFloatingPopover } from '../../hooks/useFloatingPopover';
import {
  MONTHS_ES,
  WEEKDAYS_ES_LONG,
  WEEKDAYS_ES_SHORT,
  addDaysIso,
  addMonthsToView,
  formatIsoToUruguayan,
  formatMonthYearEs,
  formatReadableDateEs,
  getCalendarGrid,
  parseIsoParts,
  parseUruguayanDate,
  todayIsoLocal,
} from '../../utils/date';
import './ui-primitives.css';

const MONTHS_SHORT_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
] as const;

export type DatePickerProps = {
  id?: string;
  name?: string;
  value: string; // YYYY-MM-DD
  onChange: (iso: string) => void;
  onValidityChange?: (valid: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: boolean;
  minDate?: string;
  maxDate?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
};

export function DatePicker({
  id,
  name,
  value,
  onChange,
  onValidityChange,
  placeholder = 'dd/mm/aaaa',
  disabled = false,
  error = false,
  minDate,
  maxDate,
  ariaLabel,
  ariaDescribedBy,
}: DatePickerProps) {
  const generatedId = useId();
  const inputId = id ?? `${generatedId}-input`;
  const dialogId = `${generatedId}-calendar`;

  const todayIso = useMemo(() => todayIsoLocal(), []);
  const initialParts = parseIsoParts(value) ?? parseIsoParts(todayIso)!;

  const [open, setOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<'days' | 'months'>('days');
  const [viewYear, setViewYear] = useState(initialParts.year);
  const [viewMonth, setViewMonth] = useState(initialParts.monthIndex);
  const [focusedIso, setFocusedIso] = useState(value || todayIso);
  const [textValue, setTextValue] = useState(() => formatIsoToUruguayan(value));
  const [localInvalid, setLocalInvalid] = useState(false);

  const anchorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const onValidityRef = useRef(onValidityChange);
  onValidityRef.current = onValidityChange;

  // Sync ONLY when external ISO value actually changes
  useEffect(() => {
    const formatted = formatIsoToUruguayan(value);
    if (formatted) {
      setTextValue(formatted);
      setLocalInvalid(false);
      onValidityRef.current?.(true);
      const parts = parseIsoParts(value);
      if (parts) {
        setViewYear(parts.year);
        setViewMonth(parts.monthIndex);
        setFocusedIso(value);
      }
    } else if (value === '') {
      setTextValue('');
    }
  }, [value]);

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    setPickerMode('days');
    if (returnFocus) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, []);

  const { style, placement, portalTarget } = useFloatingPopover({
    open,
    anchorRef,
    floatingRef,
    onClose: () => close(false),
    matchWidth: false,
    minWidth: 292,
    maxWidth: 312,
    align: 'end',
    estimatedHeight: 344,
  });

  const isOutOfBounds = useCallback(
    (iso: string) => {
      if (minDate && iso < minDate) return true;
      if (maxDate && iso > maxDate) return true;
      return false;
    },
    [minDate, maxDate],
  );

  const openCalendar = useCallback(() => {
    if (disabled) return;
    const parts = parseIsoParts(value) ?? parseIsoParts(todayIso)!;
    setViewYear(parts.year);
    setViewMonth(parts.monthIndex);
    setFocusedIso(value && parseIsoParts(value) ? value : todayIso);
    setPickerMode('days');
    setOpen(true);
  }, [disabled, todayIso, value]);

  const selectDate = useCallback(
    (iso: string) => {
      if (isOutOfBounds(iso)) return;
      onChange(iso);
      setTextValue(formatIsoToUruguayan(iso));
      setLocalInvalid(false);
      onValidityChange?.(true);
      close(true);
    },
    [close, isOutOfBounds, onChange, onValidityChange],
  );

  const handleTextChange = (raw: string) => {
    setTextValue(raw);
    const trimmed = raw.trim();
    if (!trimmed) {
      setLocalInvalid(false);
      onValidityChange?.(false);
      onChange('');
      return;
    }
    const parsed = parseUruguayanDate(trimmed);
    if (parsed && !isOutOfBounds(parsed)) {
      setLocalInvalid(false);
      onValidityChange?.(true);
      onChange(parsed);
      const parts = parseIsoParts(parsed)!;
      setViewYear(parts.year);
      setViewMonth(parts.monthIndex);
      setFocusedIso(parsed);
    } else {
      onValidityChange?.(false);
    }
  };

  const handleTextBlur = () => {
    const trimmed = textValue.trim();
    if (!trimmed) {
      setLocalInvalid(false);
      return;
    }
    const parsed = parseUruguayanDate(trimmed);
    if (parsed && !isOutOfBounds(parsed)) {
      setTextValue(formatIsoToUruguayan(parsed));
      setLocalInvalid(false);
      onValidityChange?.(true);
      if (parsed !== value) onChange(parsed);
    } else {
      setLocalInvalid(true);
      onValidityChange?.(false);
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' && !open) {
      event.preventDefault();
      openCalendar();
    } else if (event.key === 'Escape' && open) {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
  };

  const focusDayIso = (iso: string) => {
    const parts = parseIsoParts(iso);
    if (!parts) return;
    setViewYear(parts.year);
    setViewMonth(parts.monthIndex);
    setFocusedIso(iso);
    requestAnimationFrame(() => {
      dayRefs.current.get(iso)?.focus();
    });
  };

  const handleDayKeyDown = (event: KeyboardEvent<HTMLButtonElement>, iso: string) => {
    switch (event.key) {
      case 'ArrowRight':
        event.preventDefault();
        focusDayIso(addDaysIso(iso, 1));
        break;
      case 'ArrowLeft':
        event.preventDefault();
        focusDayIso(addDaysIso(iso, -1));
        break;
      case 'ArrowDown':
        event.preventDefault();
        focusDayIso(addDaysIso(iso, 7));
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusDayIso(addDaysIso(iso, -7));
        break;
      case 'Home': {
        event.preventDefault();
        const parts = parseIsoParts(iso)!;
        const d = new Date(parts.year, parts.monthIndex, parts.day);
        const offset = (d.getDay() + 6) % 7;
        focusDayIso(addDaysIso(iso, -offset));
        break;
      }
      case 'End': {
        event.preventDefault();
        const parts = parseIsoParts(iso)!;
        const d = new Date(parts.year, parts.monthIndex, parts.day);
        const offset = 6 - ((d.getDay() + 6) % 7);
        focusDayIso(addDaysIso(iso, offset));
        break;
      }
      case 'PageUp': {
        event.preventDefault();
        const parts = parseIsoParts(iso)!;
        const next = addMonthsToView(parts.year, parts.monthIndex, event.shiftKey ? -12 : -1);
        const lastDay = new Date(next.year, next.monthIndex + 1, 0).getDate();
        const targetDay = Math.min(parts.day, lastDay);
        focusDayIso(
          `${String(next.year).padStart(4, '0')}-${String(next.monthIndex + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`,
        );
        break;
      }
      case 'PageDown': {
        event.preventDefault();
        const parts = parseIsoParts(iso)!;
        const next = addMonthsToView(parts.year, parts.monthIndex, event.shiftKey ? 12 : 1);
        const lastDay = new Date(next.year, next.monthIndex + 1, 0).getDate();
        const targetDay = Math.min(parts.day, lastDay);
        focusDayIso(
          `${String(next.year).padStart(4, '0')}-${String(next.monthIndex + 1).padStart(2, '0')}-${String(targetDay).padStart(2, '0')}`,
        );
        break;
      }
      case 'Escape':
        event.preventDefault();
        event.stopPropagation();
        close(true);
        break;
      default:
        break;
    }
  };

  const cells = useMemo(
    () => getCalendarGrid(viewYear, viewMonth, todayIso),
    [viewYear, viewMonth, todayIso],
  );

  const isInvalid = error || localInvalid;
  const readableHint = value ? formatReadableDateEs(value) : 'Formato dd/mm/aaaa';

  return (
    <>
      {name && <input type="hidden" name={name} value={value} />}
      <div
        ref={anchorRef}
        className="ui-date-field"
        data-open={open || undefined}
        data-invalid={isInvalid || undefined}
        data-disabled={disabled || undefined}
      >
        <button
          type="button"
          className="ui-date-field__icon-btn"
          disabled={disabled}
          aria-label="Abrir calendario"
          aria-expanded={open}
          aria-controls={open ? dialogId : undefined}
          onClick={() => (open ? close(true) : openCalendar())}
        >
          <Calendar size={16} aria-hidden="true" />
        </button>

        <input
          ref={inputRef}
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          disabled={disabled}
          value={textValue}
          placeholder={placeholder}
          aria-label={ariaLabel}
          aria-invalid={isInvalid || undefined}
          aria-describedby={ariaDescribedBy}
          className="ui-date-field__input"
          onChange={(event) => handleTextChange(event.target.value)}
          onBlur={handleTextBlur}
          onKeyDown={handleInputKeyDown}
        />

        <button
          type="button"
          className="ui-date-field__toggle"
          disabled={disabled}
          tabIndex={-1}
          aria-label={open ? 'Cerrar calendario' : 'Desplegar calendario'}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => (open ? close(true) : openCalendar())}
        >
          <ChevronDown size={16} className="ui-date-field__toggle-icon" aria-hidden="true" />
        </button>
      </div>

      {open &&
        portalTarget &&
        createPortal(
          <div
            ref={floatingRef}
            id={dialogId}
            role="dialog"
            aria-label="Selector de fecha"
            className="ui-popover ui-calendar"
            data-placement={placement}
            style={style}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                close(true);
              }
            }}
          >
            <div className="ui-calendar__header">
              <button
                type="button"
                className="ui-calendar__nav"
                aria-label={pickerMode === 'months' ? 'Año anterior' : 'Mes anterior'}
                onClick={() => {
                  if (pickerMode === 'months') {
                    setViewYear((y) => Math.max(1900, y - 1));
                  } else {
                    const prev = addMonthsToView(viewYear, viewMonth, -1);
                    setViewYear(prev.year);
                    setViewMonth(prev.monthIndex);
                  }
                }}
              >
                <ChevronLeft size={16} aria-hidden="true" />
              </button>

              <button
                type="button"
                className="ui-calendar__title-btn"
                aria-label={
                  pickerMode === 'months'
                    ? 'Volver a vista de días'
                    : 'Elegir mes y año'
                }
                aria-expanded={pickerMode === 'months'}
                onClick={() => setPickerMode((m) => (m === 'days' ? 'months' : 'days'))}
              >
                <span>{pickerMode === 'months' ? String(viewYear) : formatMonthYearEs(viewYear, viewMonth)}</span>
                <ChevronDown size={14} aria-hidden="true" />
              </button>

              <button
                type="button"
                className="ui-calendar__nav"
                aria-label={pickerMode === 'months' ? 'Año siguiente' : 'Mes siguiente'}
                onClick={() => {
                  if (pickerMode === 'months') {
                    setViewYear((y) => Math.min(2100, y + 1));
                  } else {
                    const next = addMonthsToView(viewYear, viewMonth, 1);
                    setViewYear(next.year);
                    setViewMonth(next.monthIndex);
                  }
                }}
              >
                <ChevronRight size={16} aria-hidden="true" />
              </button>
            </div>

            {pickerMode === 'months' ? (
              <div className="ui-calendar__months" role="group" aria-label={`Meses de ${viewYear}`}>
                {MONTHS_SHORT_ES.map((label, idx) => (
                  <button
                    key={label}
                    type="button"
                    className="ui-calendar__month-btn"
                    aria-label={`${MONTHS_ES[idx]} ${viewYear}`}
                    aria-pressed={idx === viewMonth}
                    onClick={() => {
                      setViewMonth(idx);
                      setPickerMode('days');
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            ) : (
              <>
                <div className="ui-calendar__weekdays" aria-hidden="true">
                  {WEEKDAYS_ES_SHORT.map((letter, index) => (
                    <span key={WEEKDAYS_ES_LONG[index]} className="ui-calendar__weekday">
                      {letter}
                    </span>
                  ))}
                </div>
                <div className="ui-calendar__grid" role="grid" aria-label={formatMonthYearEs(viewYear, viewMonth)}>
                  {cells.map((cell) => {
                    const selected = cell.iso === value;
                    const disabledDay = isOutOfBounds(cell.iso);
                    const isTabTarget = cell.iso === focusedIso;
                    return (
                      <button
                        key={cell.iso}
                        ref={(el) => {
                          if (el) dayRefs.current.set(cell.iso, el);
                          else dayRefs.current.delete(cell.iso);
                        }}
                        type="button"
                        role="gridcell"
                        tabIndex={isTabTarget ? 0 : -1}
                        disabled={disabledDay}
                        aria-selected={selected}
                        aria-current={cell.isToday ? 'date' : undefined}
                        aria-label={formatReadableDateEs(cell.iso)}
                        data-outside={!cell.inMonth || undefined}
                        data-today={cell.isToday || undefined}
                        className="ui-calendar__day"
                        onClick={() => selectDate(cell.iso)}
                        onKeyDown={(event) => handleDayKeyDown(event, cell.iso)}
                      >
                        {cell.day}
                      </button>
                    );
                  })}
                </div>
              </>
            )}

            <div className="ui-calendar__footer">
              <span className="ui-calendar__hint" title={readableHint}>
                {readableHint}
              </span>
              <button
                type="button"
                className="ui-calendar__today-btn"
                disabled={isOutOfBounds(todayIso)}
                onClick={() => selectDate(todayIso)}
              >
                Hoy
              </button>
            </div>
          </div>,
          portalTarget,
        )}
    </>
  );
}
