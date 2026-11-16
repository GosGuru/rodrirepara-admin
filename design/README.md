# Diseño de Rodrigo Repara

Este directorio centraliza la base actual, las decisiones propuestas y las referencias visuales. Un plan no significa que la aplicación ya lo implemente.

## Empezar por acá

1. [Implementación actual](repair-status-board/implementation.md): Kanban abierto, indicadores, ficha lateral y módulos reales.
2. [Evidencia funcional combinada](../odd/verification/workshop-ui-redesign.md): comprobaciones, intentos históricos y límites de entrada móvil.
3. [Plan visual anterior](visual-plan.md): historia del sidebar, iconos y propuestas tipográficas separadas.
4. [Captura del sistema](system.md) y [muestra](system.html): inventario **anterior al rediseño**, marcado como antiguo respecto de `src/style.css`; no usar sus reglas de layout como estado actual. La resincronización de tokens no se hizo sin aprobación.
5. [Brief funcional](rodrigo-crm/brief.md): pedido original del negocio.

## Referencia elegida

- Dirección aprobada e implementada: [Kanban, indicadores y ficha lateral](repair-status-board/01-colored-columns.html), con [inventario de implementación](repair-status-board/implementation.md).
- Base histórica de la primera aplicación: [Tablero operativo](rodrigo-crm/02-workshop-board.html).
- Alternativas históricas: [Centro de mando](rodrigo-crm/01-service-desk.html) y [Mesa comercial/financiera](rodrigo-crm/03-business-pulse.html).
- El HTML de referencia conserva sus simulaciones en memoria y no modifica el CRM. La aplicación React ya implementa el tablero abierto, movimientos persistidos, gráficos con datos reales y la ficha lateral blanca con acciones fijas. Las reglas de reparación, cobro y entrega siguen independientes.
- La app evolucionó después de esos mockups. No recuperar los textos que el usuario retiró del encabezado, lateral y pie.
- El plan conserva la paleta cálida, el foco operativo y las etiquetas en español.

## Herramientas y estado

El MCP oficial se consulta mediante shadcn 4.23.0 y el registro React Bits, en un paquete aislado de la app. [Configuración y uso](../.pi/tools/react-bits/README.md). Su instalación y funcionamiento aislado fueron verificados; la activación en la sesión necesita `/reload` y la confianza normal del proyecto.

La app usa Lucide selectivamente y el LineSidebar oficial adaptado. El [rediseño actual](../odd/tasks/workshop-ui-redesign.md) aplica jerarquía y estados a las siete vistas y conserva el [pulido anterior](../odd/tasks/crm-view-polish.md). El [flujo del taller](../odd/tasks/workshop-flow.md) agrega edición de los 16 campos, reparación/entrega y registro de señas o parciales dentro del detalle compartido. El historial muestra cobros reales sin reconstruir acumulados previos. La evidencia funcional combina comprobaciones del orquestador y continuaciones independientes: garantías, 16 campos, persistencia, límites, fallos, foco, coordinación real entre pestañas y acciones móviles. El selector nativo de Mover en móvil se eligió con asistencia de teclado; no se afirma una secuencia exclusivamente táctil de ese picker. Los dos ajustes finales fueron del guion de navegación, no del producto. No es una aprobación nativa, estética ni un despliegue. Ver [uso y límites](../README.md#editar-y-cobrar-un-trabajo). La familia sigue siendo la del sistema, aunque cambió la jerarquía de algunas vistas; Poppins, Inter y Manrope siguen propuestas. Phosphor y GSAP no están instalados. Ver [estilos de vistas](../src/views/presentation.css), [operaciones](../src/views/operations.css) y [regresión pública de Modalidad](../tests/browser/README.md).
