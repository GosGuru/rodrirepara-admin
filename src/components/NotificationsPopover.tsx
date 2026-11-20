import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import {
  Bell,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Clock,
  Wallet,
  Wrench,
} from "lucide-react";
import type { Data, Order } from "../repository";
import "./header-overlays.css";

const EXIT_MS = 165;

type NoticeKind = "ready" | "payment" | "waiting";
type OperationalNotice = {
  id: string;
  kind: NoticeKind;
  order: Order;
  title: string;
  subtitle: string;
  tag: string;
};

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function compactMoney(n: number): string {
  return "$" + n.toLocaleString("es-AR");
}

function buildOperationalNotices(data?: Data): OperationalNotice[] {
  if (!data) return [];
  const clientName = (clientId: string) =>
    data.clients.find((c) => c.id === clientId)?.name ?? "Cliente";

  const items: OperationalNotice[] = [];
  for (const order of data.orders) {
    if (order.repair === "Cerrado") continue;
    const name = clientName(order.clientId);

    if (order.repair === "Terminado" && order.delivery === "Pendiente") {
      items.push({
        id: `ready-${order.id}`,
        kind: "ready",
        order,
        title: `${name} · Lista para entregar`,
        subtitle: `${order.id} · Lavarropas ${order.equipment}`,
        tag: "Entregar",
      });
    }

    if (order.price !== null && order.price > order.paid) {
      items.push({
        id: `pay-${order.id}`,
        kind: "payment",
        order,
        title: `${name} · Saldo por cobrar`,
        subtitle: `${order.id} · Lavarropas ${order.equipment}`,
        tag: compactMoney(order.price - order.paid),
      });
    }

    if (order.repair === "Esperando aprobación" || order.repair === "Esperando repuestos") {
      items.push({
        id: `wait-${order.id}`,
        kind: "waiting",
        order,
        title: `${name} · ${order.repair}`,
        subtitle: `${order.id} · Lavarropas ${order.equipment}`,
        tag: order.mode,
      });
    }
  }
  return items;
}

