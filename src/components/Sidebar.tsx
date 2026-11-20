import { Home, Wrench, Users, FileText, Settings, ChevronRight } from 'lucide-react';
import LineSidebar from './react-bits/LineSidebar';

function ReportsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="13" width="4" height="8" rx="1" />
      <rect x="10" y="8" width="4" height="13" rx="1" />
      <rect x="17" y="4" width="4" height="17" rx="1" />
    </svg>
  );
}

const items = [
  { label: 'Tablero', value: 'Resumen', icon: <Home strokeWidth={1.75} aria-hidden="true" /> },
  { label: 'Reparaciones', value: 'Órdenes de trabajo', icon: <Wrench strokeWidth={1.75} aria-hidden="true" /> },
  { label: 'Clientes', value: 'Clientes e historial', icon: <Users strokeWidth={1.75} aria-hidden="true" /> },
  { label: 'Gastos', value: 'Finanzas', icon: <FileText strokeWidth={1.75} aria-hidden="true" /> },
  { label: 'Reportes', value: 'Crecimiento', icon: <ReportsIcon /> },
  { label: 'Configuración', value: 'Configuración', icon: <Settings strokeWidth={1.75} aria-hidden="true" />, separated: true },
];

export function Sidebar({
  view,
  setView,
  onOpenSettings,
}: {
  view: string;
  setView: (view: string) => void;
  onOpenSettings?: () => void;
}) {
  function handleClick(target: string) {
    if (target === 'Configuración' && onOpenSettings) {
      onOpenSettings();
      return;
    }
    setView(target);
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand__logo" aria-hidden="true">
          <Wrench size={17} strokeWidth={1.85} />
        </div>
        <div className="sidebar-brand__copy">
          <strong>Rodrigo Repara</strong>
          <span>Gestión de reparaciones</span>
        </div>
      </div>

      <LineSidebar items={items} active={view} onItemClick={handleClick} />

      <div className="sidebar-footer">
        <button
          type="button"
          className="sidebar-profile"
          onClick={() => (onOpenSettings ? onOpenSettings() : setView('Resumen'))}
          aria-label="Perfil de Rodrigo, Administrador"
        >
          <span className="sidebar-profile__avatar" aria-hidden="true">R</span>
          <span className="sidebar-profile__info">
            <strong>Rodrigo</strong>
            <span>Administrador</span>
          </span>
          <ChevronRight size={14} strokeWidth={2} className="sidebar-profile__chevron" aria-hidden="true" />
        </button>
      </div>
    </aside>
  );
}
