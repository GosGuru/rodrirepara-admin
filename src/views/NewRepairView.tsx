import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  FileText,
  Home,
  MapPin,
  MonitorSmartphone,
  Phone,
  ShieldCheck,
  Store,
  User,
  UserPlus,
  Wrench,
} from 'lucide-react';
import type { Client, Order } from '../repository';
import { ClientCombobox } from '../components/ClientCombobox';
import { Select, type SelectOption } from '../components/ui/Select';
import { DatePicker } from '../components/ui/DatePicker';
import { SaveButton } from '../components/ui/SaveButton';
import { useSaveFeedback } from '../hooks/useSaveFeedback';
import { isValidIsoDate, todayIsoLocal } from '../utils/date';
import { formatOrderNotes } from '../utils/warranty';
import './new-repair.css';

type Step = 'repair' | 'client';

type RepairDraft = {
  clientId: string;
  equipment: string;
  mode: Order['mode'];
  entry: string;
  address: string;
  fault: string;
  isWarranty: boolean;
  originalId: string;
};

type RepairErrors = Partial<Record<'clientId' | 'equipment' | 'entry' | 'address' | 'fault', string>>;
type ClientErrors = Partial<Record<'name' | 'phone', string>>;

const MODE_OPTIONS: readonly SelectOption[] = [
  { value: 'Taller', label: 'Taller', icon: <Store size={15} /> },
  { value: 'Domicilio', label: 'Domicilio', icon: <Home size={15} /> },
];

export type NewRepairViewProps = {
  clients: readonly Client[];
  orders?: readonly Order[];
  initialStep?: Step;
  onBack: () => void;
  onCreateClient: (input: Omit<Client, 'id'>) => Promise<string>;
  onSaveRepair: (input: Omit<Order, 'id'>) => Promise<void>;
  onClientCreated: () => void;
  onRepairSaved: () => void;
};

