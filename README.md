# Rodrigo Repara · tablero operativo

Tablero operativo para gestionar reparaciones, clientes, cobros y gastos con persistencia en **Supabase** protegida por **Supabase Auth + Row Level Security (RLS)**. El proyecto inicia completamente vacío y listo para cargar datos reales.

## Configuración de Supabase e inicio

1. Instalá las dependencias con Bun: `bun install`.
2. Copiá `.env.example` a `.env.local` y configurá tus credenciales de Supabase (`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`). En Vercel u otro hosting, cargá esas mismas variables de entorno.
3. En el **SQL Editor** de tu proyecto de Supabase, ejecutá una sola vez el script [`supabase/schema.sql`](supabase/schema.sql). Crea las 6 tablas vacías (`clients`, `orders`, `expenses`, `leads`, `payments`, `parts_purchases`), el RPC atómico `register_payment`, las restricciones de integridad y las políticas RLS exclusivas para usuarios autenticados (`authenticated`, sin acceso `anon`).
4. En **Supabase → Authentication → Users**, creá el usuario con correo y contraseña para acceder al panel (el formulario de acceso no expone registro público).
5. Ejecutá `bun run dev`, abrí la dirección local indicada e iniciá sesión. Usá los accesos rápidos para cargar clientes, reparaciones y gastos reales.

## Uso de las vistas

Los iconos Lucide acompañan selectivamente acciones con texto. En Órdenes, buscá y combiná la búsqueda con Modalidad (Todas, Taller o Domicilio); el control admite teclado, ratón y tacto, y Limpiar filtros restablece ambos criterios. «Ver detalle» abre una ficha lateral animada desde Resumen, Órdenes o Clientes, sin deformar el tablero ni la tabla; las garantías enlazan la orden original. La ficha agrupa trabajo, importes e historial de cobros y conserva su identidad aunque desaparezca la tarjeta de origen. La creación de reparación, cliente y gasto sigue en diálogos.

Resumen muestra todos los trabajos activos en **Pendientes**, **En proceso** y **Listos**, con señales ámbar, neutras y verde oliva. «Visita o recepción», «Esperando aprobación» y «Esperando repuestos» van a Pendientes; «En reparación» y «En proceso», a En proceso; «Terminado», a Listos. Cualquier otra etiqueta activa aparece en **Otros estados**, solo cuando hace falta. Arrastrá desde el asa o usá «Mover» para cambiar de etapa: antes de guardar se muestra el estado exacto. Para Pendientes elegís entre sus tres estados existentes; cancelar no escribe. Mover dentro de la misma columna no guarda ni inventa un orden persistido. Solo cambia reparación, sin completar fechas, cobrar ni entregar. Los Cerrados siguen en Órdenes e historial. Cobro y entrega se muestran por separado en cada tarjeta; una reparación lista puede seguir pendiente de ambos. El tablero queda abierto, sin cajas de columna; en pantallas estrechas las columnas se apilan.

Las cuatro tarjetas de indicadores ofrecen «Ver detalles»: distribución de trabajos activos, cobros registrados por mes, saldos de órdenes con precio final y estados de consultas. Los gráficos usan registros reales, explican exclusiones y no inventan tendencias ni ganancias.

En **Nueva reparación**, buscá un cliente por nombre o teléfono y elegilo de la lista. **Agregar cliente** abre un segundo diálogo sin borrar lo que ya completaste; al guardar, selecciona al cliente nuevo automáticamente. Si cancelás o falla la escritura, se conserva la reparación y la selección anterior. La búsqueda y creación de **Clientes e historial** siguen disponibles por separado.

Clientes muestra una línea de tiempo cronológica de reparaciones existentes, no una auditoría de eventos. Consultas destaca nombres y datos; Finanzas agrupa períodos y Repuestos permanece en solo lectura.

## Editar y cobrar un trabajo

1. Abrí **Ver detalle** desde Resumen, Órdenes o el historial de Clientes. En una garantía, podés abrir la orden original: las acciones operan sobre la orden que muestra el detalle.
2. Usá **Editar orden** para corregir datos, costos, precio, reparación o entrega, incluso en trabajos cerrados o entregados. **Guardar cambios** envía solo los campos modificados. Abrir o cancelar no guarda: los campos son blancos y las acciones quedan fijas al pie, Cancelar a la izquierda y Guardar a la derecha.
3. Usá **Registrar cobro**, indicá un importe positivo y la fecha y elegí **Guardar cobro**. El acumulado y el movimiento se guardan juntos; la lista **Cobros registrados** muestra los movimientos disponibles de esa orden.
4. El detalle, los indicadores, Finanzas y el historial se actualizan al guardar. La información persiste al recargar. Si falla el guardado, el formulario conserva el borrador y muestra el error, sin anunciar éxito.

