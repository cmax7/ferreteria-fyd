const router = require('express').Router();
const db = require('../db');
const { authMiddleware, employeeOnly } = require('../middleware/auth');
const multer = require('multer');
const xlsx = require('xlsx');

const upload = multer({ storage: multer.memoryStorage() });

// Público: listar productos activos
router.get('/', (req, res) => {
  const { search, category, page = 1, limit = 24 } = req.query;
  const offset = (page - 1) * limit;
  let where = 'WHERE active = 1';
  const params = [];

  if (search) {
    where += ' AND (LOWER(name) LIKE ? OR LOWER(code) LIKE ?)';
    params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
  }
  if (category) {
    where += ' AND category = ?';
    params.push(category);
  }

  const total = db.prepare(`SELECT COUNT(*) as count FROM products ${where}`).get(...params).count;
  const products = db.prepare(`SELECT * FROM products ${where} ORDER BY name ASC LIMIT ? OFFSET ?`).all(...params, Number(limit), Number(offset));
  res.json({ products, total, pages: Math.ceil(total / limit) });
});

// Público: categorías
router.get('/categories', (req, res) => {
  const cats = db.prepare("SELECT DISTINCT category FROM products WHERE active = 1 AND category IS NOT NULL ORDER BY category").all();
  res.json(cats.map(c => c.category));
});

// Empleados: obtener todos (incluyendo inactivos)
router.get('/all', authMiddleware, employeeOnly, (req, res) => {
  const { search, page = 1, limit = 30 } = req.query;
  const offset = (page - 1) * limit;
  let where = '';
  const params = [];
  if (search) {
    where = 'WHERE LOWER(name) LIKE ? OR LOWER(code) LIKE ?';
    params.push(`%${search.toLowerCase()}%`, `%${search.toLowerCase()}%`);
  }
  const total = db.prepare(`SELECT COUNT(*) as count FROM products ${where}`).get(...params).count;
  const products = db.prepare(`SELECT * FROM products ${where} ORDER BY code ASC LIMIT ? OFFSET ?`).all(...params, Number(limit), Number(offset));
  res.json({ products, total, pages: Math.ceil(total / limit) });
});

// Empleados: productos con stock bajo
router.get('/low-stock', authMiddleware, employeeOnly, (req, res) => {
  const products = db.prepare(`SELECT id, code, name, category, stock, stock_min FROM products WHERE active=1 AND stock <= stock_min ORDER BY stock ASC`).all();
  res.json(products);
});

// Empleados: actualizar stock
router.put('/:id/stock', authMiddleware, employeeOnly, (req, res) => {
  const { stock, stock_min } = req.body;
  db.prepare('UPDATE products SET stock=?, stock_min=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(stock ?? 0, stock_min ?? 5, req.params.id);
  res.json({ ok: true });
});

// Empleados: crear producto
router.post('/', authMiddleware, employeeOnly, (req, res) => {
  const { code, name, description, price, category, unit } = req.body;
  if (!code || !name) return res.status(400).json({ error: 'Código y nombre son obligatorios' });
  try {
    const result = db.prepare('INSERT INTO products (code, name, description, price, category, unit) VALUES (?, ?, ?, ?, ?, ?)')
      .run(code, name, description || null, price || 0, category || null, unit || 'unidad');
    res.status(201).json({ id: result.lastInsertRowid });
  } catch (e) {
    res.status(400).json({ error: 'El código ya existe' });
  }
});

// Empleados: editar producto
router.put('/:id', authMiddleware, employeeOnly, (req, res) => {
  const { code, name, description, price, category, unit, active, stock, stock_min } = req.body;
  db.prepare('UPDATE products SET code=?, name=?, description=?, price=?, category=?, unit=?, active=?, stock=?, stock_min=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(code, name, description || null, price || 0, category || null, unit || 'unidad', active !== undefined ? active : 1, stock ?? 0, stock_min ?? 5, req.params.id);
  res.json({ ok: true });
});

// Empleados: eliminar producto
router.delete('/:id', authMiddleware, employeeOnly, (req, res) => {
  db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

// Empleados: importar desde Excel
router.post('/import', authMiddleware, employeeOnly, upload.single('file'), (req, res) => {
  try {
    const wb = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet);

    const insert = db.prepare('INSERT OR REPLACE INTO products (code, name, description, price, category, unit) VALUES (?, ?, ?, ?, ?, ?)');
    const insertAll = db.transaction((items) => {
      let count = 0;
      for (const row of items) {
        const code = String(row['Código'] || row['Codigo'] || row['code'] || '').trim();
        const name = String(row['Nombre'] || row['name'] || '').trim();
        if (!code || !name) continue;
        insert.run(
          code, name,
          String(row['Descripción'] || row['Descripcion'] || row['description'] || ''),
          parseFloat(row['Precio'] || row['price'] || 0),
          String(row['Categoría'] || row['Categoria'] || row['category'] || ''),
          String(row['Unidad'] || row['unit'] || 'unidad')
        );
        count++;
      }
      return count;
    });

    const count = insertAll(rows);
    res.json({ imported: count });
  } catch (e) {
    res.status(400).json({ error: 'Error al procesar el archivo Excel' });
  }
});

module.exports = router;
