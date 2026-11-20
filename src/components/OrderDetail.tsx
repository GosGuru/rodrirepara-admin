import { useEffect, useId, useRef, useState } from "react";
import {
  Calendar,
  Check,
  ChevronDown,
  CreditCard,
  FileText,
  MapPin,
  Pencil,
  Phone,
  Tag,
  UserRound,
  Wallet,
  Wrench,
  X,
} from "lucide-react";
import type { Data, Order } from "../repository";
import type { WorkshopActions } from "./workshop/actions";
import type { OrderSheetInitialForm } from "./OrderSheetProvider";
import { OrderEditor } from "./workshop/OrderEditor";
import { PaymentForm } from "./workshop/PaymentForm";
import { money, paymentStatus } from "../selectors";
import { moveChoices } from "../views/repair-board";
import { StatusPill } from "./StatusPill";
import { SideSheet } from "./SideSheet";
import { normalizeWhatsAppDigits } from "../views/overview-board/ContactDrawer";
import "./order-detail.css";

type DetailTab = "resumen" | "historial" | "gastos";

const STEPS = ["Recepción", "Diagnóstico", "Reparación", "Listo"] as const;
const ALL_STATES = [
  ...moveChoices.pending,
  ...moveChoices.progress,
  ...moveChoices.ready,
] as const;

function compactMoney(n: number): string {
  return "$" + n.toLocaleString("es-AR");
}

function formatDateEs(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso || "Sin fecha";
  const d = new Date(`${iso}T00:00:00`);
  if (!Number.isFinite(d.valueOf())) return iso;
  return new Intl.DateTimeFormat("es-UY", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(d);
}

function repairStepIndex(repair: string): number {
  if (repair === "Visita o recepción") return 0;
  if (repair === "Esperando aprobación" || repair === "Esperando repuestos") return 1;
  if (repair === "En reparación" || repair === "En proceso") return 2;
  if (repair === "Terminado" || repair === "Cerrado") return 3;
  return 1;
}

function statusTone(repair: string): "pending" | "progress" | "ready" {
  if (moveChoices.pending.includes(repair)) return "pending";
  if (repair === "Terminado" || repair === "Cerrado") return "ready";
  return "progress";
}

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 20.5l1.6-5.1A8.5 8.5 0 1 1 21 11.5Z" />
      <path d="M9.5 9.2c.2-.4.5-.5.8-.3l1 .6c.3.2.4.5.2.8l-.4.7c.5.9 1.2 1.6 2.1 2.1l.7-.4c.3-.2.6-.1.8.2l.6 1c.2.3.1.6-.3.8-.7.4-1.6.5-2.6.1-1.9-.7-3.4-2.2-4.1-4.1-.4-1-.3-1.9.1-2.6Z" />
    </svg>
  );
}