| Regla | Ejemplo |
| --- | --- |
| Sin precio final se permiten señas | Una seña de $1.000 no obliga a fijar precio. |
| Con precio final no se puede superar el saldo | Precio $5.000 y cobrado $1.000: quedan $4.000; se aceptan parciales. |
| El precio corregido no puede quedar por debajo de lo cobrado | Después de cobrar $1.000, no se puede fijar un precio de $800. |
| Cero no significa precio pendiente | Un precio de $0 no habilita un cobro positivo; un precio vacío queda sin definir. |

Reparación, cobro y entrega son independientes: cobrar no termina ni entrega el trabajo; cambiar un estado no inventa una fecha de finalización. Los cobros ya registrados no se editan, borran ni reembolsan. Los vínculos de garantía se conservan y se rechaza cambiar el cliente cuando rompe esa relación.

Los importes acumulados históricos pueden incluir cobros sin un movimiento individual disponible. El historial no reconstruye ni reemplaza ese acumulado. [Contrato del repositorio](src/workshop-contract.md) · [Integración de ficha y formularios](src/components/workshop/integration.md).

## Comprobaciones

`bun test`, `bun run typecheck` y `bun run build` comprueban la aplicación. Las pruebas de propuestas de diseño se ejecutan con `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v`. Las regresiones públicas de Modalidad y apertura/cancelación de ficha, y la comprobación CSS de movimiento reducido, usan un navegador aislado; no son parte de `bun test` ni una nueva dependencia de producción: ver [tests/browser/README.md](tests/browser/README.md).

## Navegación lateral

La navegación real usa una adaptación local de [React Bits LineSidebar TS/CSS](https://reactbits.dev/r/LineSidebar-TS-CSS.json) y siete iconos `lucide-react` 0.468.0 (imports estáticos). El registro no declara dependencias adicionales. Las vistas siguen controladas por la aplicación; los botones conservan sus etiquetas y `aria-current`. La lista agrupa Operación, Administración y Planificación, y adapta su disposición a pantallas estrechas. El efecto de proximidad se limita al puntero fino y se desactiva con movimiento reducido; no mantiene un bucle en reposo.

El código en `src/components/react-bits/` adapta el cálculo de proximidad y suavizado del original: reemplaza elementos clicables por botones, acepta selección controlada e iconos, añade grupos y modifica estilos, movimiento y gestión del ciclo de animación. La licencia completa se conserva en `src/components/react-bits/LICENSE.md`: **MIT + Commons Clause License Condition v1.0**, no MIT simple. Permite uso dentro de una aplicación con aviso conservado y restringe la venta, sublicencia o redistribución de los componentes por sí mismos. Fuente de licencia: [LICENSE.md oficial](https://raw.githubusercontent.com/DavidHDev/react-bits/main/LICENSE.md). Lucide se distribuye bajo licencia ISC. No se agregaron fuentes ni bibliotecas de animación.

## Datos y límites

La semilla `src/seed.json` está vacía (`clients`, `orders`, `expenses`, `leads`, `payments` y `partsPurchases` sin registros) para arrancar desde cero sin datos ficticios. Solo se cuentan pendientes con precio final. El margen de una orden terminada es su precio menos costos de repuestos y mano de obra; no es caja. Los movimientos netos del período son cobros menos gastos generales y compras de repuestos, sin saldo inicial ni otros movimientos no registrados. Los presupuestos no son ganancia final. El símbolo $ no determina moneda ni reglas fiscales.

El repositorio asíncrono `CRMRepository` separa la interfaz de React de la persistencia: en producción usa `SupabaseRepository` (`src/supabase-repository.ts`) detrás de `AuthGate` (`src/components/AuthGate.tsx`) y RLS exclusiva para usuarios autenticados; `JsonRepository` se conserva para pruebas aisladas. Los cobros se registran mediante el RPC transaccional `register_payment` con bloqueo de fila (`FOR UPDATE`). Si falla una escritura, se conserva el formulario y no se anuncia éxito. Los colores personalizados del tablero Kanban se guardan en `localStorage` por navegador.

Consultas y compras de repuestos permanecen en solo lectura desde la interfaz actual. Se pueden registrar nuevos cobros, pero no editar ni borrar los movimientos ya registrados. Las garantías vinculan la orden original sin inventar una duración y el detalle de servicio no tiene validez fiscal.
