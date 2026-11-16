import type { ReactNode } from "react";
export function Table({ heads, rows }: { heads: string[]; rows: ReactNode[][] }) {
  return <div className="table-wrap" tabIndex={0} role="region" aria-label="Tabla desplazable horizontalmente">
    <table><thead><tr>{heads.map((h) => <th key={h}>{h}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j}>{v}</td>)}</tr>)}</tbody></table>
    {!rows.length && <p>No hay registros para mostrar.</p>}
  </div>;
}
