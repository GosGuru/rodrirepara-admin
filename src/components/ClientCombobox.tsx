import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Plus, Search, User, X } from 'lucide-react';
import type { Client } from '../repository';
import { useFloatingPopover } from '../hooks/useFloatingPopover';
import './ui/ui-primitives.css';
import './client-combobox.css';

function normalizeSearch(value: string): string {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es');
}

export function filterClients(clients: readonly Client[], query: string): Client[] {
  const term = normalizeSearch(query.trim());
  if (!term) return [...clients];
  return clients.filter(
    (client) =>
      normalizeSearch(client.name).includes(term) ||
      normalizeSearch(client.phone).includes(term),
  );
}

export type ClientComboboxProps = {
  id?: string;
  clients: readonly Client[];
  value: string;
  onChange: (clientId: string) => void;
  onAddClient: () => void;
  disabled?: boolean;
  error?: boolean;
  ariaDescribedBy?: string;
  inputRef?: RefObject<HTMLInputElement | null>;
  addButtonRef?: RefObject<HTMLButtonElement | null>;
};

export function ClientCombobox({
  id,
  clients,
  value,
  onChange,
  onAddClient,
  disabled = false,
  error = false,
  ariaDescribedBy,
  inputRef: externalInputRef,
  addButtonRef,
}: ClientComboboxProps) {
  const generatedId = useId();
  const inputId = id ?? `${generatedId}-input`;
  const listboxId = `${generatedId}-listbox`;

  const selected = useMemo(
    () => clients.find((client) => client.id === value) ?? null,
    [clients, value],
  );

  const selectedLabel = selected ? `${selected.name} · ${selected.phone}` : '';

  const [open, setOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const internalInputRef = useRef<HTMLInputElement>(null);
  const inputRef = externalInputRef ?? internalInputRef;
  const anchorRef = useRef<HTMLDivElement>(null);
  const floatingRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Map<number, HTMLLIElement>>(new Map());

  const matches = useMemo(
    () => (isSearching ? filterClients(clients, query) : [...clients]),
    [clients, isSearching, query],
  );

  // Sync when external value changes (e.g., returning from Nuevo cliente)
  useEffect(() => {
    setIsSearching(false);
    setQuery('');
    setOpen(false);
  }, [value]);

  // Keep active index valid as filtered matches change
  useEffect(() => {
    if (!open) return;
    if (matches.length === 0) {
      setActiveIndex(-1);
      return;
    }
    if (!isSearching && selected) {
      const idx = matches.findIndex((c) => c.id === selected.id);
      setActiveIndex(idx >= 0 ? idx : 0);
    } else {
      setActiveIndex(0);
    }
  }, [open, matches, isSearching, selected]);

  // Scroll active option into view
  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const node = optionRefs.current.get(activeIndex);
    if (node && typeof node.scrollIntoView === 'function') {
      node.scrollIntoView({ block: 'nearest' });
    }
  }, [open, activeIndex]);

  const close = useCallback(() => {
    setOpen(false);
    setIsSearching(false);
    setQuery('');
  }, []);

  const { style, placement, portalTarget } = useFloatingPopover({
    open,
    anchorRef,
    floatingRef,
    onClose: close,
    matchWidth: true,
    minWidth: 240,
    estimatedHeight: 230,
  });

  const selectClient = useCallback(
    (client: Client) => {
      onChange(client.id);
      setOpen(false);
      setIsSearching(false);
      setQuery('');
      requestAnimationFrame(() => inputRef.current?.focus());
    },
    [inputRef, onChange],
  );

  const displayValue = isSearching ? query : selectedLabel;

  const handleInputChange = (nextText: string) => {
    setIsSearching(true);
    setQuery(nextText);
    if (!open) setOpen(true);
  };

  const handleClear = () => {
    onChange('');
    setIsSearching(true);
    setQuery('');
    setOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!open) {
          setOpen(true);
        } else if (matches.length > 0) {
          setActiveIndex((prev) => (prev + 1) % matches.length);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!open) {
          setOpen(true);
        } else if (matches.length > 0) {
          setActiveIndex((prev) => (prev - 1 + matches.length) % matches.length);
        }
        break;
      case 'Home':
        if (open && matches.length > 0) {
          event.preventDefault();
          setActiveIndex(0);
        }
        break;
      case 'End':
        if (open && matches.length > 0) {
          event.preventDefault();
          setActiveIndex(matches.length - 1);
        }
        break;
      case 'Enter':
        event.preventDefault();
        if (open && activeIndex >= 0 && matches[activeIndex]) {
          selectClient(matches[activeIndex]);
        } else if (!open) {
          setOpen(true);
        }
        break;
      case 'Escape':
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
        break;
      case 'Tab':
        if (open) close();
        break;
      default:
        break;
    }
  };

  const activeOptionId =
    open && activeIndex >= 0 && matches[activeIndex]
      ? `${listboxId}-opt-${activeIndex}`
      : undefined;

  return (
    <div className="client-combobox">
      <input type="hidden" name="client" value={value} />
      <div className="client-combobox__row">
        <div
          ref={anchorRef}
          className="client-combobox__control"
          data-open={open || undefined}
          data-invalid={error || undefined}
          data-selected={Boolean(selected && !isSearching) || undefined}
          data-disabled={disabled || undefined}
        >
          <span className="client-combobox__leading" aria-hidden="true">
            {selected && !isSearching ? <User size={16} /> : <Search size={16} />}
          </span>

          <input
            ref={inputRef}
            id={inputId}
            type="text"
            role="combobox"
            autoComplete="off"
            disabled={disabled}
            value={displayValue}
            placeholder="Buscar por nombre o teléfono"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={open ? listboxId : undefined}
            aria-activedescendant={activeOptionId}
            aria-invalid={error || undefined}
            aria-describedby={ariaDescribedBy}
            className="client-combobox__input"
            onClick={() => {
              if (!disabled && !open) setOpen(true);
            }}
            onChange={(event) => handleInputChange(event.target.value)}
            onKeyDown={handleKeyDown}
          />

          {(selected || (isSearching && query)) && !disabled && (
            <button
              type="button"
              className="client-combobox__clear"
              aria-label="Cambiar cliente"
              tabIndex={-1}
              onMouseDown={(event) => event.preventDefault()}
              onClick={handleClear}
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}

          <button
            type="button"
            className="client-combobox__toggle"
            disabled={disabled}
            tabIndex={-1}
            aria-label={open ? 'Cerrar lista de clientes' : 'Abrir lista de clientes'}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              if (disabled) return;
              if (open) {
                close();
              } else {
                setOpen(true);
                inputRef.current?.focus();
              }
            }}
          >
            <ChevronDown size={16} className="client-combobox__chevron" aria-hidden="true" />
          </button>
        </div>

        <button
          ref={addButtonRef}
          type="button"
          disabled={disabled}
          className="client-combobox__add"
          onClick={() => {
            close();
            onAddClient();
          }}
        >
          <Plus size={15} strokeWidth={2.3} aria-hidden="true" />
          <span>Agregar cliente</span>
        </button>
      </div>

      {open &&
        portalTarget &&
        createPortal(
          <div
            ref={floatingRef}
            className="ui-popover client-combobox__popover"
            data-placement={placement}
            style={style}
          >
            {matches.length > 0 ? (
              <ul
                id={listboxId}
                role="listbox"
                aria-label="Clientes"
                className="ui-listbox client-combobox__list"
              >
                {matches.map((client, index) => {
                  const isSelected = client.id === value;
                  const isActive = index === activeIndex;
                  return (
                    <li
                      key={client.id}
                      ref={(el) => {
                        if (el) optionRefs.current.set(index, el);
                        else optionRefs.current.delete(index);
                      }}
                      id={`${listboxId}-opt-${index}`}
                      role="option"
                      aria-selected={isSelected}
                      data-active={isActive || undefined}
                      className="ui-listbox__option client-combobox__option"
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseDown={(event) => {
                        event.preventDefault();
                        selectClient(client);
                      }}
                    >
                      <span className="client-combobox__option-main">
                        <User size={15} className="client-combobox__option-icon" aria-hidden="true" />
                        <span className="client-combobox__option-copy">
                          <span className="client-combobox__option-name">{client.name}</span>
                          <span className="client-combobox__option-sep" aria-hidden="true">·</span>
                          <span className="client-combobox__option-phone">{client.phone}</span>
                        </span>
                      </span>
                      {isSelected && (
                        <Check size={15} strokeWidth={2.4} className="ui-listbox__check" aria-hidden="true" />
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div id={listboxId} role="status" className="client-combobox__empty">
                <p>
                  {isSearching && query.trim()
                    ? `No se encontraron clientes para «${query.trim()}».`
                    : 'Todavía no hay clientes registrados.'}
                </p>
                <button
                  type="button"
                  className="client-combobox__empty-add"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    close();
                    onAddClient();
                  }}
                >
                  <Plus size={14} strokeWidth={2.3} aria-hidden="true" />
                  <span>Agregar cliente</span>
                </button>
              </div>
            )}
          </div>,
          portalTarget,
        )}
    </div>
  );
}
