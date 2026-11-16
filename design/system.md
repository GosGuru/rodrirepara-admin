# Sistema visual actual — Rodrigo Repara

Inventario de lo que existe hoy, no una propuesta de rediseño. Fuentes: `src/style.css`, `src/components/react-bits/LineSidebar.css`, `src/views/operations.css`, `src/views/presentation.css` y `src/components/order-detail.css`, más `src/components/workshop/order-editor.css` y `src/components/workshop/payment-form.css`.
Las propuestas futuras están separadas en [visual-plan.md](visual-plan.md). La implementación seleccionada procede de `rodrigo-crm/02-workshop-board.html`; las otras dos direcciones son alternativas históricas.

## Colores

Los cuatro primeros nombres son custom properties globales existentes. Los demás son nombres documentales para valores literales de la hoja. El tablero usa además las propiedades locales `--repair-signal` y `--repair-surface`, sin introducir una paleta global nueva.

| Nombre actual o rol documental | Valor | Uso y fuente |
| --- | --- | --- |
| `--line` | `#d9ded5` | Bordes de panel, tabla y tarjetas; `src/style.css` |
| `--olive` | `#333c32` | Navegación lateral; `src/style.css` |
| `--accent` | `#795018` | Acción principal y enlaces; `src/style.css` |
| `--soft` | `#f5e9d4` | Badges y avisos; `src/style.css` |
| Texto principal | `#252e29` | Raíz y diálogo; `src/style.css` |
| Fondo cálido | `#f5f1e9` | Raíz y tarjetas de trabajo; `src/style.css` |
| Superficie | `#ffffff` | Panel, botón, input y diálogo; `src/style.css` |
| Texto secundario | `#4c5b52` | Párrafos, metadatos y encabezados de tabla; `src/style.css` |
| Texto de navegación | `#f1f5ee` | Botones del menú; `src/style.css` |
| Fondo activo / hover | `#5a6045` / `#465342` | Navegación; `LineSidebar.css` |
| Indicador / foco lateral | `#e6b969` / `#f5d28c` | Activo y foco visible diferenciados; `LineSidebar.css` |
| Submarca | `#e0e9db` | Marca en sidebar; `src/style.css` |
| Foco visible | `#a65c00` | Outline de 3 px y separación de 3 px; `src/style.css` |
| Borde de botón | `#abb9ac` | Controles de acción; `src/style.css` |
| Borde de campo | `#9baea2` | Input/select; `src/style.css` |
| Etiqueta de campo | `#35483e` | Label; `src/style.css` |
| Texto de badge | `#62400f` | Badge cálido; `src/style.css` |
| Error | `#8b1f16` | Mensajes de error; `src/style.css` |
| Backdrop | `#17261dc2` | Fondo de diálogo; `src/style.css` |

## Tipografía

Familia actual: `system-ui, -apple-system, sans-serif`. No hay fuente descargada, `@font-face` ni Poppins. La sidebar usa iconos Lucide.
`font-synthesis: none`, interlineado heredado 1.5. No se declara tamaño base: lo establece el navegador. Fuente: `src/style.css :root`.

| Rol | Tamaño/interlineado actual | Peso explícito y detalles |
| --- | --- | --- |
| Marca | 20 px / 1.15 | 800 |
| Submarca | 11 px / heredado | 500; tracking .13em |
| Título principal | clamp(26px, 3vw, 38px) / 1.12 | Peso no declarado; tracking -.03em |
| Título de sección | 20 px / 1.2 | Peso no declarado |
| Título de tarjeta | Base 16 px / heredado | Consultas: nombre 20 px / 1.2 (`src/views/presentation.css`) |
| Cifra KPI | Base 28 px / 1.2; móvil 23 px | Strong; Resumen destaca trabajos activos con superficie oliva y primer ancho 1.35fr (`src/views/presentation.css`) |
| Etiqueta KPI | 13 px / heredado | Sin peso explícito |
| Metadatos y tablas | Tabla 13 px; small relativo al navegador | Sin escala de small explícita |
| Encabezado de tabla | 12 px / heredado | Peso no declarado |
| Badge | 12 px / heredado | 700 |
| Etiqueta de formulario | 14 px / heredado | Sin peso explícito |

Los valores base proceden de `src/style.css`; las excepciones indican su fuente. Son roles observados, no nuevas variables tipográficas.

## Espaciado, superficies y adaptación

- Sidebar: 248 px; padding 28 px 20 px. Menú con gap 4 px, margen superior 30 px e iconos de 20 px.
- Contenido: padding 32 px y lateral clamp(20px, 3vw, 48px); ancho máximo 1600 px.
- Panel: padding 22 px, margen 24 px 0 16 px. KPI: padding 18 px y gap 12 px.
- Cola de trabajo: tres columnas, gap 10 px; tarjeta con padding 15 px.
- Acciones: cuatro columnas, gap 8 px.
- Botón: mínimo 44 px, padding 9 px 14 px. Campo: mínimo 44 px, padding 9 px 11 px.
- Radios: badge 5 px; campo 7 px; botón/tarjeta 8 px; panel/KPI 12 px; diálogo 14 px.
- Sombras: la base no declara sombras; el desplegable de Modalidad usa `0 6px 16px #252e2926` (`src/views/operations.css`) y la sidebar un indicador inset (`LineSidebar.css`).
- Hasta 900 px: sidebar pasa arriba; su lista LineSidebar permanece apilada y visible, sin drawer; padding lateral 18 px. La hoja global contiene reglas de grilla para navegación, pero la lista efectiva se conserva apilada por el componente.
- Hasta 600 px: KPI en dos columnas, cola/acciones en una, panel con padding 17 px.

