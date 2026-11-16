import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

const options = ["Todas", "Taller", "Domicilio"];
export function ModeFilter({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const id = useId();
  const selected = Math.max(0, options.indexOf(value));
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [open]);
  const choose = (index: number) => { onChange(options[index]); setOpen(false); root.current?.querySelector("button")?.focus(); };
  return <div className="mode-filter" ref={root} onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false); }}>
    <span id={`${id}-label`} className="mode-filter__label">Modalidad</span>
    <button type="button" role="combobox" aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-controls={`${id}-list`} aria-haspopup="listbox" aria-activedescendant={open ? `${id}-${active}` : undefined}
      onClick={() => { setActive(selected); setOpen(!open); }}
      onKeyDown={e => {
        if (e.key === "Tab") { setOpen(false); return; }
        if (e.key === "Escape") { setOpen(false); return; }
        if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
          e.preventDefault();
          const current = open ? active : selected;
          setActive(e.key === "Home" ? 0 : e.key === "End" ? options.length - 1 : (current + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length);
          setOpen(true);
        } else if ((e.key === "Enter" || e.key === " ") && open) { e.preventDefault(); choose(active); }
      }}><span id={`${id}-value`}>{value}</span><ChevronDown size={16} aria-hidden="true" /></button>
    {open && <div id={`${id}-list`} role="listbox" aria-labelledby={`${id}-label`} className="mode-filter__list">
      {options.map((option, index) => <div key={option} id={`${id}-${index}`} role="option" aria-selected={value === option} className={index === active ? "mode-filter__option is-active" : "mode-filter__option"} onPointerDown={event => event.preventDefault()} onPointerMove={() => setActive(index)} onClick={() => choose(index)}>{option}{value === option && <span aria-hidden="true">✓</span>}</div>)}
    </div>}
  </div>;
}
