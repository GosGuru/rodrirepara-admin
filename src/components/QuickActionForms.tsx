import { useId, useRef, useState, type FormEvent } from 'react';
import { AlertCircle, DollarSign, FileText, Phone, Tag, User } from 'lucide-react';
import type { Client, Expense } from '../repository';
import { Select, type SelectOption } from './ui/Select';
import { DatePicker } from './ui/DatePicker';
import { SaveButton } from './ui/SaveButton';
import { useSaveFeedback } from '../hooks/useSaveFeedback';
import { isValidIsoDate, todayIsoLocal } from '../utils/date';
import '../views/new-repair.css';

export const PERSONAL_EXPENSE_CATEGORY = 'Gasto personal';

const EXPENSE_CATEGORIES: readonly SelectOption[] = [
  'Combustible',
  'Transporte',
  'Herramientas',
  'Publicidad',
  'Sueldos',
  'Compras generales',
].map((category) => ({ value: category, label: category }));

export function ClientForm({
  onSave,
  onConfirmed,
  onCancel,
  onBusyChange,
}: {
  onSave: (input: Omit<Client, 'id'>) => Promise<void>;
  onConfirmed?: () => void;
  onCancel?: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const baseId = useId();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<{ name?: string; phone?: string }>({});
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const save = useSaveFeedback({ successHoldMs: 760, onBusyChange });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (save.busy) return;

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const nextErrors: { name?: string; phone?: string } = {};
    if (!trimmedName) nextErrors.name = 'Completá el nombre del cliente.';
    if (!trimmedPhone) nextErrors.phone = 'Completá el teléfono del cliente.';

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      if (nextErrors.name) nameRef.current?.focus();
      else if (nextErrors.phone) phoneRef.current?.focus();
      return;
    }

    setErrors({});
    await save.run(
      () => onSave({ name: trimmedName, phone: trimmedPhone }),
      () => onConfirmed?.(),
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="form create-dialog__form">
      <div className="create-dialog__fields">
        <div className="field-group">
          <label className="field-label" htmlFor={`${baseId}-name`}>
            Nombre
          </label>
          <div className="field-input-wrap" data-invalid={Boolean(errors.name) || undefined}>
            <span className="field-input-icon" aria-hidden="true">
              <User size={16} />
            </span>
            <input
              ref={nameRef}
              id={`${baseId}-name`}
              name="name"
              type="text"
              required
              disabled={save.busy}
              value={name}
              placeholder="Ej. Ana García"
              aria-invalid={Boolean(errors.name) || undefined}
              aria-describedby={errors.name ? `${baseId}-name-err` : undefined}
              onChange={(event) => {
                setName(event.target.value);
                if (event.target.value.trim() && errors.name) {
                  setErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
            />
          </div>
          {errors.name && (
            <p id={`${baseId}-name-err`} role="alert" className="field-error">
              <AlertCircle size={14} aria-hidden="true" />
              <span>{errors.name}</span>
            </p>
          )}
        </div>

        <div className="field-group">
          <label className="field-label" htmlFor={`${baseId}-phone`}>
            Teléfono
          </label>
          <div className="field-input-wrap" data-invalid={Boolean(errors.phone) || undefined}>
            <span className="field-input-icon" aria-hidden="true">
              <Phone size={16} />
            </span>
            <input
              ref={phoneRef}
              id={`${baseId}-phone`}
              name="phone"
              type="tel"
              required
              disabled={save.busy}
              value={phone}
              placeholder="Ej. 099 123 456"
              aria-invalid={Boolean(errors.phone) || undefined}
              aria-describedby={errors.phone ? `${baseId}-phone-err` : undefined}
              onChange={(event) => {
                setPhone(event.target.value);
                if (event.target.value.trim() && errors.phone) {
                  setErrors((prev) => ({ ...prev, phone: undefined }));
                }
              }}
            />
          </div>
          {errors.phone && (
            <p id={`${baseId}-phone-err`} role="alert" className="field-error">
              <AlertCircle size={14} aria-hidden="true" />
              <span>{errors.phone}</span>
            </p>
          )}
        </div>

        {save.error && (
          <div role="alert" className="form-alert">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{save.error}</span>
          </div>
        )}
      </div>

      <div className="create-dialog__actions">
        {onCancel && (
          <button
            type="button"
            className="btn-secondary"
            disabled={save.busy}
            onClick={onCancel}
          >
            Cancelar
          </button>
        )}
        <SaveButton
          status={save.status}
          idleLabel="Guardar cliente"
          savingLabel="Guardando..."
          successLabel="Guardado"
        />
      </div>
    </form>
  );
}

export function ExpenseForm({
  onSave,
  onConfirmed,
  onCancel,
  onBusyChange,
}: {
  onSave: (input: Omit<Expense, 'id'>) => Promise<void>;
  onConfirmed?: () => void;
  onCancel?: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const baseId = useId();
  const [scope, setScope] = useState<'business' | 'personal'>('business');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Combustible');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => todayIsoLocal());
  const [dateValid, setDateValid] = useState(true);
  const [errors, setErrors] = useState<{ description?: string; amount?: string; date?: string }>({});

  const descRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  const save = useSaveFeedback({ successHoldMs: 760, onBusyChange });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (save.busy) return;

    const trimmedDesc = description.trim();
    const numericAmount = Number(amount);
    const nextErrors: { description?: string; amount?: string; date?: string } = {};
    if (!trimmedDesc) nextErrors.description = 'Completá el concepto del gasto.';
    if (amount.trim() === '' || !Number.isFinite(numericAmount) || numericAmount < 0) {
      nextErrors.amount = 'Ingresá un importe válido.';
    }
    if (!dateValid || !isValidIsoDate(date)) {
      nextErrors.date = 'Ingresá una fecha válida (dd/mm/aaaa).';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      if (nextErrors.description) descRef.current?.focus();
      else if (nextErrors.amount) amountRef.current?.focus();
      else if (nextErrors.date) document.getElementById(`${baseId}-date`)?.focus();
      return;
    }

    setErrors({});
    const resolvedCategory = scope === 'personal' ? PERSONAL_EXPENSE_CATEGORY : category;
    await save.run(
      () => onSave({ description: trimmedDesc, category: resolvedCategory, amount: numericAmount, date }),
      () => onConfirmed?.(),
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="form create-dialog__form">
      <div className="create-dialog__fields">
        <div className="field-group">
          <label className="field-label" htmlFor={`${baseId}-desc`}>
            Concepto
          </label>
          <div className="field-input-wrap" data-invalid={Boolean(errors.description) || undefined}>
            <span className="field-input-icon" aria-hidden="true">
              <FileText size={16} />
            </span>
            <input
              ref={descRef}
              id={`${baseId}-desc`}
              name="description"
              type="text"
              required
              disabled={save.busy}
              value={description}
              placeholder="Ej. Combustible para visitas"
              aria-invalid={Boolean(errors.description) || undefined}
              onChange={(event) => {
                setDescription(event.target.value);
                if (event.target.value.trim() && errors.description) {
                  setErrors((prev) => ({ ...prev, description: undefined }));
                }
              }}
            />
          </div>
          {errors.description && (
            <p role="alert" className="field-error">
              <AlertCircle size={14} aria-hidden="true" />
              <span>{errors.description}</span>
            </p>
          )}
        </div>

        <div className="field-group">
          <span className="field-label" id={`${baseId}-scope-label`}>
            Tipo de gasto
          </span>
          <div className="segmented-control" role="group" aria-labelledby={`${baseId}-scope-label`} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              className={scope === 'business' ? 'btn-primary' : 'btn-secondary'}
              disabled={save.busy}
              aria-pressed={scope === 'business'}
              onClick={() => setScope('business')}
            >
              Empresa / Taller
            </button>
            <button
              type="button"
              className={scope === 'personal' ? 'btn-primary' : 'btn-secondary'}
              disabled={save.busy}
              aria-pressed={scope === 'personal'}
              onClick={() => setScope('personal')}
            >
              Personal
            </button>
          </div>
        </div>

        {scope === 'business' ? (
          <div className="field-group">
            <span className="field-label" id={`${baseId}-cat-label`}>
              Categoría
            </span>
            <Select
              id={`${baseId}-cat`}
              name="category"
              value={category}
              options={EXPENSE_CATEGORIES}
              icon={<Tag size={15} />}
              disabled={save.busy}
              ariaLabelledBy={`${baseId}-cat-label`}
              onChange={setCategory}
            />
          </div>
        ) : (
          <p className="field-hint">Los gastos personales se muestran aparte y no restan de los movimientos netos del taller.</p>
        )}

        <div className="field-row-2">
          <div className="field-group">
            <label className="field-label" htmlFor={`${baseId}-amount`}>
              Importe ($)
            </label>
            <div className="field-input-wrap" data-invalid={Boolean(errors.amount) || undefined}>
              <span className="field-input-icon" aria-hidden="true">
                <DollarSign size={16} />
              </span>
              <input
                ref={amountRef}
                id={`${baseId}-amount`}
                name="amount"
                type="number"
                min="0"
                step="0.01"
                required
                disabled={save.busy}
                value={amount}
                placeholder="Ej. 1500"
                aria-invalid={Boolean(errors.amount) || undefined}
                onChange={(event) => {
                  setAmount(event.target.value);
                  if (errors.amount) setErrors((prev) => ({ ...prev, amount: undefined }));
                }}
                onWheel={(event) => event.currentTarget.blur()}
              />
            </div>
            {errors.amount && (
              <p role="alert" className="field-error">
                <AlertCircle size={14} aria-hidden="true" />
                <span>{errors.amount}</span>
              </p>
            )}
          </div>

          <div className="field-group">
            <label className="field-label" htmlFor={`${baseId}-date`}>
              Fecha
            </label>
            <DatePicker
              id={`${baseId}-date`}
              name="date"
              value={date}
              disabled={save.busy}
              error={Boolean(errors.date)}
              onValidityChange={(valid) => {
                setDateValid(valid);
                if (valid && errors.date) setErrors((prev) => ({ ...prev, date: undefined }));
              }}
              onChange={(nextIso) => {
                setDate(nextIso);
                if (isValidIsoDate(nextIso) && errors.date) {
                  setErrors((prev) => ({ ...prev, date: undefined }));
                }
              }}
            />
            {errors.date && (
              <p role="alert" className="field-error">
                <AlertCircle size={14} aria-hidden="true" />
                <span>{errors.date}</span>
              </p>
            )}
          </div>
        </div>

        {save.error && (
          <div role="alert" className="form-alert">
            <AlertCircle size={16} aria-hidden="true" />
            <span>{save.error}</span>
          </div>
        )}
      </div>

      <div className="create-dialog__actions">
        {onCancel && (
          <button
            type="button"
            className="btn-secondary"
            disabled={save.busy}
            onClick={onCancel}
          >
            Cancelar
          </button>
        )}
        <SaveButton
          status={save.status}
          idleLabel="Guardar gasto"
          savingLabel="Guardando..."
          successLabel="Guardado"
        />
      </div>
    </form>
  );
}
