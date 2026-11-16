import { useId, useRef, useState } from "react";
import type { Data, Order } from "../repository";

export function useInlineOrder(anchor: Order, data: Data) {
  const [displayedId, setDisplayedId] = useState<string | null>(null);
  const displayed = data.orders.find(order => order.id === displayedId) ?? null;
  const [busy, setBusy] = useState(false);
  function setDisplayed(order: Order) { setDisplayedId(order.id); }
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  function toggle() {
    if (busy) return;
    if (displayed) setDisplayedId(null);
    else setDisplayedId(anchor.id);
  }
  function close() {
    setDisplayedId(null);
    trigger.current?.focus();
  }
  return { displayed, setDisplayed, trigger, id, toggle, close, busy, setBusy };
}
