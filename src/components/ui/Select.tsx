import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown } from 'lucide-react';
import { useFloatingPopover } from '../../hooks/useFloatingPopover';
import './ui-primitives.css';

export type SelectOption = {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
};

export type SelectProps = {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  icon?: ReactNode;
  disabled?: boolean;
  error?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  ariaDescribedBy?: string;
};

export function Select({
  id,
  name,
  value,
  onChange,
  options,
  placeholder = 'Seleccionar…',
  icon,
  disabled = false,
  error = false,
  ariaLabel,
  ariaLabelledBy,
  ariaDescribedBy,
}: SelectProps) {
  const generatedId = useId();
  const triggerId = id ?? `${generatedId}-trigger`;
  const listboxId = `${generatedId}-listbox`;

  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    0,
    options.findIndex((opt) => opt.value === value),
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);

  const close = useCallback((returnFocus = false) => {
    setOpen(false);
    if (returnFocus) {
      requestAnimationFrame(() => triggerRef.current?.focus());
    }
  }, []);

  const { style, placement, portalTarget } = useFloatingPopover({
    open,
    anchorRef: triggerRef,
    floatingRef,
    onClose: () => close(false),
    matchWidth: true,
    minWidth: 160,
    estimatedHeight: Math.min(260, options.length * 40 + 12),
  });

  useEffect(() => {
    if (open) {
      const idx = options.findIndex((opt) => opt.value === value && !opt.disabled);
      setActiveIndex(idx >= 0 ? idx : options.findIndex((opt) => !opt.disabled));
    }
  }, [open, options, value]);

  const moveActive = (delta: number) => {
    if (!options.length) return;
    let next = activeIndex;
    for (let step = 0; step < options.length; step++) {
      next = (next + delta + options.length) % options.length;
      if (!options[next]?.disabled) {
        setActiveIndex(next);
        return;
      }
    }
  };

  const commitIndex = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    onChange(option.value);
    close(true);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) setOpen(true);
        else moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) setOpen(true);
        else moveActive(-1);
        break;
      case 'Home':
        if (open) {
          event.preventDefault();
          const first = options.findIndex((opt) => !opt.disabled);
          if (first >= 0) setActiveIndex(first);
        }
        break;
      case 'End':
        if (open) {
          event.preventDefault();
          for (let i = options.length - 1; i >= 0; i--) {
            if (!options[i]?.disabled) {
              setActiveIndex(i);
              break;
            }
          }
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!open) setOpen(true);
        else commitIndex(activeIndex);
        break;
      case 'Escape':
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          close(true);
        }
        break;
      case 'Tab':
        if (open) close(false);
        break;
      default:
        if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
          const char = event.key.toLocaleLowerCase('es');
          const match = options.findIndex(
            (opt) => !opt.disabled && opt.label.toLocaleLowerCase('es').startsWith(char),
          );
          if (match >= 0) {
            setActiveIndex(match);
            if (!open) onChange(options[match].value);
          }
        }
        break;
    }
  };

  const selected = options.find((opt) => opt.value === value);
  const activeOptionId = open && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined;
  const leadingIcon = selected?.icon ?? icon;

  return (
    <>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={activeOptionId}
        aria-invalid={error || undefined}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-describedby={ariaDescribedBy}
        disabled={disabled}
        className="ui-select-trigger"
        onClick={() => !disabled && setOpen((prev) => !prev)}
        onKeyDown={handleKeyDown}
      >
        <span className="ui-select-trigger__left">
          {leadingIcon && (
            <span className="ui-select-trigger__icon" aria-hidden="true">
              {leadingIcon}
            </span>
          )}
          <span
            className={`ui-select-trigger__value${!selected ? ' ui-select-trigger__placeholder' : ''}`}
          >
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown size={16} className="ui-select-trigger__chevron" aria-hidden="true" />
      </button>

      {open &&
        portalTarget &&
        createPortal(
          <div
            ref={floatingRef}
            className="ui-popover"
            data-placement={placement}
            style={style}
          >
            <ul
              id={listboxId}
              role="listbox"
              aria-labelledby={ariaLabelledBy}
              aria-label={ariaLabel}
              className="ui-listbox"
            >
              {options.map((option, index) => {
                const isSelected = option.value === value;
                const isActive = index === activeIndex;
                return (
                  <li
                    key={option.value}
                    id={`${listboxId}-opt-${index}`}
                    role="option"
                    aria-selected={isSelected}
                    aria-disabled={option.disabled || undefined}
                    data-active={isActive || undefined}
                    className="ui-listbox__option"
                    onMouseEnter={() => !option.disabled && setActiveIndex(index)}
                    onMouseDown={(event) => {
                      event.preventDefault();
                      commitIndex(index);
                    }}
                  >
                    <span className="ui-listbox__option-main">
                      {option.icon && (
                        <span className="ui-listbox__option-icon" aria-hidden="true">
                          {option.icon}
                        </span>
                      )}
                      <span>{option.label}</span>
                    </span>
                    {isSelected && (
                      <Check size={15} strokeWidth={2.4} className="ui-listbox__check" aria-hidden="true" />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>,
          portalTarget,
        )}
    </>
  );
}
