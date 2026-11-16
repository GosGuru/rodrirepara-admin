import { LayoutDashboard, MessagesSquare, UsersRound, Wrench, Wallet, Package, TrendingUp } from 'lucide-react';
import LineSidebar from './react-bits/LineSidebar';

const items = [
  { label: 'Resumen', icon: <LayoutDashboard aria-hidden="true" />, group: 'Operación' },
  { label: 'Consultas', icon: <MessagesSquare aria-hidden="true" /> },
  { label: 'Clientes e historial', icon: <UsersRound aria-hidden="true" /> },
  { label: 'Órdenes de trabajo', icon: <Wrench aria-hidden="true" /> },
  { label: 'Finanzas', icon: <Wallet aria-hidden="true" />, group: 'Administración' },
  { label: 'Repuestos', icon: <Package aria-hidden="true" /> },
  { label: 'Crecimiento', icon: <TrendingUp aria-hidden="true" />, group: 'Planificación' },
];
export function Sidebar({ view, setView }: { view: string; setView: (view: string) => void }) {
  return <aside className="sidebar"><div className="brand">Rodrigo Repara<span>GESTIÓN DE REPARACIONES</span></div><LineSidebar items={items} active={view} onItemClick={setView} /></aside>;
}
