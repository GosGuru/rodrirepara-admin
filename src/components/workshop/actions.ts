import type { CRMRepository, Data, OrderUpdate, PaymentInput } from '../../repository';

export type WorkshopActions = {
  updateOrder: (id: string, patch: OrderUpdate) => Promise<void>;
  registerPayment: (id: string, input: PaymentInput) => Promise<void>;
};
const generic = 'No se guardó. Revisá los datos o el espacio disponible y volvé a intentar.';
const known = new Set([
  'No se encontró la orden.', 'La edición contiene campos no permitidos.',
  'El precio final no puede ser menor a lo cobrado.', 'El cliente no puede cambiar si rompe una garantía.',
  'El importe debe ser un número positivo y finito.', 'La fecha del cobro no es válida.',
  'El importe no se puede representar.', 'El cobro supera el saldo pendiente.',
  'Los datos locales no son válidos. No se modificaron.',
  'No se pudieron leer los datos locales. Revisá el acceso al almacenamiento del navegador. No se modificaron.',
  'No se pudieron leer los datos locales: contenido inválido. No se modificaron.',
  'Faltan las tablas en Supabase. Ejecutá supabase/schema.sql en el SQL Editor.',
  'Tu sesión expiró o no tenés permisos. Volvé a iniciar sesión.',
  'No se pudo conectar con la base de datos. Revisá tu conexión y volvé a intentar.',
  'Los datos recibidos de Supabase no son válidos.',
  'Los datos ingresados no son válidos. No se guardaron.',
]);
export function createWorkshopActions(repo: CRMRepository, apply: (data: Data) => void, notice: (text: string) => void): WorkshopActions {
  async function save(operation: () => Promise<Data>, success: string) {
    notice('');
    try { const data = await operation(); apply(data); notice(success); }
    catch (error) { throw new Error(error instanceof Error && known.has(error.message) ? error.message : generic); }
  }
  return {
    updateOrder: (id, patch) => save(() => repo.updateOrder(id, patch), `Orden ${id} actualizada en este navegador.`),
    registerPayment: (id, input) => save(() => repo.registerPayment(id, input), `Cobro de ${id} registrado en este navegador.`),
  };
}
