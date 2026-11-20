import { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  MapPin,
  Phone,
  UserRound,
  Wrench,
  X,
} from 'lucide-react';
import type { Client, Order } from '../../repository';
import { SideSheet } from '../../components/SideSheet';
import { StatusPill } from '../../components/StatusPill';
import './panels.css';

type TemplateId = 'status' | 'quote' | 'schedule';

function compactMoney(n: number): string {
  return '$' + n.toLocaleString('es-AR');
}

/** Normalize local Uruguayan mobile numbers (09X XXX XXX -> 5989XXXXXXX) for wa.me while keeping other formats intact. */
export function normalizeWhatsAppDigits(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (/^09\d{7}$/.test(digits)) return `598${digits.slice(1)}`;
  return digits;
}

function buildTemplateMessage(template: TemplateId, clientName: string, order: Order): string {
  const equip = `lavarropas ${order.equipment}`;
  if (template === 'quote') {
    const amount = order.price ?? order.quote;
    if (amount > 0) {
      return `Hola ${clientName}, te escribimos de Rodrigo Repara. El presupuesto para reparar tu ${equip} es de ${compactMoney(amount)}. ¿Confirmás para avanzar?`;
    }
    return `Hola ${clientName}, te escribimos de Rodrigo Repara para confirmarte el presupuesto de tu ${equip}.`;
  }
  if (template === 'schedule') {
    if (order.mode === 'Domicilio') {
      return `Hola ${clientName}, te escribimos de Rodrigo Repara para coordinar la visita a domicilio por tu ${equip}. ¿Qué horario te queda cómodo?`;
    }
    return `Hola ${clientName}, te escribimos de Rodrigo Repara para coordinar el retiro en taller de tu ${equip}. ¿Cuándo podrías pasar?`;
  }
  return `Hola ${clientName}, te escribimos de Rodrigo Repara por tu ${equip} (orden ${order.id}). Actualmente está en estado «${order.repair}».`;
}

export function WhatsAppGlyph({ size = 14 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 11.5a8.5 8.5 0 0 1-12.5 7.5L3 20.5l1.6-5.1A8.5 8.5 0 1 1 21 11.5Z" />
      <path d="M9.5 9.2c.2-.4.5-.5.8-.3l1 .6c.3.2.4.5.2.8l-.4.7c.5.9 1.2 1.6 2.1 2.1l.7-.4c.3-.2.6-.1.8.2l.6 1c.2.3.1.6-.3.8-.7.4-1.6.5-2.6.1-1.9-.7-3.4-2.2-4.1-4.1-.4-1-.3-1.9.1-2.6Z" />
    </svg>
  );
}

