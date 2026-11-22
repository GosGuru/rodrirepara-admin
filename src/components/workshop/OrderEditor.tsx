import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { Client, Order, OrderUpdate } from '../../repository';
import { money } from '../../selectors';
import './order-editor.css';

export type OrderEditorProps = {
  order: Order;
  clients: readonly Client[];
  orders: readonly Order[];
  onSave: (patch: OrderUpdate) => Promise<void>;
  onCancel: () => void;
  formId?: string;
  hideActions?: boolean;
  showExamples?: boolean;
  onBusyChange?: (busy: boolean) => void;
};

type Key = keyof OrderUpdate;
const fields: { title: string; items: { key: Key; label: string; required?: boolean; number?: boolean; multiline?: boolean }[] }[] = [
  { title: 'Cliente, equipo y servicio', items: [
    { key: 'clientId', label: 'Cliente' }, { key: 'equipment', label: 'Equipo', required: true },
    { key: 'mode', label: 'Modalidad' }, { key: 'address', label: 'Dirección', required: true },
    { key: 'fault', label: 'Falla', required: true, multiline: true },
  ] },
  { title: 'Diagnóstico y repuestos', items: [
    { key: 'diagnosis', label: 'Diagnóstico', multiline: true }, { key: 'parts', label: 'Repuestos', multiline: true },
  ] },
  { title: 'Costos y precio', items: [
    { key: 'partsCost', label: 'Costo de repuestos', number: true, required: true },
    { key: 'labor', label: 'Mano de obra', number: true, required: true },
    { key: 'quote', label: 'Presupuesto', number: true, required: true },
    { key: 'price', label: 'Precio final', number: true },
  ] },
  { title: 'Reparación y entrega', items: [
    { key: 'repair', label: 'Reparación', required: true }, { key: 'delivery', label: 'Entrega' },
    { key: 'entry', label: 'Ingreso', required: true }, { key: 'finish', label: 'Finalización' },
    { key: 'owner', label: 'Responsable', required: true },
  ] },
];
const keys = fields.flatMap(group => group.items);
const genericError = 'No se guardó. Revisá los datos o el espacio disponible y volvé a intentar.';
const examples: Partial<Record<Key, string>> = {
  equipment: 'Ej. lavarropas', address: 'Ej. Av. San Martín 123', fault: 'Ej. no enciende',
  diagnosis: 'Ej. revisar alimentación', parts: 'Ej. correa', partsCost: 'Ej. 15000',
  labor: 'Ej. 10000', quote: 'Ej. 25000', owner: 'Ej. técnico a cargo',
};

export function OrderEditor({ order, clients, orders, onSave, onCancel, formId, hideActions = false, showExamples = false, onBusyChange }: OrderEditorProps) {
  const id = useId();
  const initial = useRef({ ...order });
  const [draft, setDraft] = useState(() => Object.fromEntries(keys.map(({ key }) => [key, order[key] === null ? '' : String(order[key])])) as Record<Key, string>);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const first = useRef<HTMLSelectElement>(null);
  const equipment = useRef<HTMLInputElement>(null);
  const clientLocked = Boolean(order.originalId || orders.some(other => other.originalId === order.id));
  useEffect(() => { (clientLocked ? equipment.current : first.current)?.focus(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const patch: OrderUpdate = {};
    for (const field of keys) {
      const raw = draft[field.key];
      if (field.required && !raw.trim()) { setError(`Completá ${field.label.toLowerCase()}.`); return; }
      let value: string | number | null = raw;
      if (field.number) {
        if (raw.trim() === '') {
          if (field.key !== 'price') { setError(`Completá ${field.label.toLowerCase()}.`); return; }
          value = null;
        } else {
          value = Number(raw);
          if (!Number.isFinite(value) || value < 0) { setError(`Ingresá un importe válido para ${field.label.toLowerCase()}.`); return; }
        }
      }
      if (value !== initial.current[field.key]) {
        // Each value originates from the corresponding typed control.
        Object.assign(patch, { [field.key]: value });
      }
    }
    submitting.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setError('');
    try { await onSave(patch); }
    catch (cause) { setError(cause instanceof Error && cause.message ? cause.message : genericError); }
    finally { submitting.current = false; setBusy(false); onBusyChange?.(false); }
  }

  return <form id={formId} className="order-editor" aria-label={`Editar orden ${order.id}`} onSubmit={submit}>
    <header><h3>Editar orden {order.id}</h3><p>Cobrado actualmente: <strong>{money(order.paid)}</strong>. Los cobros registrados no se modifican aquí.</p>
      {order.originalId && <p>Garantía de la orden {order.originalId}.</p>}
    </header>
    {fields.map(group => <fieldset key={group.title}><legend>{group.title}</legend><div className="order-editor__grid">
      {group.items.map(field => {
        const inputId = `${id}-${field.key}`;
        const common = { id: inputId, name: field.key, value: draft[field.key], onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setDraft(current => ({ ...current, [field.key]: event.target.value })), required: field.required, placeholder: showExamples ? examples[field.key] : undefined };
        return <div className="order-editor__field" key={field.key}>
          <label htmlFor={inputId}>{field.label}</label>
          {field.key === 'clientId' ? <select {...common} ref={first} disabled={clientLocked} aria-describedby={clientLocked ? `${id}-warranty` : undefined}>{clients.map(client => <option key={client.id} value={client.id}>{client.name} · {client.phone}</option>)}</select>
            : field.key === 'mode' ? <select {...common}><option>Taller</option><option>Domicilio</option></select>
            : field.key === 'delivery' ? <select {...common}><option>Pendiente</option><option>Entregado</option></select>
            : field.multiline ? <textarea {...common} rows={2} />
            : <input {...common} ref={field.key === 'equipment' ? equipment : undefined} type={field.number ? 'number' : 'text'} min={field.number ? '0' : undefined} step={field.number ? 'any' : undefined} onWheel={field.number ? (event => event.currentTarget.blur()) : undefined} />}
          {field.key === 'clientId' && clientLocked && <small id={`${id}-warranty`}>El cliente no se puede cambiar porque la orden está vinculada a una garantía.</small>}
          {field.key === 'price' && <small>Dejá vacío si no hay precio final. Un precio nuevo no puede ser menor a lo cobrado.</small>}
          {(field.key === 'entry' || field.key === 'finish') && <small>Fecha como texto; se conserva el formato existente.</small>}
        </div>;
      })}
    </div></fieldset>)}
    {error && <p className="order-editor__error" role="alert">{error}</p>}
    {!hideActions && <div className="order-editor__actions"><button type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Guardar cambios'}</button><button type="button" disabled={busy} onClick={onCancel}>Cancelar edición</button></div>}
  </form>;
}
