# Plan visual — Rodrigo Repara

**Recomendación:** conservar la identidad cálida, usar **Inter como primera opción de interfaz**, **Lucide para los iconos** y mejorar la sidebar persistente con agrupación y un indicador activo discreto. No adoptar StaggeredMenu completo como navegación de escritorio.

Estado: **sidebar agrupada, iconos selectivos y mejoras de las seis vistas aplicados**; ver [tarea](../odd/tasks/crm-view-polish.md) y [sistema actual](system.md). La jerarquía de cifras y nombres cambió con la familia del sistema existente. Inter, Poppins y Manrope siguen propuestos, no instalados. No se ha realizado una auditoría formal de contraste o FPS.

## 1. Qué buscamos

- Una interfaz agradable al entrar, pero rápida de reconocer al trabajar todos los días.
- Lectura clara de clientes, fallas, importes y estados; no convertir el CRM en una página promocional.
- Navegación reconocible, con separaciones útiles y movimiento que explique un cambio.
- Conservar oliva, ámbar y blanco cálido. [Base actual](system.md).
- No reintroducir las notas de encabezado, lateral o pie que el usuario pidió quitar.

La base aplicada está en [system.md](system.md); las propuestas tipográficas siguientes siguen pendientes de validación.

## 2. Tipografía: comparación y recomendación

La evaluación de personalidad y densidad es juicio de diseño, no un estudio comparativo medido en este proyecto. No se descargaron ni renderizaron estas familias en la app.

| Dirección | A favor | Costo / cuidado | Decisión propuesta |
| --- | --- | --- | --- |
| **Inter en toda la interfaz** | Consistencia en formularios, navegación y cifras; números tabulares documentados por el proyecto oficial | Puede sentirse más neutra; darle identidad con jerarquía, espaciado y color | **Primera opción**: una sola familia antes de agregar complejidad |
| **Poppins en títulos + Inter en datos** | Mayor personalidad geométrica en marca y títulos breves | Dos familias; comparar ancho de títulos, saltos de línea y carga. No asumir mejor legibilidad en tablas | Alternativa si se busca un carácter más expresivo |
| **Manrope en títulos + Inter en datos** | Alternativa para una presencia más cálida sin tanta redondez visual | Dos familias y más decisiones de mantenimiento | Alternativa secundaria, no instalar junto con las otras |

**Sobre Poppins:** no la descartaría. La probaría en marca y títulos cortos, con peso moderado, antes que en cada celda y control. Usar muchos tamaños o pesos no mejora por sí solo la jerarquía.

### Escala propuesta

Valores de partida a comparar en escritorio, móvil y zoom al 200 %. No se aplicaron todavía.

| Rol | Tamaño / interlineado | Peso propuesto |
| --- | --- | --- |
| Marca | 20 / 24 px | 700 |
| Título de página | 30 / 36 px; móvil 26 / 32 px | 650 o 700, según archivo de fuente |
| Título de sección | 20 / 28 px | 600 |
| Título de tarjeta | 16 / 24 px | 600 |
| Cifra KPI | 32 / 36 px; móvil 28 / 32 px | 650 o 700 |
| Texto principal y formularios | 16 / 24 px | 400 |
| Navegación y botones | 15 / 20 px | 500; activo 600 |
| Datos de tabla y metadatos útiles | 14 / 20 px | 400 o 500 |
| Etiquetas de grupo y estado | 12 / 16 px | 600, sin abusar de mayúsculas |

- Cifras financieras alineadas por columna y con `font-variant-numeric: tabular-nums` cuando el archivo elegido lo soporte.
- Definir explícitamente tamaño base, pesos e interlineados; hoy varios dependen del navegador.
- No reducir información esencial por debajo de 14 px como estrategia para hacer entrar todo.
- Revisar `María`, `Diagnóstico`, `¿Qué falla presenta?`, `$ 8.500`, `$ 125.000`, nombres largos y estados de varias palabras.

### Entrega de fuentes, si se aprueba

Alojar los WOFF2 usados en el propio proyecto, preservar la licencia, incluir caracteres españoles y usar fallback del sistema con `font-display: swap`. Empezar por una familia y solo los estilos necesarios. No agregar un CDN ni afirmar un ahorro de KB sin medir los archivos reales.

## 3. Iconografía: coherencia antes que cantidad

**Lucide** es la primera opción propuesta: SVG de trazo limpio, imports explícitos y una apariencia compatible con las superficies sobrias del tablero. **Phosphor** es una alternativa si se decide que los pesos o duotonos aportan identidad; no mezclar ambas bibliotecas en el mismo menú.

