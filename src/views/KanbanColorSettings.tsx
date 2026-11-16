import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { colorNames, type ColorName, type Stage, type StageColors } from './kanban-color-settings';

export function KanbanColorSettings({ colors, onChange }: { colors: StageColors; onChange: (stage: Stage, color: ColorName) => void }) {
  const [open, setOpen] = useState(false);
  return <div className="ob-settings"><button type="button" aria-label="Ajustar colores del tablero" aria-expanded={open} aria-controls="ob-color-settings" onClick={() => setOpen(!open)}><MoreHorizontal aria-hidden="true" /></button>
    {open && <div id="ob-color-settings" className="ob-settings-panel"><strong>Colores del tablero</strong><p>Se guardan solo en este navegador.</p>{([['pending', 'Pendientes'], ['progress', 'En proceso'], ['ready', 'Listos']] as const).map(([stage, label]) => <label key={stage}>Color de {label}<select aria-label={`Color de ${label}`} value={colors[stage]} onChange={event => onChange(stage, event.target.value as ColorName)}>{Object.entries(colorNames).map(([value, name]) => <option key={value} value={value}>{name}</option>)}</select></label>)}</div>}
  </div>;
}
