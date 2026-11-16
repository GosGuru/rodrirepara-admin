# Rodrigo Repara · rediseño implementado

La dirección aprobada de [Kanban y ficha lateral](01-colored-columns.html) ya está aplicada al CRM React. El HTML sigue siendo una maqueta autocontenida con datos en memoria; **no es la aplicación ni modifica sus registros**.

## Verlo en la aplicación

Abrí el preview de desarrollo: `http://127.0.0.1:5173/`.

- **Resumen:** tablero abierto de trabajos activos, tarjetas con equipo/cliente prioritarios y cuatro indicadores con «Ver detalles» y gráficos reales.
- **Ver detalle:** ficha lateral animada, trabajo/importes/cobros agrupados, estados independientes y acceso a la original de una garantía.
- **Editar / cobrar:** controles blancos y acciones fijas al pie; Cancelar a la izquierda, Guardar a la derecha. Abrir o cancelar no guarda.
- **Otras vistas:** Consultas, Clientes, Órdenes, Finanzas, Repuestos y Crecimiento conservan funciones y reciben jerarquía y señales contextuales. El sidebar React Bits y sus siete iconos se mantienen.

## Mapa de implementación

| Área | Código real |
| --- | --- |
| Integración y título de cada vista | `src/App.tsx`, `src/Header.tsx` |
| Kanban, agrupación y movimientos | `src/views/OverviewView.tsx`, `src/views/repair-board.ts`, `src/views/overview-board.css` |
| Gráficos de registros reales | `src/views/overview-board/charts.ts` |
| Ficha retenida y cierre/foco | `src/components/OrderSheetProvider.tsx`, `src/components/SideSheet.tsx`, `src/components/OrderDetail.tsx` |
| Estados semánticos | `src/components/StatusPill.tsx` |
| Editor y cobros | `src/components/workshop/OrderEditor.tsx`, `src/components/workshop/PaymentForm.tsx` |
| Resto de módulos | `src/views/*View.tsx`, `src/views/module-visuals.css` |

Las rutas de la tabla son relativas a la raíz del proyecto. El [contrato de integración](../../src/components/workshop/integration.md) describe los callbacks y el retorno de foco después del cierre nativo.

## Comportamiento conservado

Mover una tarjeta guarda únicamente su reparación, con el estado exacto visible. Pendientes exige elegir entre sus tres estados existentes; cancelar o mover dentro de la misma columna no escribe. No se inventan fechas, cobros, entregas ni posiciones persistidas. Cerrado continúa accesible en Órdenes e historial.

La ficha conserva el ID mostrado aunque desaparezca su tarjeta de origen. Una corrección guarda solo los campos cambiados; los cobros reales son inmutables y no reconstruyen acumulados históricos. Se mantienen señas, parciales, límites de saldo y compatibilidad de garantías. No hay migraciones, reinicio de datos ni conexión Supabase.

La corrección final de foco usa el evento nativo `close`: restaura un origen válido o vuelve al aviso/título visible si ese origen desapareció. No cambió reglas de datos ni de cobro.

## Evidencia y límites

[Evidencia funcional combinada](../../odd/verification/workshop-ui-redesign.md) · [tarea y registro completo](../../odd/tasks/workshop-ui-redesign.md).

El cierre combina las comprobaciones del orquestador y las continuaciones independientes; no convierte el último informe acotado en una aprobación global de cada requisito. La selección del picker nativo de Mover móvil tuvo asistencia de teclado; los pasos de apertura, elección del estado y confirmación incluyeron toques nativos medidos. No se afirma que todo el picker del sistema operativo se haya recorrido solo con toque.

Se conservaron los fallos de preparación/navegación y los dos ajustes autorizados del guion. No se publicaron cambios ni se usaron perfiles reales del navegador.

## Captura del sistema visual

`design/system.md` y `design/system.html` son capturas anteriores y permanecen marcadas como antiguas respecto de `src/style.css`. No se regeneraron tokens ni artboards sin aprobación. Este inventario documenta la implementación actual sin presentar esas capturas como vigentes. No se agregaron fuentes ni bibliotecas.
