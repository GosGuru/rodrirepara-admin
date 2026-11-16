export function Header({ view, title, subtitle }: { view: string; title?: string; subtitle?: string }) {
  return (
    <header className="top">
      <div>
        <h1>
          {title ?? (view === "Resumen" ? "Cada trabajo tiene un próximo paso." : view)}
        </h1>
        <p>
          {subtitle ?? (view === "Resumen"
            ? "Reparaciones, clientes y dinero en un solo lugar."
            : "Seguimiento operativo de Rodrigo Repara.")}
        </p>
      </div>
    </header>
  );
}
