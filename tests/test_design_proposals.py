"""Structural and interaction checks for the self-contained design proposals.

Run: python3 -m unittest discover -s tests -v
These checks do not replace a browser visual review.
"""
import json
from html.parser import HTMLParser
from pathlib import Path
import re
import subprocess
import unittest

ROOT = Path(__file__).resolve().parents[1] / "design" / "rodrigo-crm"


class Page(HTMLParser):
    def __init__(self, html):
        super().__init__()
        self.ids = []
        self.links = []
        self.resources = []
        self.lang = None
        self.feed(html)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "html":
            self.lang = attrs.get("lang")
        if "id" in attrs:
            self.ids.append(attrs["id"])
        if tag == "a":
            self.links.append(attrs.get("href", ""))
        if "src" in attrs:
            self.resources.append(attrs["src"])
        if tag == "link":
            self.resources.append(attrs.get("href", ""))


class DesignTests(unittest.TestCase):
    def test_existing_scripts_start_without_dom_errors(self):
        for path in sorted(ROOT.glob("*.html")):
            with self.subTest(board=path.name):
                html = path.read_text()
                scripts = re.findall(r"<script>(.*?)</script>", html, re.S)
                self.assertEqual(len(scripts), 1)
                run = subprocess.run(["node"], input=JS_HARNESS + scripts[0],
                                     text=True, capture_output=True)
                self.assertEqual(run.returncode, 0, run.stderr)

    def test_spanish_business_brief_and_interactions(self):
        manifest = json.loads((ROOT / "design.json").read_text())
        self.assertEqual(len(manifest["artboards"]), 3)
        for board in manifest["artboards"]:
            with self.subTest(board=board["file"]):
                html = (ROOT / board["file"]).read_text()
                page = Page(html)
                self.assertEqual(page.lang, "es-AR")
                self.assertFalse("Rodrigo Ropara" in html, "Obsolete brand Rodrigo Ropara")
                self.assertTrue("Rodrigo Repara" in html, "Missing brand Rodrigo Repara")
                self.assertEqual(len(page.ids), len(set(page.ids)))
                self.assertFalse(page.resources)
                for anchor in page.links:
                    self.assertTrue(anchor.startswith("#"))
                    self.assertIn(anchor[1:], page.ids)
                for text in ["Cobrado hoy", "$ 8.500", "Trabajos activos",
                             "Por cobrar", "$ 4.000", "Consultas nuevas",
                             "Atención para hoy", "Accesos rápidos",
                             "Nueva reparación", "Nuevo cliente", "Registrar gasto",
                             "Ver trabajos", "EJEMPLO ILUSTRATIVO · DATOS FICTICIOS",
                             "Garantía", "Consulta recibida", "Visita o recepción",
                             "Diagnóstico", "Presupuesto enviado", "Esperando aprobación",
                             "Esperando repuestos", "En reparación", "Terminado",
                             "Entregado", "Cerrado", "Sin validez fiscal"]:
                    self.assertTrue(text in html, f"Missing brief text: {text}")
                for text in ["Lavarropas Samsung", "Esperando repuesto", "Cliente: Juan · Hace 2 días",
                             "Lavarropas James", "Presupuesto pendiente", "Cliente: María · Hace 1 día",
                             "Lavarropas Enxuta", "Listo para entregar", "Cliente: Pedro · Hoy",
                             "Pendiente de respuesta", "Aceptada", "Perdida", "Conversión demo",
                             "Precio de compra", "Precio de venta", "Proveedor", "Fecha de compra",
                             "Cantidad disponible", "Caja disponible", "Pagos pendientes", "Ganancia",
                             "Semana", "Mes", "Combustible", "Transporte", "Herramientas",
                             "Publicidad", "Sueldos", "Compras generales", "1 · Control",
                             "2 · Organización", "3 · Expansión", "Decisión A/B/C pendiente",
                             "Sin integración automática de WhatsApp", "no se guardan datos"]:
                    self.assertTrue(text in html, f"Missing brief text: {text}")
                for pane in ["resumen", "consultas", "clientes", "ordenes", "finanzas", "repuestos", "crecimiento"]:
                    self.assertIn(pane, page.ids)
                scripts = re.findall(r"<script>(.*?)</script>", html, re.S)
                self.assertEqual(len(scripts), 1)
                check = subprocess.run(["node", "--check"], input=scripts[0], text=True, capture_output=True)
                self.assertEqual(check.returncode, 0, check.stderr)
                run = subprocess.run(["node"], input=JS_HARNESS + scripts[0] + JS_CHECKS, text=True, capture_output=True)
                self.assertEqual(run.returncode, 0, run.stdout + run.stderr)


