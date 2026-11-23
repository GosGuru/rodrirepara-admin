import { Plus, Receipt } from "lucide-react";
import type { Data } from "./repository";
import type { GoogleSyncController } from "./hooks/useGoogleSync";
import { useOrderSheet } from "./components/OrderSheetProvider";
import { CommandSearch } from "./components/CommandSearch";
import { NotificationsPopover } from "./components/NotificationsPopover";
import { GoogleSyncControl } from "./components/GoogleSyncControl";

function formatSpanishDate(date: Date): string {
  const raw = new Intl.DateTimeFormat("es-UY", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(date);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function Header({
  view,
  title,
  subtitle,
  dashboardChrome = false,
  data,
  onCreateRepair,
  onCreateExpense,
  onQuickSearch,
  onOpenClients,
  googleSync,
}: {
  view: string;
  title?: string;
  subtitle?: string;
  dashboardChrome?: boolean;
  data?: Data;
  unreadCount?: number;
  onCreateRepair?: () => void;
  onCreateExpense?: () => void;
  onOpenNotifications?: () => void;
  onQuickSearch?: (query: string) => void;
  onOpenClients?: () => void;
  googleSync?: GoogleSyncController;
}) {
  const orderSheet = useOrderSheet();

  if (dashboardChrome) {
    const todayLabel = formatSpanishDate(new Date());
    return (
      <header className="top top--dashboard">
        <div className="top-intro">
          <p className="top-date">{todayLabel}</p>
          <h1 className="top-greeting">
            Hola, Rodrigo <span className="top-wave" aria-hidden="true">👋</span>
          </h1>
        </div>
        <div className="top-actions">
          <CommandSearch
            data={data}
            onSelectOrder={(order, trigger) => orderSheet?.show(order, trigger)}
            onSelectClient={onOpenClients}
            onSubmitQuery={onQuickSearch}
          />
          <NotificationsPopover
            data={data}
            onSelectOrder={(order, trigger) => orderSheet?.show(order, trigger)}
          />
          {googleSync && <GoogleSyncControl sync={googleSync} data={data} />}
          {onCreateExpense && (
            <button
              type="button"
              className="top-secondary-cta"
              onClick={onCreateExpense}
            >
              <Receipt size={14} strokeWidth={2} aria-hidden="true" />
              <span>Registrar gasto</span>
            </button>
          )}
          <button
            type="button"
            className="top-cta"
            onClick={onCreateRepair}
          >
            <Plus size={14} strokeWidth={2.2} aria-hidden="true" />
            <span>Nueva reparación</span>
          </button>
        </div>
      </header>
    );
  }

  return (
    <header className="top">
      <div>
        <h1>
          {title ?? (view === "Resumen" ? "Cada trabajo tiene un próximo paso." : view)}
        </h1>
        <p>
          {subtitle ??
            (view === "Resumen"
              ? "Reparaciones, clientes y dinero en un solo lugar."
              : "Seguimiento operativo de Rodrigo Repara.")}
        </p>
      </div>
      {googleSync && (
        <div className="top-actions">
          <GoogleSyncControl sync={googleSync} data={data} />
        </div>
      )}
    </header>
  );
}
