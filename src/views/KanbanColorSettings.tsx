import { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import {
  BOARD_COLOR_PALETTE,
  STAGE_META,
  type Stage,
  type StageColors,
} from './kanban-color-settings';

export function KanbanColorSettings({
  colors,
  onChange,
}: {
  colors: StageColors;
  onChange: (stage: Stage, hex: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="ob-settings">
      <button
        type="button"
        aria-label="Ajustar colores del tablero"
        aria-expanded={open}
        aria-controls="ob-color-settings"
        onClick={() => setOpen(!open)}
      >
        <MoreHorizontal aria-hidden="true" />
      </button>
      {open && (
        <div id="ob-color-settings" className="ob-settings-panel">
          <strong>Colores del tablero</strong>
          <p>Se guardan solo en este navegador.</p>
          {STAGE_META.map(({ id, label }) => (
            <div key={id} role="group" aria-label={`Color de ${label}`}>
              <span>{label}</span>
              <div>
                {BOARD_COLOR_PALETTE.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-label={`${option.name} (${option.hex})`}
                    aria-pressed={colors[id] === option.hex}
                    onClick={() => onChange(id, option.hex)}
                  >
                    {option.name}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
