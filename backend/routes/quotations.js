const router = require('express').Router();
const db = require('../db');
const { authMiddleware, employeeOnly } = require('../middleware/auth');

// Pública: crear cotización desde carrito
router.post('/', (req, res) => {
  const { customer_name, customer_phone, customer_email, items, notes, valid_days = 7 } = req.body;
  if (!items || items.length === 0) return res.status(400).json({ error: 'Sin productos' });

  const subtotal = items.reduce((s, i) => s + (i.quantity * i.unit_price), 0);
  const tax = Math.round(subtotal * 0.19);
  const total = subtotal + tax;
  const date = new Date().toISOString().slice(0, 10);

  const create = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO quotations (date, customer_name, customer_phone, customer_email, subtotal, tax, total, notes, valid_days, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
    `).run(date, customer_name || null, customer_phone || null, customer_email || null, subtotal, tax, total, notes || null, valid_days);

    const qId = result.lastInsertRowid;
    for (const item of items) {
      db.prepare(`
        INSERT INTO quotation_items (quotation_id, product_id, product_code, product_name, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(qId, item.product_id || null, item.product_code || null, item.product_name, item.quantity, item.unit_price, item.quantity * item.unit_price);
    }
    return qId;
  });

  const id = create();
  res.status(201).json({ id });
});

// Empleados: listar
router.get('/', authMiddleware, employeeOnly, (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  let where = '';
  const params = [];
  if (status) { where = 'WHERE status = ?'; params.push(status); }

  const total = db.prepare(`SELECT COUNT(*) as count FROM quotations ${where}`).get(...params).count;
  const quotations = db.prepare(`SELECT * FROM quotations ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, Number(limit), Number(offset));
  res.json({ quotations, total, pages: Math.ceil(total / limit) });
});

// Empleados: obtener una con items
router.get('/:id', authMiddleware, employeeOnly, (req, res) => {
  const quotation = db.prepare('SELECT * FROM quotations WHERE id = ?').get(req.params.id);
  if (!quotation) return res.status(404).json({ error: 'No encontrada' });
  const items = db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ?').all(req.params.id);
  res.json({ ...quotation, items });
});

// Empleados: actualizar estado
router.put('/:id/status', authMiddleware, employeeOnly, (req, res) => {
  const { status } = req.body;
  db.prepare('UPDATE quotations SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ ok: true });
});

// Empleados: convertir a factura
router.post('/:id/convert', authMiddleware, employeeOnly, (req, res) => {
  const quotation = db.prepare('SELECT * FROM quotations WHERE id = ?').get(req.params.id);
  if (!quotation) return res.status(404).json({ error: 'No encontrada' });
  const items = db.prepare('SELECT * FROM quotation_items WHERE quotation_id = ?').all(quotation.id);

  const convert = db.transaction(() => {
    const result = db.prepare(`
      INSERT INTO invoices (type, date, customer_name, subtotal, tax, total, notes, status, created_by)
      VALUES ('sale', ?, ?, ?, ?, ?, ?, 'active', ?)
    `).run(quotation.date, quotation.customer_name, quotation.subtotal, quotation.tax, quotation.total, quotation.notes, req.user.id);

    const invoiceId = result.lastInsertRowid;
    for (const item of items) {
      db.prepare(`
        INSERT INTO invoice_items (invoice_id, product_id, product_code, product_name, quantity, unit_price, subtotal)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(invoiceId, item.product_id, item.product_code, item.product_name, item.quantity, item.unit_price, item.subtotal);
    }
    db.prepare('UPDATE quotations SET status = ? WHERE id = ?').run('converted', quotation.id);
    return invoiceId;
  });

  const invoiceId = convert();
  res.json({ invoiceId });
});

// Empleados: eliminar
router.delete('/:id', authMiddleware, employeeOnly, (req, res) => {
  db.prepare('DELETE FROM quotations WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
