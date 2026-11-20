import {
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import {
  AlertCircle,
  ArrowUpDown,
  ChevronRight,
  Plus,
  RotateCcw,
  Search,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import type { Data } from '../repository';
import type { WorkshopActions } from '../components/workshop/actions';
import { Select } from '../components/ui/Select';
import {
  buildClientDirectory,
  CLIENT_SORT_OPTIONS,
  formatOrderCountLabel,
  getAvatarTone,
  getClientInitial,
  getClientOrders,
  type ClientSortKey,
} from './clients/client-helpers';
import { ClientHistoryPanel } from './clients/ClientHistoryPanel';
import './orders-view.css';
import './clients-view.css';

export type ClientsViewProps = {
  data: Data;
  onCreateClient: () => void;
  actions?: WorkshopActions;
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  initialSelectedClientId?: string | null;
};

export function ClientsView({
  data: d,
  onCreateClient,
  actions,
  loading = false,
  error = '',
  onRetry,
  initialSelectedClientId = null,
}: ClientsViewProps) {
  const searchId = useId();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const rowButtonsRef = useRef<Map<string, HTMLButtonElement>>(new Map());

  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<ClientSortKey>('name-asc');
  const [searchFocused, setSearchFocused] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    initialSelectedClientId,
  );

  const directory = useMemo(
    () => buildClientDirectory(d.clients, d.orders, query, sortBy),
    [d.clients, d.orders, query, sortBy],
  );

  const selectedClient = useMemo(
    () =>
      selectedClientId
        ? d.clients.find((client) => client.id === selectedClientId) ?? null
        : null,
    [d.clients, selectedClientId],
  );

  const selectedOrders = useMemo(
    () => (selectedClient ? getClientOrders(d.orders, selectedClient.id) : []),
    [d.orders, selectedClient],
  );

  const handleClearSearch = useCallback(() => {
    setQuery('');
    requestAnimationFrame(() => searchInputRef.current?.focus());
  }, []);

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape' && query.length > 0) {
      event.preventDefault();
      setQuery('');
    }
  };

  const handleDirectoryKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (directory.length === 0) return;
    let targetIndex = -1;
    if (event.key === 'ArrowDown') {
      targetIndex = (index + 1) % directory.length;
    } else if (event.key === 'ArrowUp') {
      targetIndex = (index - 1 + directory.length) % directory.length;
    } else if (event.key === 'Home') {
      targetIndex = 0;
    } else if (event.key === 'End') {
      targetIndex = directory.length - 1;
    }
    if (targetIndex < 0) return;
    event.preventDefault();
    const nextEntry = directory[targetIndex];
    if (nextEntry) {
      rowButtonsRef.current.get(nextEntry.client.id)?.focus();
    }
  };

  const handleBackToDirectory = useCallback(() => {
    const previousId = selectedClientId;
    setSelectedClientId(null);
    if (previousId) {
      requestAnimationFrame(() => {
        rowButtonsRef.current.get(previousId)?.focus();
      });
    }
  }, [selectedClientId]);

  const trimmedQuery = query.trim();
  const isFiltered = trimmedQuery.length > 0;
  const isEmptyDatabase = !loading && !error && d.clients.length === 0;
  const isNoResults = !loading && !error && d.clients.length > 0 && directory.length === 0;

  return (
    <section
      className="panel clients-view cv-shell"
      aria-label="Directorio de clientes e historial"
    >
      <div className="cv-toolbar" role="region" aria-label="Búsqueda y acciones de clientes">
        <div className="cv-search-wrap">
          <label htmlFor={searchId} className="sr-only">
            Buscar clientes
          </label>
          <div className={`cv-search-box${searchFocused ? ' is-focused' : ''}`}>
            <span className="cv-search-box__icon" aria-hidden="true">
              <Search size={16} strokeWidth={2} />
            </span>
            <input
              ref={searchInputRef}
              id={searchId}
              type="search"
              value={query}
              placeholder="Buscar por nombre o teléfono..."
              autoComplete="off"
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
            />
            {query.length > 0 && (
              <button
                type="button"
                className="cv-search-box__clear"
                aria-label="Limpiar búsqueda"
                onClick={handleClearSearch}
              >
                <X size={14} strokeWidth={2.2} aria-hidden="true" />
              </button>
            )}
          </div>
        </div>

        <div className="cv-toolbar-actions">
          <div className="cv-sort-field">
            <Select
              value={sortBy}
              onChange={(value) => setSortBy(value as ClientSortKey)}
              options={CLIENT_SORT_OPTIONS}
              icon={<ArrowUpDown size={14} strokeWidth={2} aria-hidden="true" />}
              ariaLabel="Ordenar clientes"
            />
          </div>

          <button
            type="button"
            className="clients-view__create cv-create-btn"
            onClick={onCreateClient}
          >
            <Plus size={16} strokeWidth={2.2} aria-hidden="true" />
            <span>Nuevo cliente</span>
          </button>
        </div>
      </div>

      {loading && (
        <div
          className="cv-workspace cv-workspace--loading"
          role="status"
          aria-busy="true"
          aria-label="Cargando clientes"
        >
          <div className="cv-directory-card">
            <div className="cv-directory-card__header">
              <div className="cv-skeleton cv-skeleton--title" />
              <div className="cv-skeleton cv-skeleton--pill" />
            </div>
            <div className="cv-skeleton-list">
              {[0, 1, 2, 3, 4].map((idx) => (
                <div key={idx} className="cv-skeleton-row">
                  <div className="cv-skeleton cv-skeleton--avatar" />
                  <div className="cv-skeleton-lines">
                    <div className="cv-skeleton cv-skeleton--name" />
                    <div className="cv-skeleton cv-skeleton--phone" />
                  </div>
                  <div className="cv-skeleton cv-skeleton--count" />
                </div>
              ))}
            </div>
          </div>

          <div className="cv-detail-card">
            <div className="cv-skeleton-detail">
              <div className="cv-skeleton cv-skeleton--avatar-lg" />
              <div className="cv-skeleton-lines">
                <div className="cv-skeleton cv-skeleton--heading" />
                <div className="cv-skeleton cv-skeleton--sub" />
              </div>
            </div>
            <div className="cv-skeleton-cards">
              <div className="cv-skeleton cv-skeleton--card" />
              <div className="cv-skeleton cv-skeleton--card" />
            </div>
          </div>
          <span className="sr-only">Cargando clientes…</span>
        </div>
      )}

      {!loading && error && (
        <div className="cv-state-card cv-state-card--error" role="alert">
          <span className="cv-state-card__icon" aria-hidden="true">
            <AlertCircle size={22} strokeWidth={1.9} />
          </span>
          <h2>No pudimos cargar los clientes</h2>
          <p>{error}</p>
          {onRetry && (
            <button type="button" className="cv-state-card__btn" onClick={onRetry}>
              <RotateCcw size={14} strokeWidth={2} aria-hidden="true" />
              <span>Reintentar</span>
            </button>
          )}
        </div>
      )}

      {isEmptyDatabase && (
        <div className="cv-state-card" role="status">
          <span className="cv-state-card__icon" aria-hidden="true">
            <Users size={22} strokeWidth={1.8} />
          </span>
          <h2>Todavía no hay clientes</h2>
          <p>
            Agregá el primer cliente para llevar el seguimiento ordenado de sus equipos y reparaciones.
          </p>
          <button
            type="button"
            className="cv-create-btn"
            onClick={onCreateClient}
          >
            <UserPlus size={15} strokeWidth={2} aria-hidden="true" />
            <span>Crear primer cliente</span>
          </button>
        </div>
      )}

      {!loading && !error && d.clients.length > 0 && (
        <div
          className="cv-workspace"
          data-has-selection={selectedClient ? 'true' : 'false'}
        >
          <div className="cv-directory-card" aria-label="Listado de clientes">
            <div className="cv-directory-card__header">
              <div className="cv-directory-card__title">
                <span className="cv-directory-card__icon" aria-hidden="true">
                  <Users size={15} strokeWidth={2} />
                </span>
                <h2>Clientes</h2>
              </div>
              <span className="cv-directory-card__count" aria-live="polite">
                {isFiltered
                  ? `${directory.length} de ${d.clients.length}`
                  : `${d.clients.length} ${d.clients.length === 1 ? 'cliente' : 'clientes'}`}
              </span>
            </div>

            {isNoResults ? (
              <div className="cv-directory-empty" role="status">
                <span className="cv-directory-empty__icon" aria-hidden="true">
                  <Search size={18} strokeWidth={1.8} />
                </span>
                <strong>No se encontraron clientes.</strong>
                <p>No hay coincidencias para «{trimmedQuery}».</p>
                <button
                  type="button"
                  className="cv-clear-btn"
                  onClick={handleClearSearch}
                >
                  <X size={13} strokeWidth={2.2} aria-hidden="true" />
                  <span>Limpiar búsqueda</span>
                </button>
              </div>
            ) : (
              <div className="cv-directory-list" role="list" aria-label="Clientes registrados">
                {directory.map((entry, index) => {
                  const isSelected = selectedClient?.id === entry.client.id;
                  const tone = getAvatarTone(entry.client.id || entry.client.name);
                  const initial = getClientInitial(entry.client.name);

                  return (
                    <article
                      key={entry.client.id}
                      role="listitem"
                      className={`client cv-client-item${isSelected ? ' is-selected' : ''}`}
                      data-selected={isSelected ? 'true' : undefined}
                    >
                      <button
                        ref={(node) => {
                          if (node) {
                            rowButtonsRef.current.set(entry.client.id, node);
                          } else {
                            rowButtonsRef.current.delete(entry.client.id);
                          }
                        }}
                        type="button"
                        className="cv-client-row"
                        aria-pressed={isSelected}
                        aria-current={isSelected ? 'true' : undefined}
                        onClick={() => setSelectedClientId(entry.client.id)}
                        onKeyDown={(event) => handleDirectoryKeyDown(event, index)}
                      >
                        <span
                          className={`cv-avatar cv-avatar--${tone}`}
                          aria-hidden="true"
                        >
                          {initial}
                        </span>

                        <div className="mv-client-header cv-client-info">
                          <h3>{entry.client.name}</h3>
                          <p className="cv-client-phone">{entry.client.phone}</p>
                        </div>

                        <div className="cv-client-end">
                          <span className="cv-client-orders-count">
                            {formatOrderCountLabel(entry.orderCount)}
                          </span>
                          <ChevronRight
                            size={15}
                            strokeWidth={2}
                            className="cv-client-chevron"
                            aria-hidden="true"
                          />
                        </div>
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </div>

          <div className="cv-detail-column">
            <ClientHistoryPanel
              client={selectedClient}
              orders={selectedOrders}
              totalClients={d.clients.length}
              actions={actions}
              onBackToDirectory={handleBackToDirectory}
            />
          </div>
        </div>
      )}
    </section>
  );
}
