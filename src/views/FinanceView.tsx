import { Receipt } from "lucide-react";
import type { Data } from "../repository";
import { PERSONAL_EXPENSE_CATEGORY } from "../components/QuickActionForms";
import { money } from "../selectors";
import { todayIsoLocal } from "../utils/date";
import { Table } from "../components/Table";
import "./module-visuals.css";
export function FinanceView({ data: d, pending, onCreateExpense }: { data: Data; pending: number; onCreateExpense: () => void }) {
  const businessExpenses = d.expenses.filter(e => e.category !== PERSONAL_EXPENSE_CATEGORY);
  const personalExpenses = d.expenses.filter(e => e.category === PERSONAL_EXPENSE_CATEGORY);
  return <section className="panel mv-finance">
    <div className="heading"><div><h2>Movimientos y pendientes</h2><p>La caja no es margen por orden. Sin saldo inicial.</p></div><button onClick={onCreateExpense}><Receipt aria-hidden="true" /> Registrar gasto</button></div>
    <div className="mv-finance-periods">{(["Hoy", "Semana", "Mes"] as const).map((label, i) => {
      const now = new Date();
      const end = todayIsoLocal(now);
      const start = new Date(now);
      if (i === 1) start.setDate(now.getDate() - 6);
      if (i === 2) start.setDate(1);
      const from = i === 0 ? end : todayIsoLocal(start);
      const income = d.payments.filter(p => p.date >= from && p.date <= end).reduce((n, p) => n + p.amount, 0);
      const expense = businessExpenses.filter(p => p.date >= from && p.date <= end).reduce((n, p) => n + p.amount, 0);
      const parts = d.partsPurchases.filter(p => p.date >= from && p.date <= end).reduce((n, p) => n + p.cost, 0);
      return <section className="mv-finance-period" key={label}><h3>{label}:</h3><dl className="mv-finance-metrics">{[["cobros", income], ["gastos generales", expense], ["compras de repuestos", parts], ["movimientos netos", income - expense - parts]].map(([name, value]) => <div className="mv-finance-metric" key={name}><dt>{name}</dt><dd>{money(value as number)}</dd></div>)}</dl></section>;
    })}</div>
    <div className="mv-pending"><p>Por cobrar con precio final: <strong>{money(pending)}</strong></p><p>Las órdenes sin precio final no se cuentan.</p></div>
    <h3>Gastos generales</h3><Table heads={["Concepto", "Categoría", "Fecha", "Importe"]} rows={businessExpenses.map(e => [e.description, e.category, e.date, money(e.amount)])} />
    <h3>Gastos personales</h3><Table heads={["Concepto", "Fecha", "Importe"]} rows={personalExpenses.map(e => [e.description, e.date, money(e.amount)])} />
    <h3>Margen por orden terminada</h3><Table heads={["Orden", "Precio final", "Costos de repuestos", "Mano de obra", "Margen antes de gastos generales"]} rows={d.orders.filter(o => o.price !== null && ["Terminado", "Cerrado"].includes(o.repair)).map(o => [o.id, money(o.price!), money(o.partsCost), money(o.labor), money(o.price! - o.partsCost - o.labor)])} />
  </section>;
}