| Lugar | Icono Lucide propuesto |
| --- | --- |
| Resumen | LayoutDashboard |
| Consultas | MessagesSquare |
| Clientes e historial | UsersRound |
| Órdenes de trabajo | Wrench |
| Finanzas | Wallet |
| Repuestos | Package |
| Crecimiento | TrendingUp |
| Nueva reparación / nuevo cliente / gasto | Plus / UserPlus / Receipt |
| Cerrar / avanzar | X / ArrowRight |

Los siete iconos de navegación y una selección de iconos en acciones y vistas se aplicaron con `lucide-react` 0.468.0. Las etiquetas siguen visibles.

Reglas propuestas:
- Un tamaño de navegación de 20 px, trazo coherente y caja fija; 16–18 px para acciones secundarias si corresponde.
- Icono + etiqueta visible, no navegación de solo iconos como valor por defecto.
- `aria-hidden` para iconos decorativos junto al texto; nombre accesible en controles sin texto.
- Estados siempre con palabra visible; no depender únicamente del color, la forma o un icono.
- Imports por icono, sin cargar un catálogo dinámico completo.
- Comprobar licencia y conservar avisos de la versión elegida.

## 4. React Bits: qué quedó verificado

### StaggeredMenu TS/CSS

Fuente oficial obtenida a través del registro y auditada independientemente:

