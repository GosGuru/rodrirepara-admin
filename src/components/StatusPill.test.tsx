import { expect, test } from 'bun:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { StatusPill, type StatusKind } from './StatusPill';

test('señales semánticas conservan texto y separan reparación, cobro, entrega y consultas', () => {
  const cases: [StatusKind, string, string, string][] = [
    ['repair', 'Esperando repuestos', 'pending', 'Reparación'],
    ['repair', 'En reparación', 'neutral', 'Reparación'],
    ['repair', 'Terminado', 'complete', 'Reparación'],
    ['repair', 'Cerrado', 'neutral', 'Reparación'],
    ['payment', 'Pendiente', 'pending', 'Cobro'],
    ['payment', 'Cobrado', 'complete', 'Cobro'],
    ['delivery', 'Pendiente', 'pending', 'Entrega'],
    ['delivery', 'Entregado', 'complete', 'Entrega'],
    ['lead', 'Nueva', 'info', 'Consulta'],
    ['lead', 'Pendiente de respuesta', 'pending', 'Consulta'],
  ];
  for (const [kind, value, tone, name] of cases) {
    const html = renderToStaticMarkup(<StatusPill kind={kind} value={value} />);
    expect(html).toContain(`status-pill--${tone}`);
    expect(html).toContain(`aria-label="${name}: ${value}"`);
    expect(html).toContain(`>${value}</span>`);
  }
});

test('estados desconocidos se conservan y escapan sin normalización ni falsa finalización', () => {
  for (const kind of ['repair', 'payment', 'delivery', 'lead'] as const) {
    const html = renderToStaticMarkup(<StatusPill kind={kind} value="Revisión <especial>" />);
    expect(html).toContain('status-pill--neutral');
    expect(html).toContain('Revisión &lt;especial&gt;');
    expect(html).not.toContain('status-pill--complete');
  }
});
