import { useId, useRef, useState, type FormEvent } from 'react';
import { sumDecimal, type Order, type PaymentInput } from '../../repository';
import { money } from '../../selectors';
import { todayIsoLocal } from '../../utils/date';
import './payment-form.css';

export type PaymentFormProps = {
  order: Order;
  onSave: (input: PaymentInput) => Promise<void>;
  onCancel: () => void;
  formId?: string;
  hideActions?: boolean;
  showExamples?: boolean;
  onBusyChange?: (busy: boolean) => void;
};

const genericError = 'No se guardó. Revisá los datos o el espacio disponible y volvé a intentar.';

/** El caller debe usar key={order.id} para aislar el borrador de cada orden. */
export function PaymentForm({ order, onSave, onCancel, formId, hideActions = false, showExamples = false, onBusyChange }: PaymentFormProps) {
  const id = useId();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => todayIsoLocal());
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const noBalance = order.price !== null && order.paid >= order.price;
  const parsedAmount = amount.trim() ? Number(amount) : NaN;
  let previewPaid: number | null = null;
  let previewBalance: number | null = null;
  if (Number.isFinite(parsedAmount) && parsedAmount > 0) {
    try {
      const candidate = sumDecimal(order.paid, parsedAmount);
      if (Number.isFinite(candidate) && candidate > order.paid) {
        previewPaid = candidate;
        if (order.price !== null && candidate <= order.price) {
          previewBalance = Math.max(0, sumDecimal(order.price, -candidate));
        }
      }
    } catch {
      previewPaid = null;
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || noBalance) return;
    const value = Number(amount);
    if (!amount.trim() || !Number.isFinite(value) || value <= 0) {
      setError('El importe debe ser un número positivo y finito.');
      return;
    }
    submitting.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setError('');
    try {
      await onSave({ amount: value, date });
    } catch (cause) {
      setError(cause instanceof Error && cause.message ? cause.message : genericError);
    } finally {
      submitting.current = false;
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  return (
    <form id={formId} className="payment-form" aria-label={`Registrar cobro ${order.id}`} onSubmit={submit}>
      <h3>Registrar cobro</h3>
      <dl className="payment-form__summary">
        <div><dt>Orden</dt><dd>{order.id}</dd></div>
        <div><dt>Equipo</dt><dd>{order.equipment}</dd></div>
        <div><dt>Precio final</dt><dd>{order.price === null ? 'Sin definir' : money(order.price)}</dd></div>
        <div><dt>Cobrado</dt><dd>{money(order.paid)}</dd></div>
        <div><dt>Saldo</dt><dd>{order.price === null ? 'Saldo por definir' : money(Math.max(0, order.price - order.paid))}</dd></div>
      </dl>
      {order.price === null && <p className="payment-form__hint">El precio final todavía no está definido. Podés registrar una seña o un pago parcial.</p>}
      {noBalance && <p className="payment-form__hint">No hay saldo cobrable: el precio final ya está cubierto.</p>}
      <div className="payment-form__fields">
        <label htmlFor={`${id}-amount`}>Importe ($)
          <input id={`${id}-amount`} name="amount" type="number" min="0" step="any" placeholder={showExamples ? 'Ej. 10000' : undefined} required autoFocus value={amount} onChange={event => setAmount(event.target.value)} onWheel={event => event.currentTarget.blur()} />
        </label>
        <label htmlFor={`${id}-date`}>Fecha del cobro
          <input id={`${id}-date`} name="date" type="date" required value={date} onChange={event => setDate(event.target.value)} />
        </label>
      </div>
      {previewPaid !== null && (
        <p className="payment-form__hint">
          Cobrado pasará a <strong>{money(previewPaid)}</strong>
          {order.price !== null && (previewBalance !== null
            ? <> · Saldo quedará en <strong>{money(previewBalance)}</strong></>
            : ' · Supera el saldo pendiente')}
        </p>
      )}
      {error && <p className="payment-form__error" role="alert">{error}</p>}
      {!hideActions && <div className="payment-form__actions">
        <button type="submit" disabled={busy || noBalance}>{busy ? 'Guardando cobro…' : 'Guardar cobro'}</button>
        <button type="button" disabled={busy} onClick={onCancel}>Cancelar cobro</button>
      </div>}
    </form>
  );
}