- ID: `@react-bits/StaggeredMenu-TS-CSS`.
- URL: [reactbits.dev/r/StaggeredMenu-TS-CSS.json](https://reactbits.dev/r/StaggeredMenu-TS-CSS.json).
- Dependencia declarada: `gsap@^3.13.0`.
- TSX importa React, GSAP y su CSS. Inspeccionarlo **no instaló GSAP en el CRM**.
- Es un panel superpuesto con capas y entrada escalonada, no una sidebar persistente.
- El CSS capturado usa items de 4rem en mayúsculas, blur de 12 px y colores predeterminados ajenos a nuestra paleta.
- El código usa transformaciones, pero sus tiempos de apertura/revelado (0.65 s y hasta 1 s en etiquetas) son excesivos como punto de partida para tareas frecuentes.
- Hay botón con `aria-expanded`/`aria-controls` y panel con `aria-hidden`. En el código inspeccionado no se encontró manejo de Escape, foco modal/devolución ni ruta activa equivalente a `aria-current`.
- En los dos archivos inspeccionados no se encontró un tratamiento de movimiento reducido. Es una observación de esa versión, no una auditoría completa de accesibilidad.

Evidencia local: `.cache/react-bits-mcp/11-correction-official-response.json` (contenido de StaggeredMenu.tsx/CSS serializado); `12-correction-source-summary.json`. La caché es evidencia de trabajo, no una dependencia del sitio.

### Qué NO afirmar

PillNav y GooeyNav se identificaron como candidatos de investigación en la documentación, pero **sus fuentes no fueron recuperadas ni auditadas**. No hay base para inventar sus dependencias, rendimiento o accesibilidad. No se recomienda instalarlos hasta revisar su variante exacta.

MCP instalado y operación aislada verificados no equivale a herramientas activas en esta sesión: falta el `/reload` normal de Pi y comprobar `/mcp`.

## 5. Sidebar recomendada

### Escritorio: persistente y compacta

Aplicado: se adaptó el componente oficial LineSidebar TS/CSS, no StaggeredMenu. Conserva proximidad y suavizado con desplazamiento discreto; usa botones controlados, iconos y grupos.

Propuesta de agrupación, conservando todas las vistas actuales:

- **Operación:** Resumen, Consultas, Clientes e historial, Órdenes de trabajo.
- **Administración:** Finanzas, Repuestos.
- **Planificación:** Crecimiento, sin presentar funciones futuras como permisos activos.

Proporciones propuestas:
- Ancho aplicado 248 px en escritorio.
- Fila mínima de 44 px, preferencia 48 px; icono de 20 px y separación de 10–12 px al texto.
- 4–8 px entre elementos y 24 px entre grupos, antes que una línea divisoria entre cada fila.
- Fondo oliva actual; activo sobre una superficie más clara de la misma familia, sin neón ni morados.
- Mantener `aria-current`, texto activo algo más pesado y foco visible distinto del estado activo.
- Indicador lateral o superficie de selección: elegir uno dominante, sin acumular adornos.

### Efecto propuesto

Transición breve de fondo/opacity/transform en el elemento activo, aproximadamente 150–180 ms como hipótesis inicial. Sin animación continua, partículas, blur o movimiento del contenido. No animar ancho/alto del layout. Con `prefers-reduced-motion`, eliminar el desplazamiento y cambiar el estado inmediatamente.

**No se agregó GSAP.** El build real para esta adaptación pasó de CSS 4,19 kB (gzip 1,52) a 5,51 kB (gzip 1,85), y de JS 240,50 kB (gzip 74,95) a 245,48 kB (gzip 76,87). Estas cifras no son una medición de rendimiento en navegador.

### Móvil

La sidebar actual es persistente y se apila arriba en móvil; no es un drawer. El siguiente estudio de drawer es histórico y no forma parte de la implementación actual.

Si se adapta su código:
1. Sustituir paleta, tamaños enormes y mayúsculas por tokens del CRM.
2. Mantener la sección activa y las mismas etiquetas.
3. Implementar Escape, foco inicial/trampa/devolución y contenido cerrado no tabulable; `aria-hidden` solo no alcanza.
4. Ofrecer movimiento reducido y comprobar clic fuera, scroll y teclado.
5. Quitar capas y blur si no aportan orientación.
6. Medir antes de admitir la dependencia GSAP y no sacrificar claridad por el efecto.

## 6. Plan de ejecución propuesto

Sidebar, iconos selectivos y mejoras solicitadas de las vistas están aplicados. La comparación de familias y la centralización propuesta de tokens siguen pendientes.

| Fase | Entrega | Superficies previstas |
| --- | --- | --- |
| 1 · Comparación | Comparación de Inter sola frente a Poppins+Inter con texto real, desktop/móvil | Artboard o comparación visual separada; no reemplazar el diseño elegido |
| 2 · Tokens | Roles de tipo, espacio, color y movimiento centralizados, con fuente local y fallback | Evolución de src/style.css; posible archivo de tokens, aún no creado |
| 3 · Iconos | Biblioteca única, mapa semántico y tamaños/trazos consistentes | Componentes de navegación/acciones; imports explícitos |
| 4 · Navegación | Sidebar agrupada y selección discreta; drawer móvil si aporta valor | Componente de navegación reutilizable; no copiar HTML del artboard |
| 5 · Comprobación | Funcionalidad preservada, accesibilidad, capturas y medición de costo | Pruebas y evidencia antes/después sobre datos ficticios |

No agregar Tailwind, un router, un framework de animación o una segunda biblioteca de iconos solo para ejecutar este plan si la estructura actual resuelve el problema.

## 7. Criterios para aprobar la implementación futura

- Todas las vistas y quick actions siguen funcionando; no se modifica el repositorio JSON ni la arquitectura Supabase.
- Texto de datos reales o representativos, incluyendo importes largos, acentos y estados múltiples.
- Navegación, foco y diálogos utilizables con teclado; retorno de foco al cerrar móvil.
- Reflujo a 390 px y zoom al 200 %, sin recortar navegación o controles esenciales.
- Contraste medido en los pares reales según WCAG AA; este plan no declara certificación.
- Fuente y SVG cargan solo lo necesario; registrar el cambio real de build/carga, no cifras inventadas.
- Ninguna animación en reposo, sin salto de layout por el indicador y con movimiento reducido respetado.
- Capturas desktop/móvil comparables y revisión visual; las capturas actuales requieren inspección. La evidencia funcional y sus límites están en la [tarea](../odd/tasks/crm-view-polish.md).

## 8. Fuentes y límites

- [Inter, proyecto oficial](https://rsms.me/inter/) y [repositorio](https://github.com/rsms/inter): funciones tipográficas/licencia a comprobar en el archivo que se distribuya.
- [Poppins](https://fonts.google.com/specimen/Poppins) y [Manrope](https://fonts.google.com/specimen/Manrope): alternativas, no archivos instalados ni comparación renderizada en este proyecto.
- [Lucide React](https://lucide.dev/guide/packages/lucide-react): aplicado selectivamente en sidebar y vistas; [Phosphor](https://phosphoricons.com/) sigue como alternativa, sin benchmarks comparativos.
- [React Bits MCP](https://reactbits.dev/get-started/mcp), [shadcn MCP](https://ui.shadcn.com/docs/mcp) y registro oficial citado arriba.
- Fuente local actual: [system.md](system.md). Sidebar, iconos y mejoras de vistas aplicados; fuentes alternativas y otras propuestas pendientes.
