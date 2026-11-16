import './status-pill.css';

export type StatusKind = 'repair' | 'payment' | 'delivery' | 'lead';
export type StatusPillProps = { kind: StatusKind; value: string };
const names: Record<StatusKind, string> = { repair: 'Reparación', payment: 'Cobro', delivery: 'Entrega', lead: 'Consulta' };

/** Color is a redundant presentation cue, never a stored-state transformation. */
export function StatusPill({ kind, value }: StatusPillProps) {
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
  return <span className={`status-pill status-pill--${tone}`} data-status-kind={kind} aria-label={`${names[kind]}: ${value}`}>{value}</span>;
}
