const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'ferreteria.db'));

db.exec('PRAGMA journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'customer',
    phone TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price REAL NOT NULL DEFAULT 0,
    category TEXT,
    unit TEXT DEFAULT 'unidad',
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    invoice_number TEXT,
    date TEXT NOT NULL,
    customer_name TEXT,
    customer_rut TEXT,
    supplier_name TEXT,
    subtotal REAL NOT NULL DEFAULT 0,
    tax REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'active',
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    invoice_id INTEGER NOT NULL,
    product_id INTEGER,
    product_code TEXT,
    product_name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
  );
`);

// Agregar columnas de stock si no existen
try { db.exec('ALTER TABLE products ADD COLUMN stock INTEGER DEFAULT 0'); } catch(e) {}
try { db.exec('ALTER TABLE products ADD COLUMN stock_min INTEGER DEFAULT 5'); } catch(e) {}

db.exec(`
  CREATE TABLE IF NOT EXISTS quotations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quote_number TEXT,
    date TEXT NOT NULL,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    subtotal REAL NOT NULL DEFAULT 0,
    tax REAL NOT NULL DEFAULT 0,
    total REAL NOT NULL DEFAULT 0,
    notes TEXT,
    valid_days INTEGER DEFAULT 7,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS quotation_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    quotation_id INTEGER NOT NULL,
    product_id INTEGER,
    product_code TEXT,
    product_name TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit_price REAL NOT NULL,
    subtotal REAL NOT NULL,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE
  );
`);

// Helper para transacciones
db.transaction = (fn) => (...args) => {
  db.exec('BEGIN');
  try {
    const result = fn(...args);
    db.exec('COMMIT');
    return result;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
};

const adminExists = db.prepare('SELECT id FROM users WHERE role = ?').get('employee');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'employee')`)
    .run('Administrador', 'admin@ferreteriafd.cl', hash);
  console.log('Usuario admin creado: admin@ferreteriafd.cl / admin123');
}

const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get();
if (productCount.count === 0) {
  const products = [
    ['CLV001', 'Clavo 2 pulgadas', 'Caja 500g', 1500, 'Ferretería', 'caja'],
    ['CLV002', 'Clavo 3 pulgadas', 'Caja 500g', 1800, 'Ferretería', 'caja'],
    ['TOR001', 'Tornillo autorroscante 1"', 'Caja 100 unidades', 2500, 'Ferretería', 'caja'],
    ['TOR002', 'Tornillo autorroscante 2"', 'Caja 100 unidades', 3000, 'Ferretería', 'caja'],
    ['TOR003', 'Tornillo galvanizado 3"', 'Caja 50 unidades', 3500, 'Ferretería', 'caja'],
    ['PIN001', 'Pintura látex blanco 1L', 'Pintura interior', 8500, 'Pinturas', 'litro'],
    ['PIN002', 'Pintura látex blanco 4L', 'Pintura interior', 28000, 'Pinturas', 'galon'],
    ['PIN003', 'Pintura esmalte negro 1L', 'Para metal y madera', 9500, 'Pinturas', 'litro'],
    ['PIN004', 'Pintura esmalte blanco 1L', 'Para metal y madera', 9500, 'Pinturas', 'litro'],
    ['CAB001', 'Cable eléctrico 2.5mm', 'Metro lineal', 1200, 'Eléctrico', 'metro'],
    ['CAB002', 'Cable eléctrico 4mm', 'Metro lineal', 1800, 'Eléctrico', 'metro'],
    ['CAB003', 'Cable encauchetado 2x1.5mm', 'Metro lineal', 1400, 'Eléctrico', 'metro'],
    ['TUB001', 'Tubo PVC 1/2"', 'Tubo 3 metros', 4500, 'Plomería', 'pieza'],
    ['TUB002', 'Tubo PVC 3/4"', 'Tubo 3 metros', 6500, 'Plomería', 'pieza'],
    ['TUB003', 'Tubo PVC 1"', 'Tubo 3 metros', 8500, 'Plomería', 'pieza'],
    ['CEM001', 'Cemento 25kg', 'Saco Portland', 7500, 'Construcción', 'saco'],
    ['ARE001', 'Arena fina 40kg', 'Saco arena', 3500, 'Construcción', 'saco'],
    ['LAD001', 'Ladrillo corriente', 'Unidad', 350, 'Construcción', 'unidad'],
    ['MAR001', 'Martillo carpintero', 'Mango madera 500g', 12000, 'Herramientas', 'unidad'],
    ['DES001', 'Destornillador plano', 'Punta 6mm', 3500, 'Herramientas', 'unidad'],
    ['DES002', 'Destornillador estrella', 'Punta PH2', 3500, 'Herramientas', 'unidad'],
    ['LLA001', 'Llave ajustable 10"', 'Acero cromo', 8500, 'Herramientas', 'unidad'],
    ['LLA002', 'Llave francesa 12"', 'Acero cromo', 11000, 'Herramientas', 'unidad'],
    ['MAS001', 'Masilla acrílica 1kg', 'Para exteriores', 4500, 'Pinturas', 'unidad'],
    ['LIJ001', 'Lija al agua #80', 'Hoja 230x280mm', 800, 'Pinturas', 'unidad'],
    ['LIJ002', 'Lija al agua #120', 'Hoja 230x280mm', 800, 'Pinturas', 'unidad'],
    ['CIN001', 'Cinta aislante 20m', 'Color negro', 1500, 'Eléctrico', 'rollo'],
    ['INT001', 'Interruptor simple', 'Empotrado', 2800, 'Eléctrico', 'unidad'],
    ['ENC001', 'Enchufe hembra 16A', 'Empotrado', 3200, 'Eléctrico', 'unidad'],
    ['LLH001', 'Llave de paso 1/2"', 'Bronce', 5500, 'Plomería', 'unidad'],
  ];

  const insert = db.prepare('INSERT INTO products (code, name, description, price, category, unit) VALUES (?, ?, ?, ?, ?, ?)');
  db.transaction((rows) => { for (const r of rows) insert.run(...r); })(products);
  console.log(`${products.length} productos de ejemplo creados`);
}

module.exports = db;
