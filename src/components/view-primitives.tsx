import { Eye } from "lucide-react";
import { useRef } from "react";
import type { Data, Order } from "../repository";
import type { WorkshopActions } from "./workshop/actions";
import { OrderSheetProvider, useOrderSheet } from "./OrderSheetProvider";
import "./order-detail.css";

type Props = { order: Order; data: Data; actions?: WorkshopActions };
function DetailButton({ order }: { order: Order }) {
  const sheet = useOrderSheet()!;
  const trigger = useRef<HTMLButtonElement>(null);
  const expanded = sheet.expanded && sheet.origin === trigger.current && !!trigger.current;
  return <button type="button" ref={trigger} aria-expanded={expanded} aria-controls={sheet.id} disabled={sheet.locked} onClick={event => sheet.show(order, event.currentTarget)}><Eye aria-hidden="true" size={16} /> Ver detalle</button>;
}
function WithSheet({ data, actions, children }: { data: Data; actions?: WorkshopActions; children: React.ReactNode }) {
  const existing = useOrderSheet();
  return existing ? children : <OrderSheetProvider data={data} actions={actions}>{children}</OrderSheetProvider>;
}
export function InlineOrder({ order, data, actions }: Props) {
  return <WithSheet data={data} actions={actions}><DetailButton order={order} /></WithSheet>;
}
export function InlineOrderRow({ order, data, cells, actions }: Props & { cells: React.ReactNode[] }) {
  return <WithSheet data={data} actions={actions}><tr>{cells.map((cell, i) => <td key={i}>{cell}</td>)}<td><DetailButton order={order} /></td></tr></WithSheet>;
}
