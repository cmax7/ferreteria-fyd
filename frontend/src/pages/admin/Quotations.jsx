import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

function generateQuotePDF(q) {
  const doc = new jsPDF();

  doc.setFillColor(30, 41, 59);
  doc.rect(0, 0, 210, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont(undefined, 'bold');
  doc.text('Ferretería FyD Romeral', 14, 15);
  doc.setFontSize(11);
  doc.setFont(undefined, 'normal');
  doc.text('Romeral, Chile · +56 9 7331 4133', 14, 23);
  doc.text('COTIZACIÓN', 196, 23, { align: 'right' });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(`N° ${q.id}`, 14, 45);
  doc.text(`Fecha: ${q.date}`, 14, 52);
  doc.text(`Válida por: ${q.valid_days} días`, 14, 59);
  if (q.customer_name) doc.text(`Cliente: ${q.customer_name}`, 14, 66);
  if (q.customer_phone) doc.text(`Teléfono: ${q.customer_phone}`, 14, 73);

  autoTable(doc, {
    startY: 82,
    head: [['Código', 'Producto', 'Cant.', 'Precio Unit.', 'Subtotal']],
    body: q.items.map(i => [
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
  doc.text(`Subtotal: $${q.subtotal.toLocaleString('es-CL')}`, 140, y);
  doc.text(`IVA (19%): $${q.tax.toLocaleString('es-CL')}`, 140, y + 7);
  doc.setFont(undefined, 'bold');
  doc.setFontSize(12);
  doc.text(`TOTAL: $${q.total.toLocaleString('es-CL')}`, 140, y + 16);
  if (q.notes) {
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text(`Notas: ${q.notes}`, 14, y + 16);
  }

  doc.save(`cotizacion_${q.id}.pdf`);
}

const STATUS_LABELS = { pending: 'Pendiente', converted: 'Convertida', rejected: 'Rechazada' };
const STATUS_COLORS = { pending: 'bg-yellow-100 text-yellow-700', converted: 'bg-green-100 text-green-700', rejected: 'bg-gray-100 text-gray-600' };

export default function Quotations() {
  const navigate = useNavigate();
  const [quotations, setQuotations] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [detail, setDetail] = useState(null);
  const [converting, setConverting] = useState(false);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/quotations', { params: { status: statusFilter, page, limit: 20 } });
      setQuotations(data.quotations);
      setTotal(data.total);
      setPages(data.pages);
    } finally { setLoading(false); }
  }, [statusFilter, page]);

  useEffect(() => { setPage(1); }, [statusFilter]);
  useEffect(() => { fetch(); }, [fetch]);

  const openDetail = async (id) => {
    const { data } = await axios.get(`/api/quotations/${id}`);
    setDetail(data);
  };

  const handleStatus = async (id, status) => {
    await axios.put(`/api/quotations/${id}/status`, { status });
    setDetail(prev => prev ? { ...prev, status } : null);
    fetch();
  };

  const handleConvert = async (id) => {
    if (!confirm('¿Convertir esta cotización en factura de venta?')) return;
    setConverting(true);
    try {
      const { data } = await axios.post(`/api/quotations/${id}/convert`);
      setDetail(null);
      fetch();
      navigate(`/admin/invoices`);
    } finally { setConverting(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta cotización?')) return;
    await axios.delete(`/api/quotations/${id}`);
    setDetail(null);
    fetch();
  };

  const handlePDF = async (id) => {
    const { data } = await axios.get(`/api/quotations/${id}`);
    generateQuotePDF(data);
  };

  const filters = [{ label: 'Todas', val: '' }, { label: 'Pendientes', val: 'pending' }, { label: 'Convertidas', val: 'converted' }, { label: 'Rechazadas', val: 'rejected' }];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Cotizaciones</h1>
          <p className="text-gray-500 text-sm">{total} cotizaciones registradas</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {filters.map(f => (
          <button key={f.val} onClick={() => setStatusFilter(f.val)}
            className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${statusFilter === f.val ? 'bg-primary text-white' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>
      ) : quotations.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-3">📋</div>
          <p>No hay cotizaciones registradas</p>
          <p className="text-sm mt-2">Los clientes pueden solicitar cotizaciones desde el catálogo</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">N°</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Estado</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold hidden sm:table-cell">Cliente</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold hidden md:table-cell">Fecha</th>
                <th className="text-right px-4 py-3 text-gray-600 font-semibold">Total</th>
                <th className="text-center px-4 py-3 text-gray-600 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {quotations.map(q => (
                <tr key={q.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs">#{q.id}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${STATUS_COLORS[q.status] || 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[q.status] || q.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                    <div>{q.customer_name || '-'}</div>
                    {q.customer_phone && <div className="text-xs text-gray-400">{q.customer_phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{q.date}</td>
                  <td className="px-4 py-3 text-right font-bold text-primary">${q.total.toLocaleString('es-CL')}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openDetail(q.id)} className="text-blue-600 hover:text-blue-800 font-semibold text-xs">Ver</button>
                      <button onClick={() => handlePDF(q.id)} className="text-green-600 hover:text-green-800 font-semibold text-xs">PDF</button>
                      <button onClick={() => handleDelete(q.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Eliminar</button>
                    </div>
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

      {/* Modal detalle */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h2 className="font-bold text-lg">Cotización #{detail.id}</h2>
                <span className={`badge text-xs ${STATUS_COLORS[detail.status]}`}>{STATUS_LABELS[detail.status]}</span>
              </div>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
            </div>
            <div className="p-5 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">Cliente:</span> <strong>{detail.customer_name || '-'}</strong></div>
                <div><span className="text-gray-500">Teléfono:</span> <strong>{detail.customer_phone || '-'}</strong></div>
                <div><span className="text-gray-500">Email:</span> <strong>{detail.customer_email || '-'}</strong></div>
                <div><span className="text-gray-500">Fecha:</span> <strong>{detail.date}</strong></div>
                <div><span className="text-gray-500">Válida:</span> <strong>{detail.valid_days} días</strong></div>
              </div>
              {detail.notes && <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">Notas: {detail.notes}</p>}

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-gray-600">Producto</th>
                      <th className="text-center px-3 py-2 text-gray-600">Cant.</th>
                      <th className="text-right px-3 py-2 text-gray-600">Precio</th>
                      <th className="text-right px-3 py-2 text-gray-600">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {detail.items?.map((item, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2">
                          <p className="font-medium">{item.product_name}</p>
                          <p className="text-xs text-gray-400">{item.product_code}</p>
                        </td>
                        <td className="px-3 py-2 text-center">{item.quantity}</td>
                        <td className="px-3 py-2 text-right">${item.unit_price.toLocaleString('es-CL')}</td>
                        <td className="px-3 py-2 text-right font-semibold">${item.subtotal.toLocaleString('es-CL')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-right space-y-1 text-sm">
                <p className="text-gray-600">Subtotal: <strong>${detail.subtotal.toLocaleString('es-CL')}</strong></p>
                <p className="text-gray-600">IVA (19%): <strong>${detail.tax.toLocaleString('es-CL')}</strong></p>
                <p className="text-lg font-bold text-primary">Total: ${detail.total.toLocaleString('es-CL')}</p>
              </div>
            </div>
            <div className="p-5 border-t flex flex-wrap gap-2">
              {detail.status === 'pending' && (
                <>
                  <button onClick={() => handleConvert(detail.id)} disabled={converting} className="btn-primary text-sm flex-1">
                    {converting ? 'Convirtiendo...' : '✓ Convertir en Factura'}
                  </button>
                  <button onClick={() => handleStatus(detail.id, 'rejected')} className="btn-secondary text-sm px-4">
                    Rechazar
                  </button>
                </>
              )}
              {detail.status === 'rejected' && (
                <button onClick={() => handleStatus(detail.id, 'pending')} className="btn-secondary text-sm px-4">
                  Reactivar
                </button>
              )}
              <button onClick={() => generateQuotePDF(detail)} className="btn-secondary text-sm px-4">Descargar PDF</button>
              <button onClick={() => handleDelete(detail.id)} className="text-red-500 hover:text-red-700 text-sm font-semibold px-3">Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
