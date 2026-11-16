# Resumen: tablero e indicadores

El tablero presenta todas las órdenes no cerradas, agrupando únicamente estados exactos. Los estados personalizados permanecen en Otros estados. Arrastrar el asa o usar Mover abre la selección explícita del estado de destino; cancelar y mover dentro de la misma columna no escriben. Sin callbacks, los controles son de solo lectura. La operación espera `updateOrder(id, { repair })`; la actualización de datos corresponde al adaptador raíz existente. No se persiste el orden visual ni se cambian entrega, cobros o fechas.

Los indicadores usan los totales recibidos y gráficos calculados desde los datos actuales: estados activos, pagos por mes (con fechas históricas no válidas agrupadas aparte), saldos de todas las órdenes con precio y estados reales de consultas. Los precios nulos se excluyen y se informan; cero es distinto de ausente. Los gráficos no modifican datos.

La interacción real, foco, arrastre, errores y concurrencia requieren verificación de navegador integrada por el controlador de la tarea.
