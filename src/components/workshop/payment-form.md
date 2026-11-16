# Formulario inline de cobro

`PaymentForm({ order: Order, onSave: (input: PaymentInput) => Promise<void>, onCancel: () => void })` exporta el componente y `PaymentFormProps`. El caller debe montarlo con `key={order.id}` para que el borrador de una orden no pase a otra. Es inline, sin diálogo ni acceso a repositorio; el padre actualiza datos y cierra tras éxito. `onCancel` solo corresponde a la acción explícita de cancelar.

Para un pie externo se admiten `formId?: string`, `hideActions?: boolean` y `onBusyChange?: (busy: boolean) => void`; el botón externo apunta al formulario vivo con `form={formId}`. Los callbacks originales no cambian.

Muestra ID, equipo, precio final, acumulado y saldo desde la orden actual, sin reconstruir el acumulado desde el historial. Precio null indica «Sin definir» y permite seña o parcial; cero es precio definido. Si el acumulado alcanza o supera el precio, explica que no hay saldo cobrable y deshabilita guardar; un precio actualizado mayor vuelve a habilitarlo. Estados cerrados, entregados y garantías no bloquean por sí mismos.

Importe empieza vacío, debe ser positivo y finito y usa `step="any"`, no una política de centavos. No se establece un `max` basado en resta flotante: el saldo formateado es orientativo y el repositorio valida límite y representabilidad decimal con datos frescos. Fecha inicia con `new Date().toISOString().slice(0, 10)` como los formularios existentes; el repositorio valida la fecha calendario. No se imponen límites temporales adicionales.

Selectores públicos: formulario `aria-label="Registrar cobro <id>"`; inputs `name="amount"` y `name="date"`; acciones «Guardar cobro» y «Cancelar cobro». El envío llama una vez a `onSave({ amount: number, date: string })`; una guarda síncrona y botones deshabilitados evitan duplicados mientras está pendiente. Ante rechazo conserva ambos campos y anuncia `Error.message` o el mensaje genérico. El padre traduce errores desconocidos de almacenamiento a mensajes seguros. No edita precio, historial, reparación ni entrega.

Las pruebas SSR verifican solamente estructura y estados iniciales con props públicas: no demuestran ejecución de callbacks, foco, persistencia ni comportamiento ante carreras. W3/W4 deben comprobar esas interacciones en navegador, incluida recuperación de error, cierre y refresco por el padre y navegación entre órdenes.
