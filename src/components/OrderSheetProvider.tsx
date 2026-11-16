import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Data, Order } from "../repository";
import type { WorkshopActions } from "./workshop/actions";
import { OrderDetail } from "./OrderDetail";

type SheetContext = {
  id: string;
  expanded: boolean;
  origin: HTMLElement | null;
  locked: boolean;
  show: (order: Order, origin: HTMLElement) => void;
};
const Context = createContext<SheetContext | null>(null);
export function useOrderSheet() { return useContext(Context); }

/** One host stays mounted while its originating view, row or card changes. */
export function OrderSheetProvider({ data, actions, children }: { data: Data; actions?: WorkshopActions; children: ReactNode }) {
  const id = useId();
  const [displayedId, setDisplayedId] = useState<string | null>(null);
  const [origin, setOrigin] = useState<HTMLElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [locked, setLocked] = useState(false);
  const lock = useRef(false);
  const originRef = useRef<HTMLElement | null>(null);
  const displayed = data.orders.find(order => order.id === displayedId);
  function setGuard(value: boolean) { lock.current = value; setLocked(value); }
  function show(order: Order, target: HTMLElement) {
    if (lock.current) return;
    originRef.current = target; setOrigin(target); setDisplayedId(order.id); setExpanded(true);
  }
  function close() { if (!lock.current) setExpanded(false); }
  useEffect(() => {
    if (expanded || !displayedId) return;
    const timer = window.setTimeout(() => {
      const trigger = originRef.current;
      if (trigger?.isConnected && !trigger.hasAttribute("disabled")) { trigger.focus(); return; }
      const fallback = document.querySelector<HTMLElement>('[role="status"][tabindex="-1"]') ?? document.querySelector<HTMLElement>('main h1');
      if (fallback) { if (!fallback.hasAttribute("tabindex")) fallback.setAttribute("tabindex", "-1"); fallback.focus(); }
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 10 : 240);
    return () => window.clearTimeout(timer);
  }, [expanded, displayedId]);
  return <Context.Provider value={{ id, expanded, origin, locked, show }}>
    {children}
    {displayed && <OrderDetail id={id} order={displayed} data={data} actions={actions} sheetOpen={expanded} close={close} onBusyChange={setGuard} open={order => { if (!lock.current) setDisplayedId(order.id); }} />}
  </Context.Provider>;
}