JS_HARNESS = r'''
const assert = require('node:assert/strict');
const nodes = {}, handlers = {};
function node(id) {
  return nodes[id] ||= {id, value: '', textContent: '', innerHTML: '', hidden: false,
    dataset: {}, handlers: {}, addEventListener(type, fn){this.handlers[type] = fn},
    setAttribute(){}, focus(){document.activeElement = this},
    showModal(){this.open = true}, close(){this.open = false; this.handlers.close?.()},
    classList: {toggle(){},add(){},remove(){}}};
}
global.document = {getElementById: node, querySelectorAll: () => [], activeElement: null,
  querySelector: () => null, addEventListener(type, fn){handlers[type] = fn}};
global.window = {addEventListener(){}, location: {hash: ''}};
'''
JS_CHECKS = r'''
assert.equal(orders.length, 8);
assert.equal(orders.filter(o => o.repairState !== 'Cerrado').length, 7);
assert.equal(leads.filter(l => l.state === 'Nueva').length, 5);
assert.ok(orders.some(o => o.repairState === 'Terminado' && o.paid < o.price));
assert.ok(orders.some(o => o.paid === o.price && o.delivery === 'Pendiente'));
node('order-search').value = 'Samsung';
node('order-mode').value = 'Todas';
assert.ok(filteredOrders().length > 0);
assert.ok(filteredOrders().every(o => o.equipment.includes('Samsung')));
node('order-search').value = '';
node('order-mode').value = 'Domicilio';
assert.ok(filteredOrders().length > 0);
assert.ok(filteredOrders().every(o => o.mode === 'Domicilio'));
node('order-mode').value = 'Taller';
assert.ok(filteredOrders().every(o => o.mode === 'Taller'));
node('order-search').value = 'no-existe';
assert.equal(filteredOrders().length, 0);
renderOrders();
assert.ok(node('order-rows').innerHTML.includes('No hay trabajos'));
node('order-search').value = '';
node('order-mode').value = 'Todas';
assert.equal(filteredOrders().length, 8);
assert.equal(money(8500), '$ 8.500');
showOrder('RR-1047');
assert.ok(node('dialog-content').innerHTML.includes('Sin fotografías adjuntas'));
assert.ok(node('dialog-content').innerHTML.includes('Reparación'));
assert.ok(node('dialog-content').innerHTML.includes('Cobro'));
assert.ok(node('dialog-content').innerHTML.includes('Entrega'));
showQuick('gasto');
assert.ok(node('dialog-content').innerHTML.includes('Combustible'));
assert.ok(node('dialog-content').innerHTML.includes('no se guardan'));
assert.ok(node('dialog').open);
node('dialog').close();
for (const kind of ['reparacion', 'cliente', 'gasto']) {
  const trigger = {focus(){document.activeElement = this}};
  document.activeElement = trigger;
  handlers.click({target:{closest(selector){return selector === '[data-quick]' ? {dataset:{quick:kind}} : null}}});
  assert.ok(node('dialog').open);
  assert.ok(node('dialog-content').innerHTML.includes('no se guardan datos'));
  assert.equal(document.activeElement, node('dialog-close'));
  node('dialog').close();
  assert.equal(document.activeElement, trigger);
}
for (const order of orders) {
  handlers.click({target:{closest(selector){return selector === '[data-order]' ? {dataset:{order:order.id}} : null}}});
  for (const label of ['Dirección', 'Diagnóstico', 'Repuestos utilizados', 'Costo de mano de obra', 'Presupuesto presentado', 'Precio final', 'Reparación', 'Cobro', 'Entrega', 'Ingreso', 'Finalización', 'Responsable', 'Garantía', 'Sin fotografías adjuntas'])
    assert.ok(node('dialog-content').innerHTML.includes(label), label);
  node('dialog').close();
}
showOrder('RR-1049');
assert.ok(node('dialog-content').innerHTML.includes('data-order="RR-1030"'));
handlers.click({target:{closest(selector){return selector === '[data-order]' ? {dataset:{order:'RR-1030'}} : null}}});
assert.ok(node('dialog-title').textContent.includes('RR-1030'));
node('dialog').close();
node('order-search').value = 'Pedro';
node('order-search').handlers.input();
assert.equal(node('result-count').textContent, '2 órdenes de ejemplo');
node('order-search').value = '';
node('order-mode').value = 'Taller';
node('order-mode').handlers.change();
assert.equal(node('result-count').textContent, orders.filter(o => o.mode === 'Taller').length + ' órdenes de ejemplo');
console.log('Search, modes, counts, details, previews, dispatch and dialog focus: PASS');
'''


if __name__ == "__main__":
    unittest.main()
