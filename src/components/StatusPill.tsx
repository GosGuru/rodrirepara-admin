import { CheckCircle2, ClipboardList, Clock, Package, Wrench } from 'lucide-react';
import './status-pill.css';

export type StatusKind = 'repair' | 'payment' | 'delivery' | 'lead';
export type StatusPillProps = { kind: StatusKind; value: string; showIcon?: boolean };
const names: Record<StatusKind, string> = { repair: 'Reparación', payment: 'Cobro', delivery: 'Entrega', lead: 'Consulta' };

function repairIcon(value: string) {
  if (value === 'Visita o recepción') return <ClipboardList size={11.5} strokeWidth={2.1} aria-hidden="true" />;
  if (value === 'Esperando aprobación') return <Clock size={11.5} strokeWidth={2.1} aria-hidden="true" />;
  if (value === 'Esperando repuestos') return <Package size={11.5} strokeWidth={2.1} aria-hidden="true" />;
  if (value === 'En reparación' || value === 'En proceso') return <Wrench size={11.5} strokeWidth={2.1} aria-hidden="true" />;
  if (value === 'Terminado') return <CheckCircle2 size={11.5} strokeWidth={2.1} aria-hidden="true" />;
  return null;
}

/** Color is a redundant presentation cue, never a stored-state transformation. */
export function StatusPill({ kind, value, showIcon = false }: StatusPillProps) {
  let tone = 'neutral';
  if (kind === 'repair') {
    if (['Visita o recepción', 'Esperando aprobación', 'Esperando repuestos'].includes(value)) tone = 'pending';
    else if (value === 'Terminado') tone = 'complete';
  } else if (kind === 'payment') {
    if (value === 'Cobrado') tone = 'complete';
    else if (value === 'Pendiente') tone = 'pending';
  } else if (kind === 'delivery') {
    if (value === 'Entregado') tone = 'complete';
    else if (value === 'Pendiente') tone = 'pending';
  } else if (value === 'Pendiente de respuesta') tone = 'pending';
  else if (value === 'Nueva') tone = 'info';
  const icon = showIcon && kind === 'repair' ? repairIcon(value) : null;
  return (
    <span className={`status-pill status-pill--${tone}`} data-status-kind={kind} aria-label={`${names[kind]}: ${value}`}>
      {icon}
      {icon ? <span>{value}</span> : value}
    </span>
  );
}