export function NewRepairView({
  clients,
  orders = [],
  initialStep = 'repair',
  onBack,
  onCreateClient,
  onSaveRepair,
  onClientCreated,
  onRepairSaved,
}: NewRepairViewProps) {
  const baseId = useId();
  const [step, setStep] = useState<Step>(initialStep);

  // Repair draft stays mounted across step transitions so ZERO fields are ever lost
  const [draft, setDraft] = useState<RepairDraft>(() => ({
    clientId: '',
    equipment: '',
    mode: 'Taller',
    entry: todayIsoLocal(),
    address: '',
    fault: '',
    isWarranty: false,
    originalId: '',
  }));
  const [dateInputValid, setDateInputValid] = useState(true);
  const [repairErrors, setRepairErrors] = useState<RepairErrors>({});

  // Inline Nuevo cliente subflow state
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientErrors, setClientErrors] = useState<ClientErrors>({});

  const repairSave = useSaveFeedback({ successHoldMs: 820 });
  const clientSave = useSaveFeedback({ successHoldMs: 760 });

  const clientOrders = useMemo(
    () => (draft.clientId ? orders.filter((o) => o.clientId === draft.clientId) : []),
    [orders, draft.clientId],
  );

  const originalOrderOptions = useMemo<SelectOption[]>(
    () => [
      { value: '', label: 'Sin vincular (garantía directa)' },
      ...clientOrders.map((o) => ({
        value: o.id,
        label: `${o.id} · ${o.equipment}`,
      })),
    ],
    [clientOrders],
  );

  // Focus refs
  const clientComboRef = useRef<HTMLInputElement>(null);
  const addClientBtnRef = useRef<HTMLButtonElement>(null);
  const equipmentRef = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const faultRef = useRef<HTMLTextAreaElement>(null);
  const newClientNameRef = useRef<HTMLInputElement>(null);
  const newClientPhoneRef = useRef<HTMLInputElement>(null);
  const pendingFocusTarget = useRef<'add-client' | 'combobox' | null>(null);

  useEffect(() => {
    if (step === 'client') {
      requestAnimationFrame(() => newClientNameRef.current?.focus());
    } else if (pendingFocusTarget.current === 'add-client') {
      pendingFocusTarget.current = null;
      requestAnimationFrame(() => addClientBtnRef.current?.focus());
    } else if (pendingFocusTarget.current === 'combobox') {
      pendingFocusTarget.current = null;
      requestAnimationFrame(() => clientComboRef.current?.focus());
    }
  }, [step]);

  function openClientStep() {
    setClientName('');
    setClientPhone('');
    setClientErrors({});
    clientSave.reset();
    setStep('client');
  }

  function cancelClientStep() {
    if (clientSave.busy) return;
    pendingFocusTarget.current = 'add-client';
    clientSave.reset();
    setStep('repair');
  }

  function clearRepairFieldError(key: keyof RepairErrors) {
    setRepairErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  async function handleRepairSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (repairSave.busy) return;

    const nextErrors: RepairErrors = {};
    if (!draft.clientId || !clients.some((c) => c.id === draft.clientId)) {
      nextErrors.clientId = 'Elegí un cliente.';
    }
    if (!draft.equipment.trim()) {
      nextErrors.equipment = 'Completá el equipo y modelo.';
    }
    if (!dateInputValid || !isValidIsoDate(draft.entry)) {
      nextErrors.entry = 'Ingresá una fecha válida (dd/mm/aaaa).';
    }
    if (!draft.address.trim()) {
      nextErrors.address = 'Completá la dirección o recepción.';
    }
    if (!draft.fault.trim()) {
      nextErrors.fault = 'Completá la falla informada.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setRepairErrors(nextErrors);
      if (nextErrors.clientId) clientComboRef.current?.focus();
      else if (nextErrors.equipment) equipmentRef.current?.focus();
      else if (nextErrors.entry) document.getElementById(`${baseId}-date`)?.focus();
      else if (nextErrors.address) addressRef.current?.focus();
      else if (nextErrors.fault) faultRef.current?.focus();
      return;
    }

    setRepairErrors({});
    const payload: Omit<Order, 'id'> = {
      clientId: draft.clientId,
      equipment: draft.equipment.trim(),
      mode: draft.mode,
      address: draft.address.trim(),
      fault: draft.fault.trim(),
      diagnosis: draft.isWarranty ? formatOrderNotes(true, '') : '',
      parts: '',
      partsCost: 0,
      labor: 0,
      quote: 0,
      price: draft.isWarranty ? 0 : null,
      paid: 0,
      repair: 'Visita o recepción',
      delivery: 'Pendiente',
      entry: draft.entry,
      finish: '',
      owner: 'Rodrigo',
      originalId:
        draft.isWarranty && clientOrders.some((o) => o.id === draft.originalId)
          ? draft.originalId
          : '',
    };

    await repairSave.run(
      () => onSaveRepair(payload),
      () => {
        onRepairSaved();
      },
    );
  }

  async function handleClientSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (clientSave.busy) return;

    const trimmedName = clientName.trim();
    const trimmedPhone = clientPhone.trim();
    const nextErrors: ClientErrors = {};
    if (!trimmedName) nextErrors.name = 'Completá el nombre del cliente.';
    if (!trimmedPhone) nextErrors.phone = 'Completá el teléfono del cliente.';

    if (Object.keys(nextErrors).length > 0) {
      setClientErrors(nextErrors);
      if (nextErrors.name) newClientNameRef.current?.focus();
      else if (nextErrors.phone) newClientPhoneRef.current?.focus();
      return;
    }

    setClientErrors({});
    await clientSave.run(
      () => onCreateClient({ name: trimmedName, phone: trimmedPhone }),
      (newClientId) => {
        setDraft((prev) => ({ ...prev, clientId: newClientId }));
        clearRepairFieldError('clientId');
        pendingFocusTarget.current = 'combobox';
        clientSave.reset();
        setStep('repair');
        onClientCreated();
      },
    );
  }

  return (
    <section
      className="create-flow"
      aria-labelledby={`${baseId}-${step}-title`}
    >
      <div className="create-flow__topbar">
        <button
          type="button"
          className="create-flow__back"
          disabled={step === 'client' ? clientSave.busy : repairSave.busy}
          onClick={step === 'client' ? cancelClientStep : onBack}
        >
          <ArrowLeft size={16} aria-hidden="true" />
          <span>{step === 'client' ? 'Volver a la reparación' : 'Volver'}</span>
        </button>

        {step === 'client' && (
          <span className="create-flow__crumb" aria-label="Ubicación del flujo">
            Nueva reparación <span aria-hidden="true">/</span> <strong>Nuevo cliente</strong>
          </span>
        )}
      </div>

      {step === 'repair' ? (
        <div className="create-card" key="step-repair">
          <header className="create-card__header">
            <div className="create-card__icon create-card__icon--blue" aria-hidden="true">
              <Wrench size={20} strokeWidth={2} />
            </div>
            <div className="create-card__heading">
              <h1 id={`${baseId}-repair-title`}>Nueva reparación</h1>
              <p>Crear una nueva orden de trabajo</p>
            </div>
          </header>

          <form onSubmit={handleRepairSubmit} noValidate className="create-card__form">
            <div className="create-card__body">
              {/* Cliente */}
              <div className="field-group">
                <label className="field-label" htmlFor={`${baseId}-client`}>
                  Cliente
                </label>
                <ClientCombobox
                  id={`${baseId}-client`}
                  clients={clients}
                  value={draft.clientId}
                  disabled={repairSave.busy}
                  error={Boolean(repairErrors.clientId)}
                  ariaDescribedBy={repairErrors.clientId ? `${baseId}-client-err` : undefined}
                  inputRef={clientComboRef}
                  addButtonRef={addClientBtnRef}
                  onChange={(nextId) => {
                    setDraft((prev) => ({
                      ...prev,
                      clientId: nextId,
                      originalId: prev.clientId === nextId ? prev.originalId : '',
                    }));
                    if (nextId) clearRepairFieldError('clientId');
                  }}
                  onAddClient={openClientStep}
                />
                {repairErrors.clientId && (
                  <p id={`${baseId}-client-err`} role="alert" className="field-error">
                    <AlertCircle size={14} aria-hidden="true" />
                    <span>{repairErrors.clientId}</span>
                  </p>
                )}
              </div>

              {/* Equipo y modelo */}
              <div className="field-group">
                <label className="field-label" htmlFor={`${baseId}-equipment`}>
                  Equipo y modelo
                </label>
                <div
                  className="field-input-wrap"
                  data-invalid={Boolean(repairErrors.equipment) || undefined}
                >
                  <span className="field-input-icon" aria-hidden="true">
                    <MonitorSmartphone size={16} />
                  </span>
                  <input
                    ref={equipmentRef}
                    id={`${baseId}-equipment`}
                    name="equipment"
                    type="text"
                    required
                    disabled={repairSave.busy}
                    value={draft.equipment}
                    placeholder="Ej. Heladera Samsung"
                    aria-invalid={Boolean(repairErrors.equipment) || undefined}
                    aria-describedby={repairErrors.equipment ? `${baseId}-equipment-err` : undefined}
                    onChange={(event) => {
                      setDraft((prev) => ({ ...prev, equipment: event.target.value }));
                      if (event.target.value.trim()) clearRepairFieldError('equipment');
                    }}
                  />
                </div>
                {repairErrors.equipment && (
                  <p id={`${baseId}-equipment-err`} role="alert" className="field-error">
                    <AlertCircle size={14} aria-hidden="true" />
                    <span>{repairErrors.equipment}</span>
                  </p>
                )}
              </div>

              {/* Tipo de gestión */}
              <div className="field-group">
                <span className="field-label" id={`${baseId}-management-label`}>
                  Tipo de gestión
                </span>
                <div
                  className="management-type-group"
                  role="radiogroup"
                  aria-labelledby={`${baseId}-management-label`}
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!draft.isWarranty}
                    disabled={repairSave.busy}
                    className={`management-type-card${!draft.isWarranty ? ' is-selected' : ''}`}
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, isWarranty: false, originalId: '' }))
                    }
                  >
                    <span className="management-type-card__icon" aria-hidden="true">
                      <Wrench size={16} />
                    </span>
                    <span className="management-type-card__copy">
                      <strong>Reparación estándar</strong>
                      <small>Presupuesto y cobro habitual</small>
                    </span>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={draft.isWarranty}
                    disabled={repairSave.busy}
                    className={`management-type-card management-type-card--warranty${draft.isWarranty ? ' is-selected' : ''}`}
                    onClick={() =>
                      setDraft((prev) => ({ ...prev, isWarranty: true }))
                    }
                  >
                    <span className="management-type-card__icon" aria-hidden="true">
                      <ShieldCheck size={16} />
                    </span>
                    <span className="management-type-card__copy">
                      <strong>Reparación de garantía</strong>
                      <small>Sin costo ($ 0)</small>
                    </span>
                  </button>
                </div>

                {draft.isWarranty && (
                  <div className="warranty-callout" role="status">
                    <ShieldCheck size={16} className="warranty-callout__icon" aria-hidden="true" />
                    <div className="warranty-callout__body">
                      <strong>Sin costo ($ 0)</strong>
                      <p>Se registrará como reparación de garantía en las notas y con precio final $ 0.</p>
                      {clientOrders.length > 0 && (
                        <div className="warranty-callout__select">
                          <span className="field-label" id={`${baseId}-original-label`}>
                            Orden original (opcional)
                          </span>
                          <Select
                            id={`${baseId}-original`}
                            name="originalId"
                            value={draft.originalId}
                            options={originalOrderOptions}
                            disabled={repairSave.busy}
                            ariaLabelledBy={`${baseId}-original-label`}
                            onChange={(nextOriginalId) =>
                              setDraft((prev) => ({ ...prev, originalId: nextOriginalId }))
                            }
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Modalidad + Fecha de ingreso */}
              <div className="field-row-2">
                <div className="field-group">
                  <span className="field-label" id={`${baseId}-mode-label`}>
                    Modalidad
                  </span>
                  <Select
                    id={`${baseId}-mode`}
                    name="mode"
                    value={draft.mode}
                    options={MODE_OPTIONS}
                    disabled={repairSave.busy}
                    ariaLabelledBy={`${baseId}-mode-label`}
                    onChange={(nextMode) =>
                      setDraft((prev) => ({ ...prev, mode: nextMode as Order['mode'] }))
                    }
                  />
                </div>

                <div className="field-group">
                  <label className="field-label" htmlFor={`${baseId}-date`}>
                    Fecha de ingreso
                  </label>
                  <DatePicker
                    id={`${baseId}-date`}
                    name="date"
                    value={draft.entry}
                    disabled={repairSave.busy}
                    error={Boolean(repairErrors.entry)}
                    ariaDescribedBy={repairErrors.entry ? `${baseId}-date-err` : undefined}
                    onValidityChange={(valid) => {
                      setDateInputValid(valid);
                      if (valid) clearRepairFieldError('entry');
                    }}
                    onChange={(nextIso) => {
                      setDraft((prev) => ({ ...prev, entry: nextIso }));
                      if (isValidIsoDate(nextIso)) clearRepairFieldError('entry');
                    }}
                  />
                  {repairErrors.entry && (
                    <p id={`${baseId}-date-err`} role="alert" className="field-error">
                      <AlertCircle size={14} aria-hidden="true" />
                      <span>{repairErrors.entry}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Dirección o recepción */}
              <div className="field-group">
                <label className="field-label" htmlFor={`${baseId}-address`}>
                  Dirección o recepción
                </label>
                <div
                  className="field-input-wrap"
                  data-invalid={Boolean(repairErrors.address) || undefined}
                >
                  <span className="field-input-icon" aria-hidden="true">
                    <MapPin size={16} />
                  </span>
                  <input
                    ref={addressRef}
                    id={`${baseId}-address`}
                    name="address"
                    type="text"
                    required
                    disabled={repairSave.busy}
                    value={draft.address}
                    placeholder="Ej. Recepción en taller"
                    aria-invalid={Boolean(repairErrors.address) || undefined}
                    aria-describedby={repairErrors.address ? `${baseId}-address-err` : undefined}
                    onChange={(event) => {
                      setDraft((prev) => ({ ...prev, address: event.target.value }));
                      if (event.target.value.trim()) clearRepairFieldError('address');
                    }}
                  />
                </div>
                {repairErrors.address && (
                  <p id={`${baseId}-address-err`} role="alert" className="field-error">
                    <AlertCircle size={14} aria-hidden="true" />
                    <span>{repairErrors.address}</span>
                  </p>
                )}
              </div>

              {/* Falla informada */}
              <div className="field-group">
                <label className="field-label" htmlFor={`${baseId}-fault`}>
                  Falla informada
                </label>
                <div
                  className="field-textarea-wrap"
                  data-invalid={Boolean(repairErrors.fault) || undefined}
                >
                  <span className="field-textarea-icon" aria-hidden="true">
                    <FileText size={16} />
                  </span>
                  <textarea
                    ref={faultRef}
                    id={`${baseId}-fault`}
                    name="fault"
                    rows={3}
                    required
                    disabled={repairSave.busy}
                    value={draft.fault}
                    placeholder="Ej. No enfría, hace ruido, etc."
                    aria-invalid={Boolean(repairErrors.fault) || undefined}
                    aria-describedby={repairErrors.fault ? `${baseId}-fault-err` : undefined}
                    onChange={(event) => {
                      setDraft((prev) => ({ ...prev, fault: event.target.value }));
                      if (event.target.value.trim()) clearRepairFieldError('fault');
                    }}
                  />
                </div>
                {repairErrors.fault && (
                  <p id={`${baseId}-fault-err`} role="alert" className="field-error">
                    <AlertCircle size={14} aria-hidden="true" />
                    <span>{repairErrors.fault}</span>
                  </p>
                )}
              </div>

              {repairSave.error && (
                <div role="alert" className="form-alert">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{repairSave.error}</span>
                </div>
              )}
            </div>

            <footer className="create-card__footer">
              <button
                type="button"
                className="btn-secondary"
                disabled={repairSave.busy}
                onClick={onBack}
              >
                Cancelar
              </button>
              <SaveButton
                status={repairSave.status}
                idleLabel="Guardar reparación"
                savingLabel="Guardando..."
                successLabel="Guardado"
              />
            </footer>
          </form>
        </div>
      ) : (
        <div className="create-card create-card--compact" key="step-client">
          <header className="create-card__header">
            <div className="create-card__icon create-card__icon--lavender" aria-hidden="true">
              <UserPlus size={20} strokeWidth={2} />
            </div>
            <div className="create-card__heading">
              <h1 id={`${baseId}-client-title`}>Nuevo cliente</h1>
              <p>Agregar un cliente a tu base</p>
            </div>
          </header>

          <form onSubmit={handleClientSubmit} noValidate className="create-card__form">
            <div className="create-card__body">
              <div className="field-group">
                <label className="field-label" htmlFor={`${baseId}-client-name`}>
                  Nombre
                </label>
                <div
                  className="field-input-wrap"
                  data-invalid={Boolean(clientErrors.name) || undefined}
                >
                  <span className="field-input-icon" aria-hidden="true">
                    <User size={16} />
                  </span>
                  <input
                    ref={newClientNameRef}
                    id={`${baseId}-client-name`}
                    name="name"
                    type="text"
                    required
                    disabled={clientSave.busy}
                    value={clientName}
                    placeholder="Ej. Ana García"
                    aria-invalid={Boolean(clientErrors.name) || undefined}
                    aria-describedby={clientErrors.name ? `${baseId}-cname-err` : undefined}
                    onChange={(event) => {
                      setClientName(event.target.value);
                      if (event.target.value.trim() && clientErrors.name) {
                        setClientErrors((prev) => ({ ...prev, name: undefined }));
                      }
                    }}
                  />
                </div>
                {clientErrors.name && (
                  <p id={`${baseId}-cname-err`} role="alert" className="field-error">
                    <AlertCircle size={14} aria-hidden="true" />
                    <span>{clientErrors.name}</span>
                  </p>
                )}
              </div>

              <div className="field-group">
                <label className="field-label" htmlFor={`${baseId}-client-phone`}>
                  Teléfono
                </label>
                <div
                  className="field-input-wrap"
                  data-invalid={Boolean(clientErrors.phone) || undefined}
                >
                  <span className="field-input-icon" aria-hidden="true">
                    <Phone size={16} />
                  </span>
                  <input
                    ref={newClientPhoneRef}
                    id={`${baseId}-client-phone`}
                    name="phone"
                    type="tel"
                    required
                    disabled={clientSave.busy}
                    value={clientPhone}
                    placeholder="Ej. 099 123 456"
                    aria-invalid={Boolean(clientErrors.phone) || undefined}
                    aria-describedby={clientErrors.phone ? `${baseId}-cphone-err` : undefined}
                    onChange={(event) => {
                      setClientPhone(event.target.value);
                      if (event.target.value.trim() && clientErrors.phone) {
                        setClientErrors((prev) => ({ ...prev, phone: undefined }));
                      }
                    }}
                  />
                </div>
                {clientErrors.phone && (
                  <p id={`${baseId}-cphone-err`} role="alert" className="field-error">
                    <AlertCircle size={14} aria-hidden="true" />
                    <span>{clientErrors.phone}</span>
                  </p>
                )}
              </div>

              <p className="create-card__reassurance">
                Al guardar, volverás automáticamente a la reparación con este cliente seleccionado y sin perder lo que ya cargaste.
              </p>

              {clientSave.error && (
                <div role="alert" className="form-alert">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{clientSave.error}</span>
                </div>
              )}
            </div>

            <footer className="create-card__footer">
              <button
                type="button"
                className="btn-secondary"
                disabled={clientSave.busy}
                onClick={cancelClientStep}
              >
                Cancelar
              </button>
              <SaveButton
                status={clientSave.status}
                idleLabel="Guardar cliente"
                savingLabel="Guardando..."
                successLabel="Guardado"
              />
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}
