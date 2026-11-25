import {
  createContext,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { X, UserPlus, Receipt } from "lucide-react";
import "./create-dialog.css";
import "./components/auth-gate.css";
import type { CRMRepository, Data } from "./repository";
import { ClientForm, ExpenseForm } from "./components/QuickActionForms";
import { Toast } from "./components/ui/Toast";
import { dashboard, filterOrders } from "./selectors";
import { Header } from "./Header";
import { Sidebar } from "./components/Sidebar";
import { OverviewView } from "./views/OverviewView";
import { OrdersView } from "./views/OrdersView";
import { ClientsView } from "./views/ClientsView";
import { ConsultationsView } from "./views/ConsultationsView";
import { FinanceView } from "./views/FinanceView";
import { PartsView } from "./views/PartsView";
import { GrowthView } from "./views/GrowthView";
import { NewRepairView } from "./views/NewRepairView";
import { OrderSheetProvider } from "./components/OrderSheetProvider";
import { SettingsDrawer } from "./components/settings/SettingsDrawer";
import { createWorkshopActions } from "./components/workshop/actions";
import { useGoogleSync } from "./hooks/useGoogleSync";
import { readColors, saveColors, type StageColors } from "./views/kanban-color-settings";

const viewSubtitles: Record<string, string> = {
  Consultas: 'Identificá cada consulta y su estado de respuesta.',
  'Clientes e historial': 'Encontrá al cliente y seguí el historial de sus equipos.',
  'Órdenes de trabajo': 'Compará reparación, cobro y entrega sin perder contexto.',
  Finanzas: 'Cobros, gastos y pendientes; caja y margen por separado.',
  Repuestos: 'Compras registradas y órdenes asociadas, sin inventario avanzado.',
  Crecimiento: 'Etapas propuestas y decisiones pendientes del negocio.',
};
const Context = createContext<CRMRepository | null>(null);

export function Provider({
  repository,
  children,
}: {
  repository: CRMRepository;
  children: ReactNode;
}) {
  return <Context.Provider value={repository}>{children}</Context.Provider>;
}

function Dialog({
  title,
  subtitle,
  icon,
  iconTone = 'lavender',
  onClose,
  children,
  busy = false,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  iconTone?: 'blue' | 'lavender' | 'amber';
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const dialog = ref.current!;
    dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="create-dialog"
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(e) => {
        if (e.target === ref.current && !busy) onClose();
      }}
    >
      <div className="create-dialog__header">
        <div className="create-dialog__title-wrap">
          {icon && (
            <div className={`create-card__icon create-card__icon--${iconTone}`} aria-hidden="true">
              {icon}
            </div>
          )}
          <div className="create-dialog__title-copy">
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
        </div>
        <button
          type="button"
          className="create-dialog__close"
          onClick={onClose}
          disabled={busy}
          aria-label="Cerrar diálogo"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      {children}
    </dialog>
  );
}