export function OrderDetail({
  order,
  data,
  open,
  close,
  id,
  actions,
  onBusyChange,
  sheetOpen,
  initialForm = null,
  openToken = 0,
}: {
  order: Order;
  data: Data;
  open: (o: Order) => void;
  close?: () => void;
  id?: string;
  actions?: WorkshopActions;
  onBusyChange?: (busy: boolean) => void;
  sheetOpen?: boolean;
  initialForm?: OrderSheetInitialForm;
  openToken?: number;
}) {
  const [form, setForm] = useState<"edit" | "payment" | null>(null);
  const [tab, setTab] = useState<DetailTab>("resumen");
  const [statusMenuOpen, setStatusMenuOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [quickError, setQuickError] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const paymentButton = useRef<HTMLButtonElement>(null);
  const generated = useId();
  const titleId = `${id ?? generated}-title`;
  const formId = `${id ?? generated}-form`;

  const noBalance = order.price !== null && order.paid >= order.price;

  useEffect(() => {
    if (!sheetOpen) {
      setStatusMenuOpen(false);
      setContactOpen(false);
      setQuickError("");
      return;
    }
    setTab("resumen");
    setStatusMenuOpen(false);
    setContactOpen(false);
    setQuickError("");
    if (initialForm === "edit" && actions) {
      setForm("edit");
      onBusyChange?.(true);
    } else if (initialForm === "payment" && actions && !noBalance) {
      setForm("payment");
      onBusyChange?.(true);
    } else {
      setForm(null);
      onBusyChange?.(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sheetOpen, openToken, order.id]);

  function start(kind: "edit" | "payment") {
    if (pending.current) return;
    setStatusMenuOpen(false);
    setContactOpen(false);
    setQuickError("");
    onBusyChange?.(true);
    setForm(kind);
  }
  function finish(kind: "edit" | "payment") {
    if (pending.current) return;
    setForm(null);
    onBusyChange?.(false);
    requestAnimationFrame(() => {
      const target = kind === "edit" ? editButton.current : paymentButton.current;
      (target && !target.disabled ? target : editButton.current)?.focus();
    });
  }
  async function save(kind: "edit" | "payment", operation: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    onBusyChange?.(true);
    try {
      await operation();
      pending.current = false;
      finish(kind);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function quickUpdate(patch: Partial<Order>) {
    if (!actions || pending.current) return;
    pending.current = true;
    setBusy(true);
    setQuickError("");
    onBusyChange?.(true);
    try {
      await actions.updateOrder(order.id, patch);
      setStatusMenuOpen(false);
    } catch (err) {
      setQuickError(err instanceof Error ? err.message : "No se pudo guardar el cambio.");
    } finally {
      pending.current = false;
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  const payments = data.payments.filter(payment => payment.orderId === order.id);
  const orderParts = data.partsPurchases.filter(part => part.orderId === order.id);
  const client = data.clients.find(c => c.id === order.clientId);
  const original = data.orders.find(o => o.id === order.originalId);
  const remainingBalance = order.price === null ? null : Math.max(0, order.price - order.paid);
  const clientDigits = client?.phone.replace(/\D/g, "") ?? "";
  const clientWaDigits = normalizeWhatsAppDigits(client?.phone ?? "");

  // Preserve original inline rendering (sheetOpen === undefined) 100% intact for tests and inline consumers.
  if (sheetOpen === undefined) {
    const fields = [
      ["Cliente", `${client?.name ?? "Sin cliente"} · ${client?.phone ?? "Sin teléfono"}`],
      ["Modalidad y dirección", `${order.mode} · ${order.address}`],
      ["Falla", order.fault], ["Diagnóstico", order.diagnosis || "Pendiente"], ["Repuestos", order.parts || "Sin asignar"],
      ["Costo de repuestos", money(order.partsCost)], ["Mano de obra", money(order.labor)], ["Presupuesto", money(order.quote)],
      ["Precio final", order.price === null ? "Sin definir" : money(order.price)], ["Reparación", order.repair],
      ["Cobro", `${paymentStatus(order)} · ${money(order.paid)}`], ["Entrega", order.delivery],
      ["Ingreso", order.entry], ["Finalización", order.finish || "Pendiente"], ["Responsable", order.owner], ["Fotografías", "Sin fotografías adjuntas"],
    ];
    const status = (
      <div className="inline-order-status" aria-label="Estados de la orden">
        <StatusPill kind="repair" value={order.repair} />
        <StatusPill kind="payment" value={paymentStatus(order)} />
        <StatusPill kind="delivery" value={order.delivery} />
      </div>
    );
    const actionsRead = actions && (
      <>
        <button key="open-payment" ref={paymentButton} type="button" disabled={noBalance} onClick={() => start("payment")}>
          <Wallet size={16} aria-hidden="true" /> Registrar cobro
        </button>
        <button key="open-editor" ref={editButton} className="primary" type="button" onClick={() => start("edit")}>
          <Pencil size={16} aria-hidden="true" /> Editar orden
        </button>
      </>
    );
    return (
      <section id={id} role="region" aria-label={`Detalle de ${order.id} · ${order.equipment}`} className="inline-order-detail">
        <header className="inline-order-heading">
          <h3>Detalle de {order.id} · {order.equipment}</h3>
          <div className="inline-order-actions">
            {!form && actionsRead}
            <button type="button" disabled={busy || !!form} onClick={close}>Cerrar detalle</button>
          </div>
        </header>
        {status}
        {!form && actions && noBalance && <p>No hay saldo cobrable: el precio final ya está cubierto.</p>}
        {form === "edit" && actions && (
          <OrderEditor
            key={order.id}
            order={order}
            clients={data.clients}
            orders={data.orders}
            formId={formId}
            hideActions={false}
            showExamples={false}
            onSave={patch => { const targetId = order.id; return save("edit", () => actions.updateOrder(targetId, patch)); }}
            onCancel={() => finish("edit")}
          />
        )}
        {form === "payment" && actions && (
          <PaymentForm
            key={order.id}
            order={order}
            formId={formId}
            hideActions={false}
            showExamples={false}
            onSave={input => { const targetId = order.id; return save("payment", () => actions.registerPayment(targetId, input)); }}
            onCancel={() => finish("payment")}
          />
        )}
        {!form && (
          <>
            <section className="inline-order-group inline-order-work">
              <h3>Trabajo</h3>
              <dl>
                {[...fields.slice(0, 5), ...fields.slice(12)].map(([a, b]) => (
                  <div key={a} className={a === "Falla" ? "inline-order-fault" : undefined}>
                    <dt>{a}</dt><dd>{b}</dd>
                  </div>
                ))}
              </dl>
            </section>
            {original && (
              <p>Garantía vinculada: <button type="button" onClick={() => { if (!pending.current) open(original); }}>Ver orden original {original.id}</button></p>
            )}
            <section className="inline-order-group">
              <h3>Importes</h3>
              <dl>{fields.slice(5, 12).map(([a, b]) => <div key={a}><dt>{a}</dt><dd>{b}</dd></div>)}</dl>
            </section>
            <section className="inline-order-group" aria-label="Cobros registrados">
              <h3>Cobros registrados</h3>
              <p>Los registros disponibles y el acumulado pueden no coincidir; el historial anterior puede estar incompleto.</p>
              {payments.length ? <ul>{payments.map(payment => <li key={payment.id}>{payment.date} · {money(payment.amount)}</li>)}</ul> : <p>No hay cobros registrados disponibles.</p>}
            </section>
            <p>Detalle de servicio · <strong>Sin validez fiscal</strong>.</p>
          </>
        )}
      </section>
    );
  }

  // High-fidelity Drawer mode (Panel #5)
  const stepIdx = repairStepIndex(order.repair);
  const tone = statusTone(order.repair);
  const hasNotes = Boolean(order.diagnosis?.trim() || (order.parts?.trim() && order.parts.trim() !== "Sin repuestos asignados" && order.parts.trim() !== "Sin repuestos"));

  const sheetHeader = (
    <div className="od-header">
      <div className="od-header__left">
        <span className="od-header__avatar" aria-hidden="true">
          <UserRound size={19} strokeWidth={1.85} />
        </span>
        <div className="od-header__copy">
          <h2 id={titleId}>{client?.name ?? "Sin cliente"}</h2>
          <p>
            {order.id} · Lavarropas {order.equipment}
            {form === "edit" ? " · Editar orden" : form === "payment" ? " · Registrar cobro" : ""}
          </p>
        </div>
      </div>
      <button
        type="button"
        className="od-close-btn"
        aria-label="Cerrar detalle"
        disabled={busy || !!form}
        onClick={close}
      >
        <X size={18} strokeWidth={1.9} aria-hidden="true" />
      </button>
    </div>
  );

  const sheetFooter = form ? (
    <div className="od-footer od-footer--form">
      <button type="button" className="od-btn od-btn--ghost" disabled={busy} onClick={() => finish(form)}>
        Cancelar {form === "edit" ? "edición" : "cobro"}
      </button>
      <button
        type="submit"
        form={formId}
        className="od-btn od-btn--dark"
        disabled={busy || (form === "payment" && noBalance)}
      >
        <Check size={14} strokeWidth={2.2} aria-hidden="true" />
        <span>{busy ? "Guardando…" : form === "edit" ? "Guardar cambios" : "Guardar cobro"}</span>
      </button>
    </div>
  ) : (
    <div className="od-footer">
      <button
        type="button"
        className={`od-btn od-btn--outline${contactOpen ? " is-active" : ""}`}
        disabled={!client?.phone}
        onClick={() => setContactOpen(prev => !prev)}
      >
        <WhatsAppIcon />
        <span>Contactar</span>
      </button>
      {actions && (
        <button
          ref={paymentButton}
          type="button"
          className="od-btn od-btn--outline"
          disabled={noBalance || busy}
          title={noBalance ? "El precio final ya está cubierto" : undefined}
          onClick={() => start("payment")}
        >
          <CreditCard size={14} strokeWidth={1.9} aria-hidden="true" />
          <span>Registrar cobro</span>
        </button>
      )}
      {actions && order.repair !== "Terminado" && order.repair !== "Cerrado" && (
        <button
          type="button"
          className="od-btn od-btn--dark"
          disabled={busy}
          onClick={() => quickUpdate({ repair: "Terminado" })}
        >
          <Check size={14} strokeWidth={2.2} aria-hidden="true" />
          <span>Marcar como lista</span>
        </button>
      )}
      {actions && (order.repair === "Terminado" || order.repair === "Cerrado") && order.delivery !== "Entregado" && (
        <button
          type="button"
          className="od-btn od-btn--deliver"
          disabled={busy}
          onClick={() => quickUpdate({ delivery: "Entregado" })}
        >
          <Check size={14} strokeWidth={2.2} aria-hidden="true" />
          <span>Marcar entregada</span>
        </button>
      )}
      {actions && (order.repair === "Terminado" || order.repair === "Cerrado") && order.delivery === "Entregado" && (
        <button
          ref={editButton}
          type="button"
          className="od-btn od-btn--dark"
          disabled={busy}
          onClick={() => start("edit")}
        >
          <Pencil size={14} strokeWidth={1.9} aria-hidden="true" />
          <span>Editar orden</span>
        </button>
      )}
    </div>
  );

  return (
    <SideSheet
      open={sheetOpen}
      titleId={titleId}
      className="side-sheet--panel side-sheet--order"
      header={sheetHeader}
      footer={sheetFooter}
      busy={busy || !!form}
      onRequestClose={() => { if (!pending.current && !form) close?.(); }}
    >
      <section id={id} role="region" aria-label={`Detalle de ${order.id} · ${order.equipment}`} className="od-body">
        {form === "edit" && actions && (
          <div className="od-subform">
            <OrderEditor
              key={order.id}
              order={order}
              clients={data.clients}
              orders={data.orders}
              formId={formId}
              hideActions
              showExamples
              onSave={patch => { const targetId = order.id; return save("edit", () => actions.updateOrder(targetId, patch)); }}
              onCancel={() => finish("edit")}
            />
          </div>
        )}

        {form === "payment" && actions && (
          <div className="od-subform">
            <PaymentForm
              key={order.id}
              order={order}
              formId={formId}
              hideActions
              showExamples
              onSave={input => { const targetId = order.id; return save("payment", () => actions.registerPayment(targetId, input)); }}
              onCancel={() => finish("payment")}
            />
          </div>
        )}

        {!form && (
          <>
            {/* 4-Step Progress Stepper */}
            <ol className="od-stepper" aria-label="Progreso de la reparación">
              {STEPS.map((label, idx) => {
                const state = idx < stepIdx ? "done" : idx === stepIdx ? "active" : "upcoming";
                return (
                  <li key={label} className={`od-step od-step--${state}`}>
                    <span className="od-step__track" aria-hidden="true">
                      <span className="od-step__dot">
                        {(state === "done" || state === "active") && <Check size={11} strokeWidth={2.7} />}
                      </span>
                    </span>
                    <span className="od-step__label">{label}</span>
                  </li>
                );
              })}
            </ol>

            {/* Segmented Tabs */}
            <div className="od-tabs" role="tablist" aria-label="Secciones del detalle">
              {(
                [
                  ["resumen", "Resumen"],
                  ["historial", "Historial"],
                  ["gastos", "Gastos"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={tab === key}
                  className={tab === key ? "od-tab is-active" : "od-tab"}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>

            {quickError && <p role="alert" className="od-alert">{quickError}</p>}

            {/* TAB 1: RESUMEN */}
            {tab === "resumen" && (
              <div className="od-grid">
                <div className="od-col">
                  {/* Estado actual card */}
                  <div className="od-card">
                    <div className="od-card__title-row">
                      <h3>Estado actual</h3>
                      {actions && (
                        <button
                          ref={editButton}
                          type="button"
                          className="od-inline-edit-link"
                          disabled={busy}
                          onClick={() => start("edit")}
                        >
                          <Pencil size={12} aria-hidden="true" /> Editar
                        </button>
                      )}
                    </div>

                    <div className="od-status-picker">
                      <button
                        type="button"
                        className={`od-status-trigger od-status-trigger--${tone}`}
                        disabled={!actions || busy}
                        aria-haspopup="listbox"
                        aria-expanded={statusMenuOpen}
                        onClick={() => setStatusMenuOpen(prev => !prev)}
                      >
                        <span>{order.repair}</span>
                        {actions && <ChevronDown size={14} strokeWidth={2} aria-hidden="true" />}
                      </button>
                      {statusMenuOpen && actions && (
                        <ul className="od-status-menu" role="listbox" aria-label="Cambiar estado de reparación">
                          {ALL_STATES.map(stateLabel => (
                            <li key={stateLabel} role="option" aria-selected={order.repair === stateLabel}>
                              <button
                                type="button"
                                className={order.repair === stateLabel ? "is-selected" : undefined}
                                disabled={busy}
                                onClick={() => quickUpdate({ repair: stateLabel })}
                              >
                                <span>{stateLabel}</span>
                                {order.repair === stateLabel && <Check size={13} strokeWidth={2.2} aria-hidden="true" />}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="od-indep-states" aria-label="Estados independientes">
                      <div className="od-indep-item">
                        <span>Cobro</span>
                        <StatusPill kind="payment" value={paymentStatus(order)} />
                      </div>
                      <div className="od-indep-item">
                        <span>Entrega</span>
                        {actions ? (
                          <button
                            type="button"
                            className="od-delivery-toggle"
                            disabled={busy}
                            title="Cambiar estado de entrega de forma independiente"
                            onClick={() =>
                              quickUpdate({
                                delivery: order.delivery === "Entregado" ? "Pendiente" : "Entregado",
                              })
                            }
                          >
                            <StatusPill kind="delivery" value={order.delivery} />
                          </button>
                        ) : (
                          <StatusPill kind="delivery" value={order.delivery} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Datos del trabajo card */}
                  <div className="od-card">
                    <h3>Datos del trabajo</h3>
                    <ul className="od-meta-list">
                      <li>
                        <MapPin size={14} strokeWidth={1.85} aria-hidden="true" />
                        <div>
                          <strong>{order.mode}</strong>
                          {order.address && <span>{order.address}</span>}
                        </div>
                      </li>
                      <li>
                        <Calendar size={14} strokeWidth={1.85} aria-hidden="true" />
                        <div>
                          <span>Ingresada el {formatDateEs(order.entry)}</span>
                        </div>
                      </li>
                      <li>
                        <Tag size={14} strokeWidth={1.85} aria-hidden="true" />
                        <div className="od-meta-inline">
                          <span>Precio final</span>
                          <strong>{order.price === null ? "—" : compactMoney(order.price)}</strong>
                        </div>
                      </li>
                      <li>
                        <Wrench size={14} strokeWidth={1.85} aria-hidden="true" />
                        <div>
                          <span>{order.fault}</span>
                        </div>
                      </li>
                    </ul>
                    {original && (
                      <button
                        type="button"
                        className="od-warranty-link"
                        onClick={() => { if (!pending.current) open(original); }}
                      >
                        Garantía de orden {original.id} →
                      </button>
                    )}
                  </div>
                </div>

                {/* Right column: Notas */}
                <div className="od-card od-card--notes">
                  <div className="od-card__title-row">
                    <h3 className="od-notes-title">
                      <FileText size={14} strokeWidth={1.9} aria-hidden="true" />
                      <span>Notas</span>
                    </h3>
                    {actions && (
                      <button
                        type="button"
                        className="od-icon-pencil"
                        aria-label="Editar notas y diagnóstico"
                        disabled={busy}
                        onClick={() => start("edit")}
                      >
                        <Pencil size={13} strokeWidth={1.9} aria-hidden="true" />
                      </button>
                    )}
                  </div>
                  <div className="od-notes-box">
                    {hasNotes ? (
                      <dl className="od-notes-dl">
                        <div>
                          <dt>Diagnóstico</dt>
                          <dd>{order.diagnosis || "Pendiente"}</dd>
                        </div>
                        <div>
                          <dt>Repuestos</dt>
                          <dd>{order.parts || "Sin asignar"}</dd>
                        </div>
                        <div>
                          <dt>Responsable</dt>
                          <dd>{order.owner}</dd>
                        </div>
                      </dl>
                    ) : (
                      <p className="od-notes-empty">Sin notas</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: HISTORIAL */}
            {tab === "historial" && (
              <div className="od-stack">
                <div className="od-card">
                  <h3>Seguimiento de la orden</h3>
                  <dl className="od-kv-grid">
                    <div><dt>Ingreso</dt><dd>{formatDateEs(order.entry)}</dd></div>
                    <div><dt>Finalización</dt><dd>{order.finish ? formatDateEs(order.finish) : "Pendiente"}</dd></div>
                    <div><dt>Responsable</dt><dd>{order.owner}</dd></div>
                    <div><dt>Teléfono</dt><dd>{client?.phone ?? "Sin teléfono"}</dd></div>
                  </dl>
                  {original && (
                    <button
                      type="button"
                      className="od-warranty-link"
                      onClick={() => { if (!pending.current) open(original); }}
                    >
                      Ver orden original {original.id} →
                    </button>
                  )}
                </div>

                <div className="od-card" aria-label="Cobros registrados">
                  <h3>Cobros registrados</h3>
                  <p className="od-muted-note">
                    Los registros disponibles y el acumulado pueden no coincidir; el historial anterior puede estar incompleto.
                  </p>
                  {payments.length ? (
                    <ul className="od-payment-list">
                      {payments.map(payment => (
                        <li key={payment.id}>
                          <span>{formatDateEs(payment.date)}</span>
                          <strong>{compactMoney(payment.amount)}</strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="od-notes-empty">No hay cobros registrados disponibles.</p>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: GASTOS / IMPORTES */}
            {tab === "gastos" && (
              <div className="od-stack">
                <div className="od-card">
                  <h3>Importes de la orden</h3>
                  <dl className="od-finance-list">
                    <div><dt>Costo de repuestos</dt><dd>{compactMoney(order.partsCost)}</dd></div>
                    <div><dt>Mano de obra</dt><dd>{compactMoney(order.labor)}</dd></div>
                    <div><dt>Presupuesto</dt><dd>{compactMoney(order.quote)}</dd></div>
                    <div className="is-strong">
                      <dt>Precio final</dt>
                      <dd>{order.price === null ? "Sin definir" : compactMoney(order.price)}</dd>
                    </div>
                    <div><dt>Cobrado</dt><dd>{compactMoney(order.paid)}</dd></div>
                    <div className="is-strong">
                      <dt>Saldo pendiente</dt>
                      <dd>{remainingBalance === null ? "Sin precio final" : compactMoney(remainingBalance)}</dd>
                    </div>
                  </dl>
                  {noBalance && (
                    <p className="od-muted-note">No hay saldo cobrable: el precio final ya está cubierto.</p>
                  )}
                </div>

                <div className="od-card">
                  <h3>Repuestos asociados</h3>
                  {orderParts.length ? (
                    <ul className="od-payment-list">
                      {orderParts.map(part => (
                        <li key={part.id}>
                          <div>
                            <strong>{part.name}</strong>
                            <span>{part.supplier} · {formatDateEs(part.date)} (x{part.quantity})</span>
                          </div>
                          <strong>{compactMoney(part.cost)}</strong>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="od-notes-empty">Sin compras de repuestos vinculadas.</p>
                  )}
                </div>

                <p className="od-fiscal-note">Detalle de servicio · <strong>Sin validez fiscal</strong>.</p>
              </div>
            )}

            {/* Inline Contact Strip (when clicking Contactar) */}
            {contactOpen && client?.phone && (
              <div className="od-contact-bar" role="region" aria-label="Opciones de contacto">
                <div className="od-contact-bar__info">
                  <Phone size={14} aria-hidden="true" />
                  <span>{client.name} · <strong>{client.phone}</strong></span>
                </div>
                <div className="od-contact-bar__actions">
                  <a
                    className="od-contact-link od-contact-link--wa"
                    href={`https://wa.me/${clientWaDigits}?text=${encodeURIComponent(
                      `Hola ${client.name}, te escribimos de Rodrigo Repara por tu lavarropas ${order.equipment}.`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <WhatsAppIcon /> WhatsApp
                  </a>
                  <a className="od-contact-link" href={`tel:${clientDigits}`}>
                    Llamar
                  </a>
                </div>
              </div>
            )}
          </>
        )}
      </section>
    </SideSheet>
  );
}
