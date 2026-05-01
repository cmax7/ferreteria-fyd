const router = require('express').Router();
const db = require('../db');
const { authMiddleware, employeeOnly } = require('../middleware/auth');

router.get('/', authMiddleware, employeeOnly, (req, res) => {
  const currentMonth = new Date().toISOString().slice(0, 7);

  const thisMonth = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type='sale' THEN total ELSE 0 END), 0) as sales_total,
      COUNT(CASE WHEN type='sale' THEN 1 END) as sales_count,
      COALESCE(SUM(CASE WHEN type='purchase' THEN total ELSE 0 END), 0) as purchase_total,
      COUNT(CASE WHEN type='purchase' THEN 1 END) as purchase_count
    FROM invoices WHERE strftime('%Y-%m', date) = ? AND status = 'active'
  `).get(currentMonth);

  const monthlyRevenue = db.prepare(`
    SELECT strftime('%Y-%m', date) as month,
           COALESCE(SUM(total), 0) as revenue,
           COUNT(*) as count
    FROM invoices WHERE type = 'sale' AND status = 'active'
    GROUP BY month ORDER BY month DESC LIMIT 6
  `).all().reverse();

  const pendingQuotations = db.prepare(`SELECT COUNT(*) as count FROM quotations WHERE status = 'pending'`).get().count;

  const lowStockCount = db.prepare(`SELECT COUNT(*) as count FROM products WHERE active=1 AND stock <= stock_min`).get().count;
  const lowStockProducts = db.prepare(`
    SELECT id, code, name, stock, stock_min, category
    FROM products WHERE active=1 AND stock <= stock_min ORDER BY stock ASC LIMIT 8
  `).all();

  const topProducts = db.prepare(`
    SELECT ii.product_name, SUM(ii.quantity) as total_qty, SUM(ii.subtotal) as total_revenue
    FROM invoice_items ii JOIN invoices i ON i.id = ii.invoice_id
    WHERE i.type = 'sale' AND strftime('%Y-%m', i.date) = ?
    GROUP BY ii.product_name ORDER BY total_qty DESC LIMIT 5
  `).all(currentMonth);

  const recentInvoices = db.prepare(`
    SELECT id, type, invoice_number, date, customer_name, supplier_name, total
    FROM invoices ORDER BY created_at DESC LIMIT 5
  `).all();

  const recentQuotations = db.prepare(`
    SELECT id, date, customer_name, customer_phone, total, status, created_at
    FROM quotations ORDER BY created_at DESC LIMIT 5
  `).all();

  res.json({ thisMonth, monthlyRevenue, pendingQuotations, lowStockCount, lowStockProducts, topProducts, recentInvoices, recentQuotations });
});

module.exports = router;
