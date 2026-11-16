# Operaciones

Órdenes conserva la búsqueda del controlador (cliente, equipo, falla u orden) combinada con Modalidad. La cantidad y los criterios actuales permanecen visibles también sin resultados; «Limpiar filtros» vuelve a búsqueda vacía y «Todas». La tabla conserva sus columnas y se desplaza horizontalmente en pantallas estrechas.

Modalidad es un combobox select-only: Enter o Espacio abre y confirma; flechas, Inicio y Fin mueven la opción activa; Escape cierra sin aplicar y Tab cierra y continúa. El toque selecciona una opción y pulsar fuera cierra. El foco permanece en el control. Las opciones son Todas, Taller y Domicilio. El formulario de reparación conserva su select nativo.

Clientes muestra órdenes por fecha de ingreso descendente, con finalización cuando existe y estados actuales; no representa eventos ni pagos. Cada elemento conserva «Ver detalle» y sus vínculos a la orden original. La ficha lateral compartida no inserta filas ni deforma la tabla; conserva la orden mostrada al filtrar o mover el ancla. «Nuevo cliente» mantiene su acción.

Selectores públicos para pruebas de navegador: buscador por etiqueta `Buscar cliente, equipo, falla u orden`; combobox por nombre `Modalidad` más valor actual; lista `listbox` y opciones por nombre; botones `Limpiar filtros`, `Nuevo cliente`, `Ver detalle`; región `Tabla desplazable horizontalmente`; lista `Historial de <nombre>, más reciente primero`. Verificar teclado, foco, toque y disposición visual en navegador; SSR no los demuestra.
