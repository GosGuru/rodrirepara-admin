import { useEffect, useId, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import type { Client } from '../repository';
import './client-picker.css';

export function ClientPicker({ clients, value, onChange, onAdd }: {
  clients: readonly Client[]; value: string; onChange: (id: string) => void; onAdd: () => void;
}) {
  const [query, setQuery] = useState('');
  const id = useId();
  const normalize = (text: string) => text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es');
  const term = normalize(query.trim());
  const visible = clients.filter(client => normalize(client.name).includes(term) || normalize(client.phone).includes(term));
  const selected = clients.find(client => client.id === value);
  useEffect(() => { setQuery(''); }, [value]);
  return <div className="client-picker">
    <div className="client-picker__toolbar">
      <label className="client-picker__search" htmlFor={`${id}-search`}>Buscar clientes
        <span><Search size={17} aria-hidden="true" /><input id={`${id}-search`} type="search" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }} placeholder="Nombre o teléfono" /></span>
      </label>
      <button type="button" onClick={onAdd} aria-label="Agregar cliente"><Plus size={18} aria-hidden="true" /> Agregar cliente</button>
    </div>
    <label htmlFor={`${id}-list`}>Cliente</label>
    <select id={`${id}-list`} name="client" size={4} required value={value}
      ref={element => { element?.setCustomValidity(value ? '' : 'Elegí un cliente.'); }}
      onChange={event => { event.currentTarget.setCustomValidity(event.currentTarget.value ? '' : 'Elegí un cliente.'); onChange(event.target.value); }}>
      <option value="" disabled>Elegí un cliente</option>
      {selected && !visible.some(client => client.id === selected.id) && <option value={selected.id} hidden>{selected.name} · {selected.phone}</option>}
      {visible.map(client => <option key={client.id} value={client.id}>{client.name} · {client.phone}</option>)}
    </select>
    {selected && <p className="client-picker__selection">Seleccionado: <strong>{selected.name}</strong> · {selected.phone}</p>}
    {visible.length === 0 && <p role="status">{term ? 'No se encontraron clientes.' : 'Todavía no hay clientes.'}</p>}
  </div>;
}
