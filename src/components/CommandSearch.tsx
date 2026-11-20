import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, Search, UserRound, Wrench, X } from "lucide-react";
import type { Client, Data, Order } from "../repository";
import { StatusPill } from "./StatusPill";
import "./header-overlays.css";

const EXIT_MS = 170;

export function detectMacOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform || navigator.platform || navigator.userAgent || "";
  return /mac|iphone|ipad|ipod/i.test(platform);
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type SearchResult =
  | { kind: "order"; id: string; order: Order; clientName: string }
  | { kind: "client"; id: string; client: Client; orderCount: number };

export function CommandSearch({
  data,
  onSelectOrder,
  onSelectClient,
  onSubmitQuery,
}: {
  data?: Data;
  onSelectOrder?: (order: Order, trigger: HTMLElement) => void;
  onSelectClient?: () => void;
  onSubmitQuery?: (query: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [phase, setPhase] = useState<"entering" | "open" | "closing">("entering");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMac, setIsMac] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const exitTimer = useRef<number | null>(null);

  useEffect(() => {
    setIsMac(detectMacOS());
  }, []);

  const clearExitTimer = useCallback(() => {
    if (exitTimer.current !== null) {
      window.clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }
  }, []);

  const openModal = useCallback(() => {
    clearExitTimer();
    setRendered(true);
    setOpen(true);
    setPhase("entering");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase("open"));
    });
  }, [clearExitTimer]);

  const closeModal = useCallback(
    (restoreFocus = true) => {
      clearExitTimer();
      setOpen(false);
      if (prefersReducedMotion()) {
        setRendered(false);
        setPhase("entering");
        if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
        return;
      }
      setPhase("closing");
      exitTimer.current = window.setTimeout(() => {
        setRendered(false);
        setPhase("entering");
        exitTimer.current = null;
        if (restoreFocus) triggerRef.current?.focus();
      }, EXIT_MS);
    },
    [clearExitTimer],
  );

  useEffect(() => () => clearExitTimer(), [clearExitTimer]);

  useEffect(() => {
    function onGlobalKeyDown(e: KeyboardEvent) {
      const modifier = isMac ? e.metaKey && !e.ctrlKey : e.ctrlKey && !e.metaKey;
      if (modifier && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) closeModal(true);
        else openModal();
      }
    }
    window.addEventListener("keydown", onGlobalKeyDown);
    return () => window.removeEventListener("keydown", onGlobalKeyDown);
  }, [isMac, open, openModal, closeModal]);

  useEffect(() => {
    if (!open) {
      return;
    }
    setQuery("");
    setActiveIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const results = useMemo<SearchResult[]>(() => {
    if (!data) return [];
    const q = query.trim().toLocaleLowerCase();
    const clientNameById = new Map(data.clients.map((c) => [c.id, c.name]));

    const matchingOrders = data.orders
      .filter((o) => {
        if (!q) return o.repair !== "Cerrado";
        const cName = clientNameById.get(o.clientId) ?? "";
        return [o.id, o.equipment, o.fault, o.repair, o.mode, cName].some((val) =>
          val.toLocaleLowerCase().includes(q),
        );
      })
      .slice(0, q ? 6 : 4)
      .map<SearchResult>((order) => ({
        kind: "order",
        id: `order-${order.id}`,
        order,
        clientName: clientNameById.get(order.clientId) ?? "Cliente desconocido",
      }));

    const matchingClients = q
      ? data.clients
          .filter(
            (c) =>
              c.name.toLocaleLowerCase().includes(q) ||
              c.phone.toLocaleLowerCase().includes(q),
          )
          .slice(0, 4)
          .map<SearchResult>((client) => ({
            kind: "client",
            id: `client-${client.id}`,
            client,
            orderCount: data.orders.filter((o) => o.clientId === client.id).length,
          }))
      : [];

    return [...matchingOrders, ...matchingClients];
  }, [data, query]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, results.length]);

  function activateResult(item: SearchResult) {
    const anchor = triggerRef.current ?? document.body;
    closeModal(false);
    if (item.kind === "order") {
      onSelectOrder?.(item.order, anchor);
    } else {
      onSelectClient?.();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeModal(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (results.length) setActiveIndex((i) => (i + 1) % results.length);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (results.length) setActiveIndex((i) => (i - 1 + results.length) % results.length);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (results[activeIndex]) {
        activateResult(results[activeIndex]);
      } else if (query.trim()) {
        const text = query.trim();
        closeModal(false);
        onSubmitQuery?.(text);
      }
    }
  }

  const shortcutLabel = isMac ? "⌘ K" : "Ctrl K";

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`top-search-trigger${open ? " is-open" : ""}`}
        aria-label={`Buscar reparaciones o clientes (${shortcutLabel})`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? closeModal(true) : openModal())}
      >
        <Search size={14} strokeWidth={1.95} className="top-search-trigger__icon" aria-hidden="true" />
        <span className="top-search-trigger__placeholder">Buscar…</span>
        <span className={`top-kbd-group${isMac ? " top-kbd-group--mac" : " top-kbd-group--win"}`} aria-hidden="true">
          <kbd>{isMac ? "⌘" : "Ctrl"}</kbd>
          <kbd>K</kbd>
        </span>
      </button>

      {rendered &&
        createPortal(
          <div
            className={`cmd-backdrop cmd-backdrop--${phase}`}
            role="presentation"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) closeModal(true);
            }}
          >
            <div
              className={`cmd-dialog cmd-dialog--${phase}`}
              role="dialog"
              aria-modal="true"
              aria-label="Buscador rápido"
              onKeyDown={handleKeyDown}
            >
              <div className="cmd-input-row">
                <Search size={16} strokeWidth={1.95} className="cmd-input-icon" aria-hidden="true" />
                <input
                  ref={inputRef}
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar orden, equipo, falla o cliente…"
                  aria-label="Buscar orden, equipo, falla o cliente"
                />
                {query && (
                  <button
                    type="button"
                    className="cmd-clear-btn"
                    aria-label="Limpiar búsqueda"
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  className="cmd-esc-btn"
                  aria-label="Cerrar buscador"
                  onClick={() => closeModal(true)}
                >
                  <kbd>Esc</kbd>
                </button>
              </div>

              <div className="cmd-results" role="listbox" aria-label="Resultados de búsqueda">
                <div className="cmd-section-label">
                  {query.trim() ? "Resultados" : "Reparaciones activas"}
                </div>

                {results.length === 0 ? (
                  <div className="cmd-empty">
                    <p>
                      {query.trim()
                        ? `No encontramos coincidencias para «${query}».`
                        : "Todavía no hay órdenes cargadas."}
                    </p>
                    {query.trim() && onSubmitQuery && (
                      <button
                        type="button"
                        className="cmd-fallback-btn"
                        onClick={() => {
                          const text = query.trim();
                          closeModal(false);
                          onSubmitQuery(text);
                        }}
                      >
                        <span>Ver en Reparaciones</span>
                        <ArrowRight size={13} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                ) : (
                  <ul className="cmd-list">
                    {results.map((item, idx) => {
                      const active = idx === activeIndex;
                      const staggerStyle = { "--row-idx": Math.min(idx, 5) } as CSSProperties;
                      if (item.kind === "order") {
                        return (
                          <li key={item.id} role="option" aria-selected={active} style={staggerStyle}>
                            <button
                              type="button"
                              className={`cmd-item${active ? " is-active" : ""}`}
                              onMouseEnter={() => setActiveIndex(idx)}
                              onClick={() => activateResult(item)}
                            >
                              <span className="cmd-item__icon cmd-item__icon--order" aria-hidden="true">
                                <Wrench size={14} strokeWidth={1.9} />
                              </span>
                              <span className="cmd-item__copy">
                                <strong>
                                  {item.clientName} <span>· {item.order.id}</span>
                                </strong>
                                <small>Lavarropas {item.order.equipment} — {item.order.fault}</small>
                              </span>
                              <StatusPill kind="repair" value={item.order.repair} />
                            </button>
                          </li>
                        );
                      }
                      return (
                        <li key={item.id} role="option" aria-selected={active} style={staggerStyle}>
                          <button
                            type="button"
                            className={`cmd-item${active ? " is-active" : ""}`}
                            onMouseEnter={() => setActiveIndex(idx)}
                            onClick={() => activateResult(item)}
                          >
                            <span className="cmd-item__icon cmd-item__icon--client" aria-hidden="true">
                              <UserRound size={14} strokeWidth={1.9} />
                            </span>
                            <span className="cmd-item__copy">
                              <strong>{item.client.name}</strong>
                              <small>{item.client.phone}</small>
                            </span>
                            <span className="cmd-item__meta">
                              {item.orderCount === 1 ? "1 orden" : `${item.orderCount} órdenes`}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <footer className="cmd-footer">
                <div className="cmd-hints">
                  <span><kbd>↑</kbd><kbd>↓</kbd> navegar</span>
                  <span><kbd>↵</kbd> abrir</span>
                  <span><kbd>Esc</kbd> cerrar</span>
                </div>
                <span className={`top-kbd-group${isMac ? " top-kbd-group--mac" : " top-kbd-group--win"}`}>
                  <kbd>{isMac ? "⌘" : "Ctrl"}</kbd>
                  <kbd>K</kbd>
                </span>
              </footer>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
