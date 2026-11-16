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
import { X } from "lucide-react";
import "./create-dialog.css";
import type { CRMRepository, Data } from "./repository";
import { ClientForm, ExpenseForm, RepairForm } from "./components/QuickActionForms";
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
import { OrderSheetProvider } from "./components/OrderSheetProvider";
import { createWorkshopActions } from "./components/workshop/actions";

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
  onClose,
  children,
  busy = false,
  nested = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  busy?: boolean;
  nested?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const dialog = ref.current!;
    dialog.showModal();
    return () => {
      dialog.close();
      previous?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`create-dialog${nested ? ' create-dialog--nested' : ''}`}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <div className="heading">
        <h2 id={titleId}>{title}</h2>
        <button onClick={onClose} disabled={busy} aria-label="Cerrar diálogo">
          <X size={20} aria-hidden="true" />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export default function App() {
  const repo = useContext(Context)!;
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [view, setView] = useState("Resumen");
  const [dialog, setDialog] = useState("");
  const [nestedClient, setNestedClient] = useState(false);
  const [clientBusy, setClientBusy] = useState(false);
  const [selectedClient, setSelectedClient] = useState('');
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState("Todas");
  const [notice, setNotice] = useState("");
  const noticeRef = useRef<HTMLParagraphElement>(null);
  const actions = useMemo(() => createWorkshopActions(repo, setData, text => {
    setNotice(text);
    if (text) requestAnimationFrame(() => { if (!document.activeElement || document.activeElement === document.body) noticeRef.current?.focus(); });
  }), [repo]);
  useEffect(() => {
    Promise.resolve()
      .then(() => repo.load())
      .then(setData)
      .catch(() =>
        setError(
          "No se pudieron leer los datos locales. Revisá el almacenamiento del navegador; no se modificaron.",
        ),
      );
  }, [repo]);
  if (error)
    return (
      <main>
        <h1>No se pudo abrir el tablero</h1>
        <p role="alert">{error}</p>
        <p>Los datos guardados no se modificaron.</p>
      </main>
    );
  if (!data) return <main aria-live="polite">Cargando datos locales…</main>;
  const d = data;
  const stats = dashboard(d);
  const filtered = filterOrders(d, query, mode);
  function saved(next: Data) {
    setData(next);
    setDialog("");
    setNotice("Guardado en este navegador.");
  }
  return (
    <div className="shell">
      <Sidebar view={view} setView={setView} />
      <OrderSheetProvider data={d} actions={actions}>
      <main className={view === 'Resumen' ? 'overview-main' : undefined}>
        <Header view={view} title={view === 'Resumen' ? 'Tablero de trabajo' : undefined} subtitle={view === 'Resumen' ? '' : viewSubtitles[view]} />
        {notice && (
          <p role="status" className="note" tabIndex={-1} ref={noticeRef}>
            {notice}
          </p>
        )}
        {view === "Resumen" && <OverviewView actions={actions} data={d} stats={stats} onViewOrders={() => setView("Órdenes de trabajo")} onCreateRepair={() => { setSelectedClient(''); setDialog("reparación"); }} onCreateClient={() => setDialog("cliente")} onCreateExpense={() => setDialog("gasto")} />}
        {view === "Órdenes de trabajo" && <OrdersView actions={actions} data={d} filtered={filtered} query={query} mode={mode} onQueryChange={setQuery} onModeChange={setMode} />}
        {view === "Clientes e historial" && <ClientsView actions={actions} data={d} onCreateClient={() => setDialog("cliente")} />}
        {view === "Consultas" && <ConsultationsView data={d} leads={stats.leads} />}
        {view === "Finanzas" && <FinanceView data={d} pending={stats.pending} onCreateExpense={() => setDialog("gasto")} />}
        {view === "Repuestos" && <PartsView data={d} />}
        {view === "Crecimiento" && <GrowthView />}
      </main>
      </OrderSheetProvider>
      {dialog && (
        <Dialog
          title={dialog === "reparación" ? "Nueva reparación" : dialog === "cliente" ? "Nuevo cliente" : "Registrar gasto"}
          onClose={() => setDialog("")}
        >
          {dialog === 'cliente' ? <ClientForm onSave={async input => saved(await repo.addClient(input))} />
            : dialog === 'gasto' ? <ExpenseForm onSave={async input => saved(await repo.addExpense(input))} />
            : <RepairForm clients={d.clients} clientId={selectedClient} onClientChange={setSelectedClient} onAddClient={() => setNestedClient(true)} onSave={async input => saved(await repo.addOrder(input))} />}
        </Dialog>
      )}
      {dialog === 'reparación' && nestedClient && <Dialog title="Nuevo cliente" nested busy={clientBusy} onClose={() => setNestedClient(false)}>
        <ClientForm onBusyChange={setClientBusy} onSave={async input => {
          const result = await repo.addClientWithId(input);
          setData(result.data); setSelectedClient(result.clientId); setNestedClient(false);
        }} />
      </Dialog>}
    </div>
  );
}
