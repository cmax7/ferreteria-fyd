import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

const EMPTY = { code: '', name: '', description: '', price: '', category: '', unit: 'unidad', stock: 0, stock_min: 5 };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const [stockModal, setStockModal] = useState(null);
  const fileRef = useRef();

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/products/all', { params: { search, page, limit: 30 } });
      setProducts(data.products);
      setTotal(data.total);
      setPages(data.pages);
    } finally { setLoading(false); }
  }, [search, page]);

  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { fetch(); }, [fetch]);

  const openCreate = () => { setForm(EMPTY); setError(''); setModal({ mode: 'create' }); };
  const openEdit = (p) => { setForm({ ...p, price: String(p.price), stock: p.stock ?? 0, stock_min: p.stock_min ?? 5 }); setError(''); setModal({ mode: 'edit', id: p.id }); };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      const payload = { ...form, price: parseFloat(form.price) || 0, stock: parseInt(form.stock) || 0, stock_min: parseInt(form.stock_min) || 5 };
      if (modal.mode === 'create') await axios.post('/api/products', payload);
      else await axios.put(`/api/products/${modal.id}`, payload);
      setModal(null);
      fetch();
    } catch (err) {
      setError(err.response?.data?.error || 'Error al guardar');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Desactivar este producto?')) return;
    await axios.delete(`/api/products/${id}`);
    fetch();
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    try {
      const { data } = await axios.post('/api/products/import', fd);
      setImportMsg(`✓ ${data.imported} productos importados`);
      fetch();
    } catch {
      setImportMsg('Error al importar el archivo');
    }
    fileRef.current.value = '';
    setTimeout(() => setImportMsg(''), 4000);
  };

  const handleStockSave = async () => {
    await axios.put(`/api/products/${stockModal.id}/stock`, { stock: parseInt(stockModal.stock) || 0, stock_min: parseInt(stockModal.stock_min) || 5 });
    setStockModal(null);
    fetch();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gestión de Productos</h1>
          <p className="text-gray-500 text-sm">{total} productos en total</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <label className="btn-secondary text-sm cursor-pointer flex items-center gap-1">
            📊 Importar Excel
            <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleImport} />
          </label>
          <button onClick={openCreate} className="btn-primary text-sm">+ Nuevo producto</button>
        </div>
      </div>

      {importMsg && <p className={`mb-4 text-sm p-3 rounded-lg ${importMsg.startsWith('✓') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{importMsg}</p>}

      <div className="mb-4">
        <input className="input max-w-sm" placeholder="Buscar por nombre o código..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="text-xs text-gray-500 mb-3 bg-blue-50 p-3 rounded-lg">
        <strong>Formato Excel para importar:</strong> columnas: <code>Código</code>, <code>Nombre</code>, <code>Descripción</code>, <code>Precio</code>, <code>Categoría</code>, <code>Unidad</code>
      </div>

      {loading ? (
        <div className="flex justify-center py-10"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div></div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Código</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Nombre</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold hidden sm:table-cell">Categoría</th>
                <th className="text-right px-4 py-3 text-gray-600 font-semibold">Precio</th>
                <th className="text-center px-4 py-3 text-gray-600 font-semibold hidden md:table-cell">Stock</th>
                <th className="text-center px-4 py-3 text-gray-600 font-semibold">Estado</th>
                <th className="text-center px-4 py-3 text-gray-600 font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map(p => {
                const lowStock = (p.stock ?? 0) <= (p.stock_min ?? 5);
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{p.code}</td>
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{p.category || '-'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">${p.price.toLocaleString('es-CL')}</td>
                    <td className="px-4 py-3 text-center hidden md:table-cell">
                      <button onClick={() => setStockModal({ id: p.id, name: p.name, stock: p.stock ?? 0, stock_min: p.stock_min ?? 5 })}
                        className={`badge cursor-pointer hover:opacity-80 ${lowStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {p.stock ?? 0} {lowStock && '⚠️'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`badge ${p.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{p.active ? 'Activo' : 'Inactivo'}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openEdit(p)} className="text-blue-600 hover:text-blue-800 mr-3 text-xs font-semibold">Editar</button>
                      <button onClick={() => handleDelete(p.id)} className="text-red-500 hover:text-red-700 text-xs font-semibold">Desactivar</button>
                    </td>
                  </tr>
                );
              })}
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

      {/* Modal crear/editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-lg">{modal.mode === 'create' ? 'Nuevo producto' : 'Editar producto'}</h2>
              <button onClick={() => setModal(null)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                  <input className="input" value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio *</label>
                  <input className="input" type="number" min="0" step="1" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <input className="input" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                  <input className="input" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Ej: Ferretería" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
                  <select className="input" value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
                    {['unidad', 'metro', 'litro', 'kilo', 'caja', 'saco', 'galon', 'rollo', 'pieza'].map(u => <option key={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock actual</label>
                  <input className="input" type="number" min="0" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
                  <input className="input" type="number" min="0" value={form.stock_min} onChange={e => setForm({ ...form, stock_min: e.target.value })} />
                </div>
              </div>
              {error && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Guardando...' : 'Guardar'}</button>
                <button type="button" onClick={() => setModal(null)} className="btn-secondary flex-1">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal actualizar stock rápido */}
      {stockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-lg">Actualizar stock</h2>
              <button onClick={() => setStockModal(null)} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-600">{stockModal.name}</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock actual</label>
                  <input className="input" type="number" min="0" value={stockModal.stock}
                    onChange={e => setStockModal({ ...stockModal, stock: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
                  <input className="input" type="number" min="0" value={stockModal.stock_min}
                    onChange={e => setStockModal({ ...stockModal, stock_min: e.target.value })} />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleStockSave} className="btn-primary flex-1">Guardar</button>
                <button onClick={() => setStockModal(null)} className="btn-secondary flex-1">Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
