# Presentación de módulos

Las vistas mantienen sus datos y callbacks: las señales de reparación, cobro y entrega son independientes y usan `StatusPill`; los estados libres se muestran sin normalizar. Finanzas conserva las fechas y sumas existentes y separa movimientos de margen por orden. Repuestos muestra compras, no inventario. Crecimiento presenta el plan y la decisión pendiente sin afirmar avance ni permisos. `GrowthView` se integra desde App; no cambia la navegación por sí mismo.

La hoja `module-visuals.css` limita sus reglas a clases `mv-`, reutiliza la paleta cálida y mantiene el desplazamiento interno de tablas. La revisión visual y de interacción en navegador queda pendiente.
