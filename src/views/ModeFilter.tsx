import { useId } from 'react';
import { Home, Layers, Wrench } from 'lucide-react';
import { Select, type SelectOption } from '../components/ui/Select';

const MODE_SELECT_OPTIONS: readonly SelectOption[] = [
  { value: 'Todas', label: 'Todas', icon: <Layers size={15} strokeWidth={1.9} /> },
  { value: 'Taller', label: 'Taller', icon: <Wrench size={15} strokeWidth={1.9} /> },
  { value: 'Domicilio', label: 'Domicilio', icon: <Home size={15} strokeWidth={1.9} /> },
];

export function ModeFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const labelId = useId();

  return (
    <div className="ov-filter-field ov-filter-field--mode">
      <span id={labelId} className="ov-filter-field__label">
        Modalidad
      </span>
      <Select
        value={value}
        onChange={onChange}
        options={MODE_SELECT_OPTIONS}
        ariaLabelledBy={labelId}
      />
    </div>
  );
}
