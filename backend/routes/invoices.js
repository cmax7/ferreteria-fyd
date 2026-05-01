const router = require('express').Router();
const db = require('../db');
const { authMiddleware, employeeOnly } = require('../middleware/auth');

router.use(authMiddleware, employeeOnly);

// Listar facturas
router.get('/', (req, res) => {
  const { type, search, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let where = 'WHERE 1=1';
  const params = [];
  if (type) { where += ' AND type = ?'; params.push(type); }
  if (search) {
    where += ' AND (invoice_number LIKE ? OR customer_name LIKE ? OR supplier_name LIKE ?)';
    const s = `%${search}%`;
    params.push(s, s, s);
  }
  const total = db.prepare(`SELECT COUNT(*) as count FROM invoices ${where}`).get(...params).count;
  const invoices = db.prepare(`SELECT * FROM invoices ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, Number(limit), Number(offset));
  res.json({ invoices, total, pages: Math.ceil(total / limit) });
});

// Obtener factura con items
router.get('/:id', (req, res) => {
  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(req.params.id);
  if (!invoice) return res.status(404).json({ error: 'Factura no encontrada' });
  const items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(req.params.id);
  res.json({ ...invoice, items });
});

// Crear factura
router.post('/', (req, res) => {
  const { type, invoice_number, date, customer_name, customer_rut, supplier_name, notes, items } = req.body;
  if (!type || !date || !items?.length) return res.status(400).json({ error: 'Tipo, fecha e ítems son obligatorios' });

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unit_price, 0);
  const tax = Math.round(subtotal * 0.19);
  const total = subtotal + tax;

  const result = db.prepare(`
    INSERT INTO invoices (type, invoice_number, date, customer_name, customer_rut, supplier_name, subtotal, tax, total, notes, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(type, invoice_number || null, date, customer_name || null, customer_rut || null, supplier_name || null, subtotal, tax, total, notes || null, req.user.id);

  const insertItem = db.prepare('INSERT INTO invoice_items (invoice_id, product_id, product_code, product_name, quantity, unit_price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?)');
  const insertItems = db.transaction((rows) => {
    for (const item of rows) {
      insertItem.run(result.lastInsertRowid, item.product_id || null, item.product_code || null, item.product_name, item.quantity, item.unit_price, item.quantity * item.unit_price);
    }
  });
  insertItems(items);

  res.status(201).json({ id: result.lastInsertRowid, total });
});

// Eliminar factura
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM invoices WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