export function NotificationsPopover({
  data,
  onSelectOrder,
}: {
  data?: Data;
  onSelectOrder?: (order: Order, trigger: HTMLElement) => void;
}) {
  const [open, setOpen] = useState(false);
  const [rendered, setRendered] = useState(false);
  const [phase, setPhase] = useState<"entering" | "open" | "closing">("entering");
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const exitTimer = useRef<number | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: -9999, left: -9999 });

  const notices = useMemo(() => buildOperationalNotices(data), [data]);
  const unreadCount = useMemo(
    () => notices.filter((n) => !readIds.has(n.id)).length,
    [notices, readIds],
  );
  const visibleNotices = useMemo(
    () => (tab === "unread" ? notices.filter((n) => !readIds.has(n.id)) : notices),
    [notices, readIds, tab],
  );

  const clearExitTimer = useCallback(() => {
    if (exitTimer.current !== null) {
      window.clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }
  }, []);

  const openPopover = useCallback(() => {
    clearExitTimer();
    setRendered(true);
    setOpen(true);
    setPhase("entering");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setPhase("open"));
    });
  }, [clearExitTimer]);

  const closePopover = useCallback(
    (restoreFocus = false) => {
      clearExitTimer();
      setOpen(false);
      if (prefersReducedMotion()) {
        setRendered(false);
        setPhase("entering");
        if (restoreFocus) triggerRef.current?.focus();
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

  useLayoutEffect(() => {
    if (!rendered || !triggerRef.current) return;
    function updatePos() {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      const panelW = Math.min(392, window.innerWidth - 20);
      let left = rect.right - panelW;
      if (left < 10) left = 10;
      if (left + panelW > window.innerWidth - 10) left = window.innerWidth - panelW - 10;
      setPos({ top: rect.bottom + 8, left });
    }
    updatePos();
    window.addEventListener("resize", updatePos);
    return () => window.removeEventListener("resize", updatePos);
  }, [rendered]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        closePopover(true);
      }
    }
    function onPointerDown(e: MouseEvent) {
      const target = e.target as Node | null;
      if (target && (panelRef.current?.contains(target) || triggerRef.current?.contains(target))) return;
      closePopover(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [open, closePopover]);

  function markAllRead() {
    setReadIds(new Set(notices.map((n) => n.id)));
  }

  function handleSelect(notice: OperationalNotice) {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(notice.id);
      return next;
    });
    closePopover(false);
    if (triggerRef.current) onSelectOrder?.(notice.order, triggerRef.current);
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`top-icon-btn top-bell-btn${open ? " is-open" : ""}`}
        aria-label={
          unreadCount > 0
            ? `Notificaciones operativas (${unreadCount} sin leer)`
            : "Notificaciones operativas"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => (open ? closePopover(false) : openPopover())}
      >
        <Bell size={15} strokeWidth={1.9} className="top-bell-icon" aria-hidden="true" />
        {unreadCount > 0 && <span className="top-bell-dot" aria-hidden="true" />}
      </button>

      {rendered &&
        createPortal(
          <div
            ref={panelRef}
            className={`notif-popover notif-popover--${phase}`}
            role="dialog"
            aria-label="Notificaciones del tablero"
            style={{ top: pos.top, left: pos.left }}
          >
            <header className="notif-header">
              <div className="notif-header__title">
                <strong>Notificaciones</strong>
                {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
              </div>
              {unreadCount > 0 && (
                <button type="button" className="notif-mark-btn" onClick={markAllRead}>
                  <CheckCheck size={13} strokeWidth={2} aria-hidden="true" />
                  <span>Marcar leídas</span>
                </button>
              )}
            </header>

            <div className="notif-tabs" role="tablist" aria-label="Filtrar notificaciones">
              <button
                type="button"
                role="tab"
                aria-selected={tab === "all"}
                className={tab === "all" ? "is-active" : undefined}
                onClick={() => setTab("all")}
              >
                Todas ({notices.length})
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tab === "unread"}
                className={tab === "unread" ? "is-active" : undefined}
                onClick={() => setTab("unread")}
              >
                Sin leer ({unreadCount})
              </button>
            </div>

            <div className="notif-body">
              {visibleNotices.length === 0 ? (
                <div className="notif-empty">
                  <span className="notif-empty__icon" aria-hidden="true">
                    <CheckCircle2 size={18} strokeWidth={1.8} />
                  </span>
                  <strong>Todo al día</strong>
                  <p>
                    {tab === "unread"
                      ? "No tenés avisos sin leer en este momento."
                      : "No hay avisos operativos pendientes."}
                  </p>
                </div>
              ) : (
                <ul className="notif-list">
                  {visibleNotices.map((item, idx) => {
                    const unread = !readIds.has(item.id);
                    const staggerStyle = { "--row-idx": Math.min(idx, 5) } as CSSProperties;
                    const Icon =
                      item.kind === "ready"
                        ? CheckCircle2
                        : item.kind === "payment"
                          ? Wallet
                          : item.order.repair === "Esperando repuestos"
                            ? Wrench
                            : Clock;
                    return (
                      <li key={item.id} style={staggerStyle}>
                        <button
                          type="button"
                          className={`notif-row${unread ? " is-unread" : ""}`}
                          onClick={() => handleSelect(item)}
                        >
                          <span className={`notif-row__icon notif-row__icon--${item.kind}`} aria-hidden="true">
                            <Icon size={15} strokeWidth={1.9} />
                          </span>
                          <span className="notif-row__copy">
                            <strong>{item.title}</strong>
                            <small>{item.subtitle}</small>
                          </span>
                          <span className="notif-row__meta">
                            <span className={`notif-tag notif-tag--${item.kind}`}>{item.tag}</span>
                            {unread && <span className="notif-unread-dot" aria-label="Sin leer" />}
                            <ChevronRight size={14} strokeWidth={2} className="notif-row__chev" aria-hidden="true" />
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <footer className="notif-footer">
              <span>Avisos operativos del tablero · Sin mensajería externa</span>
            </footer>
          </div>,
          document.body,
        )}
    </>
  );
}
