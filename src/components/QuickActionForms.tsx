import { useState, type FormEvent, type ReactNode } from 'react';
import type { Client, Expense, Order } from '../repository';
import { ClientPicker } from './ClientPicker';

const errorMessage = 'No se guardó. Revisá los datos o el espacio disponible y volvé a intentar.';
const text = (data: FormData, key: string) => String(data.get(key) ?? '').trim();

function useFormSubmission(save: (data: FormData) => Promise<void>, onBusyChange?: (busy: boolean) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setBusy(true); onBusyChange?.(true); setError('');
    try { await save(data); }
    catch { setError(errorMessage); }
    finally { setBusy(false); onBusyChange?.(false); }
  }
  return { busy, error, submit };
}

function FormFrame({ children, submit, busy, error }: {
  children: ReactNode; submit: (event: FormEvent<HTMLFormElement>) => void; busy: boolean; error: string;
}) {
  return <form onSubmit={submit} className="form">
    <div className="create-dialog__fields">
      {children}
      {error && <p role="alert" className="error">{error}</p>}
    </div>
    <div className="create-dialog__actions"><button className="primary" disabled={busy}>{busy ? 'Guardando…' : 'Guardar'}</button></div>
  </form>;
}

export function ClientForm({ onSave, onBusyChange }: {
  onSave: (input: Omit<Client, 'id'>) => Promise<void>; onBusyChange?: (busy: boolean) => void;
}) {
  const state = useFormSubmission(data => onSave({ name: text(data, 'name'), phone: text(data, 'phone') }), onBusyChange);
  return <FormFrame {...state}>
    <label>Nombre<input name="name" placeholder="Ej. Ana García" required /></label>
    <label>Teléfono<input name="phone" placeholder="Ej. 11 2345 6789" required /></label>
  </FormFrame>;
}

export function ExpenseForm({ onSave }: { onSave: (input: Omit<Expense, 'id'>) => Promise<void> }) {
  const state = useFormSubmission(data => onSave({ description: text(data, 'description'), category: text(data, 'category'), amount: Number(text(data, 'amount')), date: text(data, 'date') }));
  return <FormFrame {...state}>
    <label>Concepto<input name="description" placeholder="Ej. Combustible para visitas" required /></label>
    <label>Categoría<select name="category">{['Combustible', 'Transporte', 'Herramientas', 'Publicidad', 'Sueldos', 'Compras generales'].map(category => <option key={category}>{category}</option>)}</select></label>
    <label>Importe ($)<input name="amount" type="number" min="0" step="0.01" placeholder="Ej. 15000" required /></label>
    <label>Fecha<input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
  </FormFrame>;
}

export function RepairForm({ clients, clientId, onClientChange, onAddClient, onSave }: {
  clients: readonly Client[]; clientId: string; onClientChange: (id: string) => void; onAddClient: () => void;
  onSave: (input: Omit<Order, 'id'>) => Promise<void>;
}) {
  const state = useFormSubmission(data => onSave({
    clientId: text(data, 'client'), equipment: text(data, 'equipment'), mode: text(data, 'mode') as Order['mode'],
    address: text(data, 'address'), fault: text(data, 'fault'), diagnosis: '', parts: '', partsCost: 0, labor: 0,
    quote: 0, price: null, paid: 0, repair: 'Visita o recepción', delivery: 'Pendiente', entry: text(data, 'date'),
    finish: '', owner: 'Rodrigo', originalId: '',
  }));
  return <FormFrame {...state}>
    <ClientPicker clients={clients} value={clientId} onChange={onClientChange} onAdd={onAddClient} />
    <label>Equipo y modelo<input name="equipment" placeholder="Ej. Heladera Samsung" required /></label>
    <label>Modalidad<select name="mode"><option>Taller</option><option>Domicilio</option></select></label>
    <label>Dirección o recepción<input name="address" placeholder="Ej. Recepción en taller" required /></label>
    <label>Falla informada<input name="fault" placeholder="Ej. No enfría" required /></label>
    <label>Fecha de ingreso<input name="date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} /></label>
  </FormFrame>;
}