Valores base de `src/style.css`; las vistas aplican excepciones específicas abajo. La navegación móvil se apila y permanece visible, no es un drawer.

## Componentes y reglas actuales

- LineSidebar de React Bits adaptado: botones con texto, `aria-current`, siete iconos Lucide decorativos y grupos en español. Proximidad para puntero fino; movimiento reducido desactiva desplazamiento.
- Acciones y estados conservan etiquetas visibles. Flecha Unicode para avanzar y cierre con etiqueta accesible.
- El componente `src/Header.tsx` renderiza solo título y subtítulo.
- Las notas de encabezado, lateral y pie retiradas por el usuario no deben reaparecer por reutilizar un artboard antiguo.
- Los selectores residuales de esas notas en CSS no significan que los bloques sigan renderizados.
- La limitación de JSON local sigue documentada en `README.md`; esta captura no cambia almacenamiento ni permisos.

## Vistas y excepciones aplicadas

- `src/views/presentation.css`: Resumen usa cuatro columnas `1.35fr repeat(3, minmax(0, 1fr))`, iconos de 18 px y tarjeta primaria oliva; a 900 px dos columnas y a 600 px la primaria ocupa la fila. Acciones conservan etiquetas. Consultas usa tarjetas de padding 18 px, separación 12 px y nombres de 20 px; sus datos pasan a una columna a 600 px. Finanzas agrupa tres períodos con gap 10 px y padding 16 px; a 900 px pasan a una columna. Repuestos mantiene tabla de solo lectura.
- `src/views/operations.css` y `src/views/ModeFilter.tsx`: búsqueda con icono y padding izquierdo 38 px, reset con icono, selector Modalidad de mínimo 160 px y opciones de mínimo 44 px. El desplegable tiene borde `#9baea2`, radio 8 px y opción activa `#f5e9d4`; abre por teclado, ratón o tacto y devuelve foco al elegir. A 600 px búsqueda y selector ocupan la fila. El select del formulario de reparación sigue nativo.
- `src/views/operations.css`: timeline de órdenes existentes con línea `#d9ded5`, marcadores `#795018` y texto de 13 px; no representa eventos inventados.
- `src/components/order-detail.css`: detalle inline con padding `1rem`, borde `#d8d2c6`, radio `.5rem`, encabezado flexible y cuadrícula adaptable de campos; la fila de tabla ocupa el ancho completo. Crear reparación, cliente o gasto permanece en diálogo.
- `src/components/workshop/OrderEditor.tsx` y `PaymentForm.tsx`: formularios inline dentro del detalle, no diálogos nuevos. Las acciones **Editar orden** y **Registrar cobro** incorporan iconos Lucide decorativos y etiquetas visibles; no se agregan familias tipográficas ni dependencias.
- El editor expone los 16 campos editables y guarda solo los cambios. El cobro presenta acumulado, precio/saldo e importe con fecha; distingue precio pendiente de cero. Los movimientos reales se muestran por separado del acumulado histórico. No hay controles para editar, borrar o devolver movimientos.
- Los formularios conservan borradores y errores al fallar. Durante un guardado se bloquean cancelar y cerrar; la navegación a una original no cambia el destino de un formulario activo. Al terminar se recupera foco en una acción habilitada o en el aviso de éxito si desaparece la fila.
- La edición de órdenes cerradas/entregadas y el pago de la original de una garantía están implementados. Reparación, pago y entrega conservan estados independientes. Ver [guía de uso](../README.md#editar-y-cobrar-un-trabajo) y [contrato de integración](../src/components/workshop/integration.md).
- El foco general usa outline de 3 px `#a65c00` con offset 3 px; la sidebar usa `#f5d28c` con offset 2 px. Sin auditoría formal de contraste.

## Tablero por estado de reparación

`src/views/OverviewView.tsx` y `repair-board.ts` agrupan todos los activos, sin el límite anterior de tres tarjetas. Pendientes incluye las dos esperas y Visita o recepción; En proceso acepta En reparación/En proceso; Listos acepta Terminado. Otros estados aparece solo si hay etiquetas activas sin clasificación exacta. Cerrado sigue fuera de este tablero, accesible desde las vistas existentes. La etiqueta original nunca se reemplaza ni se infiere el grupo por cobro o entrega.

`src/views/presentation.css` aplica borde superior de 4 px y encabezado con texto/conteo: ámbar `--accent` sobre `--soft` para Pendientes; neutro `#4c5b52` sobre `#f5f1e9` para En proceso; oliva `--olive` para Listos. El estado Terminado usa oliva y texto `#f1f5ee`. Cobro y entrega conservan sus propias etiquetas. Al abrir un detalle, su columna ocupa todo el ancho del tablero para no comprimir los formularios; las demás conservan su orden de lectura. Al cerrar, vuelven las tres columnas. A 1200 px o menos el tablero se apila. Los detalles/formularios siguen inline, con campos y botones que pueden envolver. No hay arrastrar y soltar.

[Nueva iteración de diseño](repair-status-board/01-colored-columns.html): tablero abierto y ficha lateral animada, con edición blanca y acciones en un pie fijo. Es una maqueta interactiva, todavía no aplicada a React; los movimientos y cambios solo existen en memoria de esa página. El inventario anterior describe la aplicación actual. La sidebar de la muestra es una referencia, no reemplaza el componente React Bits de producción.

## Lectura visual

[system.html](system.html) representa esta base con fuentes del sistema y sin recursos externos.
Las fuentes alternativas y demás propuestas no aplicadas permanecen fuera de este inventario.
