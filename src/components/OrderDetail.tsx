import { useId, useRef, useState } from "react";
import { Check, Pencil, Wallet, X } from "lucide-react";
import type { Data, Order } from "../repository";
import type { WorkshopActions } from "./workshop/actions";
import { OrderEditor } from "./workshop/OrderEditor";
import { PaymentForm } from "./workshop/PaymentForm";
import { money, paymentStatus } from "../selectors";
import { StatusPill } from "./StatusPill";
import { SideSheet } from "./SideSheet";
import "./order-detail.css";

export function OrderDetail({ order, data, open, close, id, actions, onBusyChange, sheetOpen }: {
  order: Order; data: Data; open: (o: Order) => void; close?: () => void; id?: string;
  actions?: WorkshopActions; onBusyChange?: (busy: boolean) => void; sheetOpen?: boolean;
}) {
  const [form, setForm] = useState<"edit" | "payment" | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const editButton = useRef<HTMLButtonElement>(null);
  const paymentButton = useRef<HTMLButtonElement>(null);
  const generated = useId();
  const titleId = `${id ?? generated}-title`;
  const formId = `${id ?? generated}-form`;
  function start(kind: "edit" | "payment") { if (pending.current) return; onBusyChange?.(true); setForm(kind); }
  function finish(kind: "edit" | "payment") {
    if (pending.current) return;
    setForm(null); onBusyChange?.(false);
    requestAnimationFrame(() => {
      const target = kind === "edit" ? editButton.current : paymentButton.current;
      (target && !target.disabled ? target : editButton.current)?.focus();
    });
  }
  async function save(kind: "edit" | "payment", operation: () => Promise<void>) {
    if (pending.current) return;
    pending.current = true; setBusy(true); onBusyChange?.(true);
    try {
      await operation();
      pending.current = false;
      finish(kind);
    } finally { pending.current = false; setBusy(false); }
  }
  const payments = data.payments.filter(payment => payment.orderId === order.id);
  const noBalance = order.price !== null && order.paid >= order.price;
  const client = data.clients.find(c => c.id === order.clientId);
  const original = data.orders.find(o => o.id === order.originalId);
  const fields = [
    ["Cliente", `${client?.name ?? "Sin cliente"} · ${client?.phone ?? "Sin teléfono"}`],
    ["Modalidad y dirección", `${order.mode} · ${order.address}`],
    ["Falla", order.fault], ["Diagnóstico", order.diagnosis || "Pendiente"], ["Repuestos", order.parts || "Sin asignar"],
    ["Costo de repuestos", money(order.partsCost)], ["Mano de obra", money(order.labor)], ["Presupuesto", money(order.quote)],
    ["Precio final", order.price === null ? "Sin definir" : money(order.price)], ["Reparación", order.repair],
    ["Cobro", `${paymentStatus(order)} · ${money(order.paid)}`], ["Entrega", order.delivery],
    ["Ingreso", order.entry], ["Finalización", order.finish || "Pendiente"], ["Responsable", order.owner], ["Fotografías", "Sin fotografías adjuntas"],
  ];
  const status = <div className="inline-order-status" aria-label="Estados de la orden"><StatusPill kind="repair" value={order.repair} /><StatusPill kind="payment" value={paymentStatus(order)} /><StatusPill kind="delivery" value={order.delivery} /></div>;
  const header = <div className="order-sheet-heading"><div className="order-sheet-topline"><span>{order.id} · {order.mode}{form === "edit" ? " · Editar orden" : form === "payment" ? " · Registrar cobro" : ""}</span><button type="button" className="order-sheet-close" aria-label="Cerrar detalle" disabled={busy || !!form} onClick={close}><X size={20} aria-hidden="true" /></button></div><h2 id={titleId}>{order.equipment}</h2><p className="order-sheet-client"><strong>{client?.name ?? "Sin cliente"}</strong><span>{client?.phone ?? "Sin teléfono"}</span></p>{status}</div>;
  const actionsRead = actions && <><button key="open-payment" ref={paymentButton} type="button" disabled={noBalance} onClick={() => start("payment")}><Wallet size={16} aria-hidden="true" /> Registrar cobro</button><button key="open-editor" ref={editButton} className="primary" type="button" onClick={() => start("edit")}><Pencil size={16} aria-hidden="true" /> Editar orden</button></>;
  const footer = form ? <><button key="cancel-operation" type="button" disabled={busy} onClick={() => finish(form)}>Cancelar {form === "edit" ? "edición" : "cobro"}</button><button key="save-operation" className="primary" type="submit" form={formId} disabled={busy || (form === "payment" && noBalance)}><Check size={16} aria-hidden="true" /> {busy ? "Guardando…" : form === "edit" ? "Guardar cambios" : "Guardar cobro"}</button></> : actionsRead;
  const detail = <section id={id} role="region" aria-label={`Detalle de ${order.id} · ${order.equipment}`} className="inline-order-detail">
    {sheetOpen === undefined && <header className="inline-order-heading"><h3>Detalle de {order.id} · {order.equipment}</h3><div className="inline-order-actions">{!form && actionsRead}<button type="button" disabled={busy || !!form} onClick={close}>Cerrar detalle</button></div></header>}
    {sheetOpen === undefined && status}
    {!form && actions && noBalance && <p>No hay saldo cobrable: el precio final ya está cubierto.</p>}
    {form === "edit" && actions && <OrderEditor key={order.id} order={order} clients={data.clients} orders={data.orders} formId={formId} hideActions={sheetOpen !== undefined} showExamples={sheetOpen !== undefined} onSave={patch => { const targetId = order.id; return save("edit", () => actions.updateOrder(targetId, patch)); }} onCancel={() => finish("edit")} />}
    {form === "payment" && actions && <PaymentForm key={order.id} order={order} formId={formId} hideActions={sheetOpen !== undefined} showExamples={sheetOpen !== undefined} onSave={input => { const targetId = order.id; return save("payment", () => actions.registerPayment(targetId, input)); }} onCancel={() => finish("payment")} />}
    {!form && <>
      <section className="inline-order-group inline-order-work"><h3>Trabajo</h3><dl>{[...fields.slice(0, 5), ...fields.slice(12)].map(([a, b]) => <div key={a} className={a === "Falla" ? "inline-order-fault" : undefined}><dt>{a}</dt><dd>{b}</dd></div>)}</dl></section>
      {!form && original && <p>Garantía vinculada: <button type="button" onClick={() => { if (!pending.current) open(original); }}>Ver orden original {original.id}</button></p>}
      <section className="inline-order-group"><h3>Importes</h3><dl>{fields.slice(5, 12).map(([a, b]) => <div key={a}><dt>{a}</dt><dd>{b}</dd></div>)}</dl></section>
      <section className="inline-order-group" aria-label="Cobros registrados"><h3>Cobros registrados</h3><p>Los registros disponibles y el acumulado pueden no coincidir; el historial anterior puede estar incompleto.</p>{payments.length ? <ul>{payments.map(payment => <li key={payment.id}>{payment.date} · {money(payment.amount)}</li>)}</ul> : <p>No hay cobros registrados disponibles.</p>}</section>
      <p>Detalle de servicio · <strong>Sin validez fiscal</strong>.</p>
    </>}
  </section>;
  if (sheetOpen === undefined) return detail;
  return <SideSheet open={sheetOpen} titleId={titleId} header={header} footer={footer} busy={busy || !!form} onRequestClose={() => { if (!pending.current && !form) close?.(); }}>{detail}</SideSheet>;
}