export function ContactDrawer({
  order,
  client,
  onClose,
}: {
  order: Order | null;
  client: Client | null;
  onClose: () => void;
}) {
  const [template, setTemplate] = useState<TemplateId>('status');
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const clientName = client?.name ?? 'Cliente';
  const rawPhone = client?.phone?.trim() ?? '';
  const telDigits = rawPhone.replace(/\D/g, '');
  const waDigits = normalizeWhatsAppDigits(rawPhone);

  useEffect(() => {
    if (!order) return;
    const defaultTpl: TemplateId =
      order.repair === 'Esperando aprobación' ? 'quote' : 'status';
    setTemplate(defaultTpl);
    setMessage(buildTemplateMessage(defaultTpl, clientName, order));
    setCopied(false);
  }, [order, clientName]);

  function selectTemplate(next: TemplateId) {
    if (!order) return;
    setTemplate(next);
    setMessage(buildTemplateMessage(next, clientName, order));
  }

  async function copyPhone() {
    if (!rawPhone) return;
    try {
      await navigator.clipboard.writeText(rawPhone);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API unavailable in non-secure contexts
    }
  }

  const waHref = waDigits
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(message.trim())}`
    : undefined;

  return (
    <SideSheet
      open={order !== null}
      titleId="contact-drawer-title"
      className="side-sheet--panel side-sheet--contact"
      onRequestClose={onClose}
      header={
        <div className="md-header">
          <div className="md-header__left">
            <span className="md-header__icon md-header__icon--green" aria-hidden="true">
              <WhatsAppGlyph size={20} />
            </span>
            <div className="md-header__copy">
              <h2 id="contact-drawer-title">Contactar a {clientName}</h2>
              <p>{order ? `${order.id} · Lavarropas ${order.equipment}` : 'Contacto directo'}</p>
            </div>
          </div>
          <button
            type="button"
            className="md-close-btn"
            onClick={onClose}
            aria-label="Cerrar contacto"
          >
            <X size={18} strokeWidth={1.9} aria-hidden="true" />
          </button>
        </div>
      }
      footer={
        rawPhone ? (
          <div className="cd-footer">
            <button
              type="button"
              className="cd-btn cd-btn--outline"
              onClick={copyPhone}
            >
              {copied ? (
                <>
                  <Check size={14} strokeWidth={2.2} aria-hidden="true" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy size={14} strokeWidth={1.9} aria-hidden="true" />
                  <span>Copiar teléfono</span>
                </>
              )}
            </button>
            <a className="cd-btn cd-btn--outline" href={`tel:${telDigits}`}>
              <Phone size={14} strokeWidth={1.9} aria-hidden="true" />
              <span>Llamar</span>
            </a>
            <a
              className="cd-btn cd-btn--whatsapp"
              href={waHref}
              target="_blank"
              rel="noreferrer"
            >
              <WhatsAppGlyph size={14} />
              <span>Abrir WhatsApp</span>
              <ExternalLink size={12} strokeWidth={2} aria-hidden="true" />
            </a>
          </div>
        ) : (
          <div className="cd-footer cd-footer--end">
            <button type="button" className="cd-btn cd-btn--outline" onClick={onClose}>
              Cerrar
            </button>
          </div>
        )
      }
    >
      {order && (
        <div className="md-stack">
          {/* Client & Order Card */}
          <div className="cd-card">
            <div className="cd-client-row">
              <span className="cd-avatar" aria-hidden="true">
                <UserRound size={17} strokeWidth={1.85} />
              </span>
              <div className="cd-client-info">
                <strong>{clientName}</strong>
                <span>{rawPhone || 'Sin teléfono registrado'}</span>
              </div>
              <StatusPill kind="repair" value={order.repair} />
            </div>

            <div className="cd-meta-strip">
              <span>
                <MapPin size={13} strokeWidth={1.9} aria-hidden="true" />
                {order.mode}
              </span>
              <span>
                <Wrench size={13} strokeWidth={1.9} aria-hidden="true" />
                {order.fault}
              </span>
              {(order.price !== null || order.quote > 0) && (
                <span className="cd-meta-price">
                  {order.price !== null
                    ? `Precio final ${compactMoney(order.price)}`
                    : `Presupuesto ${compactMoney(order.quote)}`}
                </span>
              )}
            </div>
          </div>

          {rawPhone ? (
            <div className="cd-card">
              <div className="cd-composer-head">
                <h3>Mensaje para WhatsApp</h3>
                <div className="cd-templates" role="group" aria-label="Plantillas rápidas">
                  {(
                    [
                      ['status', 'Estado'],
                      ['quote', 'Presupuesto'],
                      ['schedule', order.mode === 'Domicilio' ? 'Visita' : 'Retiro'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      className={template === id ? 'is-active' : undefined}
                      aria-pressed={template === id}
                      onClick={() => selectTemplate(id)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="cd-textarea-wrap">
                <span className="ob-visually-hidden">Mensaje para enviar por WhatsApp</span>
                <textarea
                  rows={4}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                />
              </label>

              <p className="cd-hint">
                Se abrirá WhatsApp en una pestaña nueva con este mensaje listo para enviar al número{' '}
                <strong>{rawPhone}</strong>.
              </p>
            </div>
          ) : (
            <div className="md-empty-card">
              <span className="md-empty-card__icon" aria-hidden="true">
                <Phone size={20} strokeWidth={1.7} />
              </span>
              <strong>Sin número de teléfono</strong>
              <p>Agregá el teléfono de {clientName} desde Clientes para poder escribirle o llamarlo.</p>
            </div>
          )}
        </div>
      )}
    </SideSheet>
  );
}
