import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { GrowthView } from "./GrowthView";

test("plan y decisión pendiente conservan el alcance original", () => {
  const html = renderToStaticMarkup(<GrowthView />);
  for (const text of ["1 · Control", "2 · Organización", "3 · Expansión", "Decisión A/B/C pendiente", "no hay permisos activos", "Sin facturación fiscal", "gestión avanzada de empleados"]) expect(html).toContain(text);
  expect(html).not.toContain("%");
});