export default function App({
  userEmail,
  onSignOut,
}: {
  userEmail?: string;
  onSignOut?: () => Promise<void> | void;
} = {}) {
  const repo = useContext(Context)!;
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);
  const [view, setView] = useState("Resumen");
  const [returnView, setReturnView] = useState("Resumen");
  const [dialog, setDialog] = useState<"" | "cliente" | "gasto">("");
  const [dialogBusy, setDialogBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("Todas");
  const [notice, setNotice] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [boardColors, setBoardColors] = useState(readColors);
  const [colorError, setColorError] = useState(false);
  const noticeRef = useRef<HTMLDivElement>(null);

  async function persistBoardColors(next: StageColors): Promise<void> {
    const saved = saveColors(next);
    if (!saved) {
      setColorError(true);
      throw new Error("No se pudieron guardar los colores del tablero.");
    }
    setBoardColors(next);
    setColorError(false);
  }

  function openNewRepair() {
    if (view !== "Nueva reparación") {
      setReturnView(view);
    }
    setDialog("");
    setView("Nueva reparación");
  }

  const googleSync = useGoogleSync({
    onNotice: (text) => {
      setNotice(text);
    },
  });

  const applyAndSync = (next: Data) => {
    setData(next);
    googleSync.syncAfterMutation(next);
  };

  const actions = useMemo(() => createWorkshopActions(repo, (next) => {
    setData(next);
    googleSync.syncAfterMutation(next);
  }, text => {
    setNotice(text);
    if (text) requestAnimationFrame(() => { if (!document.activeElement || document.activeElement === document.body) noticeRef.current?.focus(); });
  }), [repo, googleSync.syncAfterMutation]);

  useEffect(() => {
    let active = true;
    setError("");
    Promise.resolve()
      .then(() => repo.load())
      .then((loaded) => {
        if (active) setData(loaded);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const message = err instanceof Error && err.message.trim().length > 0
          ? err.message
          : "No se pudieron cargar los datos. Revisá la conexión y volvé a intentar.";
        setError(message);
      });
    return () => {
      active = false;
    };
  }, [repo, reloadTick]);

  if (error)
    return (
      <main className="auth-shell">
        <section className="auth-card">
          <h1>No se pudo abrir el tablero</h1>
          <p role="alert" className="auth-error">{error}</p>
          <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
            <button
              type="button"
              className="auth-submit"
              style={{ flex: 1, marginTop: 0 }}
              onClick={() => setReloadTick((n) => n + 1)}
            >
              Reintentar
            </button>
            {onSignOut && (
              <button
                type="button"
                className="cfg-cancel-btn"
                onClick={() => void onSignOut()}
              >
                Cerrar sesión
              </button>
            )}
          </div>
        </section>
      </main>
    );
  if (!data) return <main className="auth-shell" aria-live="polite"><div className="auth-loading">Cargando datos…</div></main>;

  const d = data;
  const stats = dashboard(d);
  const filtered = filterOrders(d, query, mode);
  const isNewRepair = view === "Nueva reparación";

  return (
    <div className="shell">
      <Sidebar view={view} setView={setView} onOpenSettings={() => setSettingsOpen(true)} />
      <OrderSheetProvider data={d} actions={actions}>
      <main
        className={
          view === 'Resumen'
            ? 'overview-main'
            : isNewRepair
              ? 'create-view-main'
              : undefined
        }
      >
        {!isNewRepair && (
          <Header
            view={view}
            dashboardChrome={view === 'Resumen'}
            data={d}
            googleSync={googleSync}
            onCreateRepair={openNewRepair}
            onCreateExpense={() => setDialog("gasto")}
            onQuickSearch={(q) => { setQuery(q); setView("Órdenes de trabajo"); }}
            onOpenClients={() => setView("Clientes e historial")}
            title={view === 'Resumen' ? undefined : view}
            subtitle={view === 'Resumen' ? '' : viewSubtitles[view]}
          />
        )}
        <Toast
          message={notice}
          onDismiss={() => setNotice("")}
          statusRef={noticeRef}
        />
        {view === "Resumen" && (
          <OverviewView
            actions={actions}
            data={d}
            stats={stats}
            colors={boardColors}
            colorError={colorError}
            onViewOrders={() => setView("Órdenes de trabajo")}
            onOpenConsultations={() => setView("Consultas")}
            onOpenFinance={() => setView("Finanzas")}
            onCreateRepair={openNewRepair}
            onCreateClient={() => setDialog("cliente")}
            onCreateExpense={() => setDialog("gasto")}
          />
        )}
        {isNewRepair && (
          <NewRepairView
            clients={d.clients}
            orders={d.orders}
            onBack={() => setView(returnView)}
            onCreateClient={async (input) => {
              const result = await repo.addClientWithId(input);
              applyAndSync(result.data);
              return result.clientId;
            }}
            onSaveRepair={async (input) => {
              const next = await repo.addOrder(input);
              applyAndSync(next);
            }}
            onClientCreated={() => setNotice("Cliente creado correctamente.")}
            onRepairSaved={() => {
              setView(returnView);
              setNotice("Reparación registrada correctamente.");
            }}
          />
        )}
        {view === "Órdenes de trabajo" && <OrdersView actions={actions} data={d} filtered={filtered} query={query} mode={mode} onQueryChange={setQuery} onModeChange={setMode} />}
        {view === "Clientes e historial" && <ClientsView actions={actions} data={d} onCreateClient={() => setDialog("cliente")} />}
        {view === "Consultas" && <ConsultationsView data={d} leads={stats.leads} />}
        {view === "Finanzas" && <FinanceView data={d} pending={stats.pending} onCreateExpense={() => setDialog("gasto")} />}
        {view === "Repuestos" && <PartsView data={d} />}
        {view === "Crecimiento" && <GrowthView />}
      </main>
      </OrderSheetProvider>
      <SettingsDrawer
        open={settingsOpen}
        colors={boardColors}
        userEmail={userEmail}
        onSignOut={onSignOut}
        googleSync={googleSync}
        data={d}
        onSaveColors={persistBoardColors}
        onColorsSaved={() => setNotice("Colores del tablero guardados.")}
        onOpenModule={(moduleView) => setView(moduleView)}
        onCreateClient={() => setDialog("cliente")}
        onCreateExpense={() => setDialog("gasto")}
        onCreateRepair={openNewRepair}
        onClose={() => setSettingsOpen(false)}
      />
      {dialog === "cliente" && (
        <Dialog
          title="Nuevo cliente"
          subtitle="Agregar un cliente a tu base"
          icon={<UserPlus size={20} strokeWidth={2} />}
          iconTone="lavender"
          busy={dialogBusy}
          onClose={() => setDialog("")}
        >
          <ClientForm
            onBusyChange={setDialogBusy}
            onCancel={() => setDialog("")}
            onSave={async (input) => {
              const next = await repo.addClient(input);
              applyAndSync(next);
            }}
            onConfirmed={() => {
              setDialog("");
              setNotice("Cliente creado correctamente.");
            }}
          />
        </Dialog>
      )}
      {dialog === "gasto" && (
        <Dialog
          title="Registrar gasto"
          subtitle="Cargar un gasto operativo del taller"
          icon={<Receipt size={20} strokeWidth={2} />}
          iconTone="amber"
          busy={dialogBusy}
          onClose={() => setDialog("")}
        >
          <ExpenseForm
            onBusyChange={setDialogBusy}
            onCancel={() => setDialog("")}
            onSave={async (input) => {
              const next = await repo.addExpense(input);
              applyAndSync(next);
            }}
            onConfirmed={() => {
              setDialog("");
              setNotice("Cambios guardados correctamente.");
            }}
          />
        </Dialog>
      )}
    </div>
  );
}
