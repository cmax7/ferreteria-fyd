import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ITEM_EMPTY = { product_id: null, product_code: '', product_name: '', quantity: 1, unit_price: 0 };

export default function InvoiceForm() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ type: 'sale', invoice_number: '', date: new Date().toISOString().slice(0, 10), customer_name: '', customer_rut: '', supplier_name: '', notes: '' });
  const [items, setItems] = useState([{ ...ITEM_EMPTY }]);
  const [productSearch, setProductSearch] = useState({});
  const [productResults, setProductResults] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const searchProduct = async (idx, q) => {
    setProductSearch({ ...productSearch, [idx]: q });
    if (q.length < 2) { setProductResults({ ...productResults, [idx]: [] }); return; }
    const { data } = await axios.get('/api/products', { params: { search: q, limit: 6 } });
    setProductResults({ ...productResults, [idx]: data.products });
  };

  const selectProduct = (idx, product) => {
    const updated = [...items];
    updated[idx] = { product_id: product.id, product_code: product.code, product_name: product.name, quantity: 1, unit_price: product.price };
    setItems(updated);
    setProductSearch({ ...productSearch, [idx]: '' });
    setProductResults({ ...productResults, [idx]: [] });
  };

  const updateItem = (idx, field, value) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));
  const addItem = () => setItems([...items, { ...ITEM_EMPTY }]);

  const subtotal = items.reduce((s, i) => s + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0), 0);
  const tax = Math.round(subtotal * 0.19);
  const total = subtotal + tax;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validItems = items.filter(i => i.product_name && i.quantity > 0);
    if (!validItems.length) { setError('Agrega al menos un producto'); return; }
    setSaving(true); setError('');
    try {
      await axios.post('/api/invoices', { ...form, items: validItems.map(i => ({ ...i, quantity: parseFloat(i.quantity), unit_price: parseFloat(i.unit_price) })) });
      navigate('/admin/invoices');
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-gray-700">← Volver</button>
        <h1 className="text-2xl font-bold">Nueva Factura</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipo y datos generales */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-700">Información general</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select className="input" value={form.type} onChange={set('type')}>
                <option value="sale">Venta</option>
                <option value="purchase">Compra</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">N° Factura</label>
              <input className="input" placeholder="Ej: 001234" value={form.invoice_number} onChange={set('invoice_number')} />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
              <input className="input" type="date" value={form.date} onChange={set('date')} required />
            </div>
          </div>
          {form.type === 'sale' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                <input className="input" placeholder="Nombre del cliente" value={form.customer_name} onChange={set('customer_name')} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
                <input className="input" placeholder="12.345.678-9" value={form.customer_rut} onChange={set('customer_rut')} />
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <input className="input" placeholder="Nombre del proveedor" value={form.supplier_name} onChange={set('supplier_name')} />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <input className="input" placeholder="Observaciones opcionales..." value={form.notes} onChange={set('notes')} />
          </div>
        </div>

        {/* Productos */}
        <div className="card space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-gray-700">Productos</h2>
            <button type="button" onClick={addItem} className="text-primary text-sm font-semibold hover:underline">+ Agregar línea</button>
          </div>

          <div className="space-y-2">
            {items.map((item, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-2 items-start p-3 bg-gray-50 rounded-lg">
                <div className="col-span-5 relative">
                  {item.product_name ? (
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{item.product_name}</p>
                        <p className="text-xs text-gray-400">{item.product_code}</p>
                      </div>
                      <button type="button" onClick={() => { const u = [...items]; u[idx] = { ...ITEM_EMPTY }; setItems(u); }} className="text-gray-400 hover:text-red-500 text-xs">✕</button>
                    </div>
                  ) : (
                    <>
                      <input
                        className="input text-sm"
                        placeholder="Buscar producto..."
                        value={productSearch[idx] || ''}
                        onChange={e => searchProduct(idx, e.target.value)}
                      />
                      {(productResults[idx] || []).length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white border rounded-lg shadow-lg z-10 mt-1">
                          {productResults[idx].map(p => (
                            <button key={p.id} type="button" onClick={() => selectProduct(idx, p)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-0">
                              <span className="font-mono text-xs text-gray-400 mr-2">{p.code}</span>
                              {p.name}
                              <span className="float-right text-primary font-semibold">${p.price.toLocaleString('es-CL')}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="col-span-2">
                  <input className="input text-sm" type="number" min="0.01" step="0.01" placeholder="Cant." value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)} />
                </div>
                <div className="col-span-3">
                  <input className="input text-sm" type="number" min="0" step="1" placeholder="Precio" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)} />
                </div>
                <div className="col-span-1 text-right pt-2 text-sm font-semibold text-primary">
                  ${((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toLocaleString('es-CL')}
                </div>
                <div className="col-span-1 text-center pt-2">
                  <button type="button" onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">✕</button>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-3 space-y-1 text-sm text-right">
            <p className="text-gray-600">Subtotal: <strong>${subtotal.toLocaleString('es-CL')}</strong></p>
            <p className="text-gray-600">IVA (19%): <strong>${tax.toLocaleString('es-CL')}</strong></p>
            <p className="text-lg font-bold text-primary">Total: ${total.toLocaleString('es-CL')}</p>
          </div>
        </div>

        {error && <p className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">{error}</p>}

        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="btn-primary flex-1 py-3 text-base">{saving ? 'Guardando...' : 'Guardar factura'}</button>
          <button type="button" onClick={() => navigate(-1)} className="btn-secondary px-6">Cancelar</button>
        </div>
      </form>
    </div>
  );
}
