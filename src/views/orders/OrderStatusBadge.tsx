import {
  Archive,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Clock,
  Package,
  Truck,
  Wrench,
} from 'lucide-react';

export type OrderStatusKind = 'repair' | 'payment' | 'delivery';

const KIND_LABELS: Record<OrderStatusKind, string> = {
  repair: 'Reparación',
  payment: 'Cobro',
  delivery: 'Entrega',
};

type BadgeStyle = {
  tone:
    | 'complete'
    | 'progress'
    | 'approval'
    | 'parts'
    | 'visit'
    | 'closed'
    | 'payment-pending'
    | 'delivery-pending'
    | 'neutral';
  icon: 'check' | 'wrench' | 'clock' | 'package' | 'visit' | 'archive' | 'truck' | 'dot';
};

function resolveBadgeStyle(kind: OrderStatusKind, value: string): BadgeStyle {
  if (kind === 'repair') {
    if (value === 'Terminado') return { tone: 'complete', icon: 'check' };
    if (value === 'En reparación' || value === 'En proceso') return { tone: 'progress', icon: 'wrench' };
    if (value === 'Esperando aprobación') return { tone: 'approval', icon: 'clock' };
    if (value === 'Esperando repuestos') return { tone: 'parts', icon: 'package' };
    if (value === 'Visita o recepción') return { tone: 'visit', icon: 'visit' };
    if (value === 'Cerrado') return { tone: 'closed', icon: 'archive' };
    return { tone: 'neutral', icon: 'dot' };
  }
  if (kind === 'payment') {
    if (value === 'Cobrado') return { tone: 'complete', icon: 'check' };
    if (value === 'Pendiente') return { tone: 'payment-pending', icon: 'clock' };
    return { tone: 'neutral', icon: 'dot' };
  }
  if (value === 'Entregado') return { tone: 'complete', icon: 'truck' };
  if (value === 'Pendiente') return { tone: 'delivery-pending', icon: 'clock' };
  return { tone: 'neutral', icon: 'dot' };
}

function renderIcon(icon: BadgeStyle['icon']) {
  const props = { size: 12, strokeWidth: 2.15, className: 'ov-badge__icon', 'aria-hidden': true as const };
  switch (icon) {
    case 'check':
      return <CheckCircle2 {...props} />;
    case 'wrench':
      return <Wrench {...props} />;
    case 'clock':
      return <Clock {...props} />;
    case 'package':
      return <Package {...props} />;
    case 'visit':
      return <ClipboardList {...props} />;
    case 'archive':
      return <Archive {...props} />;
    case 'truck':
      return <Truck {...props} />;
    case 'dot':
    default:
      return <CircleDot {...props} />;
  }
}

/** Semantic order badge distinguishing repair, payment, and delivery with both icon and text. */
export function OrderStatusBadge({ kind, value }: { kind: OrderStatusKind; value: string }) {
  const { tone, icon } = resolveBadgeStyle(kind, value);
  return (
    <span
      className={`ov-badge ov-badge--${tone}`}
      data-status-kind={kind}
      aria-label={`${KIND_LABELS[kind]}: ${value}`}
    >
      {renderIcon(icon)}
      <span className="ov-badge__text">{value}</span>
    </span>
  );
}
