import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function generatePDF(invoice) {
  const doc = new jsPDF();
  const isVenta = invoice.type === 'sale';

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('Ferretería FyD Romeral', 14, 15);
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text('Romeral, Chile · +56 9 7331 4133', 14, 23);
  doc.text(isVenta ? 'FACTURA DE VENTA' : 'FACTURA DE COMPRA', 196, 23, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(`N° ${invoice.invoice_number || invoice.id}`, 14, 45);
  doc.text(`Fecha: ${invoice.date}`, 14, 52);
  if (isVenta) {
    if (invoice.customer_name) doc.text(`Cliente: ${invoice.customer_name}`, 14, 59);
    if (invoice.customer_rut) doc.text(`RUT: ${invoice.customer_rut}`, 14, 66);
  } else {
    if (invoice.supplier_name) doc.text(`Proveedor: ${invoice.supplier_name}`, 14, 59);
  }

  autoTable(doc, {
    startY: 75,
    head: [['Código', 'Producto', 'Cant.', 'Precio Unit.', 'Subtotal']],
    body: invoice.items.map(i => [
      i.product_code || '-',
      i.product_name,
      i.quantity,
      `$${i.unit_price.toLocaleString('es-CL')}`,
      `$${i.subtotal.toLocaleString('es-CL')}`
    ]),
    headStyles: { fillColor: [22, 163, 74] },
    styles: { fontSize: 9 },
  });

  const y = doc.lastAutoTable.finalY + 10;
  doc.setFontSize(10);
  doc.text(`Subtotal: $${invoice.subtotal.toLocaleString('es-CL')}`, 140, y);
  doc.text(`IVA (19%): $${invoice.tax.toLocaleString('es-CL')}`, 140, y + 7);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(12);
  doc.text(`TOTAL: $${invoice.total.toLocaleString('es-CL')}`, 140, y + 16);
  if (invoice.notes) {
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text(`Notas: ${invoice.notes}`, 14, y + 16);
  }

  doc.save(`factura_${invoice.invoice_number || invoice.id}.pdf`);
}

export default function Invoices() {
  const [searchParams] = useSearchParams();
  const typeFilter = searchParams.get('type') || '';
  const [invoices, setInvoices] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/invoices', { params: { type: typeFilter, search, page, limit: 20 } });
      setInvoices(data.invoices);
      setTotal(data.total);
      setPages(data.pages);
    } finally {
      setLoading(false);
    }
  }, [typeFilter, search, page]);

  useEffect(() => { setPage(1); }, [search, typeFilter]);
  useEffect(() => { fetch(); }, [fetch]);

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta factura?')) return;
    await axios.delete(`/api/invoices/${id}`);
    fetch();
  };

  const handlePDF = async (id) => {
    const { data } = await axios.get(`/api/invoices/${id}`);
    generatePDF(data);
  };

  const title = typeFilter === 'sale' ? 'Facturas de Venta' : typeFilter === 'purchase' ? 'Facturas de Compra' : 'Todas las Facturas';

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-gray-500 text-sm">{total} facturas registradas</p>
        </div>
        <Link to="/admin/invoices/new" className="btn-primary text-sm">+ Nueva factura</Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input className="input max-w-sm" placeholder="Buscar por N° o cliente/proveedor..." value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex gap-2">
          {[{ label: 'Todas', val: '' }, { label: 'Ventas', val: 'sale' }, { label: 'Compras', val: 'purchase' }].map(opt => (
            <Link key={opt.val} to={opt.val ? `/admin/invoices?type=${opt.val}` : '/admin/invoices'}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${typeFilter === opt.val ? 'bg-primary text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-3">🧾</div>
          <p>No hay facturas registradas</p>
          <Link to="/admin/invoices/new" className="btn-primary inline-block mt-4 text-sm">Crear primera factura</Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">N° Factura</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Tipo</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold hidden sm:table-cell">Cliente/Proveedor</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold hidden md:table-cell">Fecha</th>
                <th className="text-right px-4 py-3 text-gray-600 font-semibold">Total</th>
                <th className="text-center px-4 py-3 text-gray-600 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {invoices.map(inv => (
                <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">{inv.invoice_number || `#${inv.id}`}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${inv.type === 'sale' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                      {inv.type === 'sale' ? 'Venta' : 'Compra'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{inv.customer_name || inv.supplier_name || '-'}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{inv.date}</td>
                  <td className="px-4 py-3 text-right font-bold text-primary">${inv.total.toLocaleString('es-CL')}</td>
                  <td className="px-4 py-3 text-center flex items-center justify-center gap-2">
                    <button onClick={() => handlePDF(inv.id)} title="Descargar PDF" className="text-green-600 hover:text-green-800 font-semibold text-xs">PDF</button>
                    <button onClick={() => handleDelete(inv.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Eliminar</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40">← Anterior</button>
          <span className="px-4 py-1.5 text-sm text-gray-600">Página {page} de {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40">Siguiente →</button>
        </div>
      )}
    </div>
  );
}
