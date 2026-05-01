import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

function StatCard({ title, value, sub, color, icon }) {
  return (
    <div className={`card border-l-4 ${color} flex items-center gap-4`}>
      <div className="text-3xl">{icon}</div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function MiniBar({ label, value, max, revenue }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  const month = label.slice(5);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-8 shrink-0">{month}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-600 w-28 text-right">${revenue.toLocaleString('es-CL')}</span>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  const quickLinks = [
    { title: 'Nueva Factura', icon: '➕', link: '/admin/invoices/new', color: 'bg-green-50 border-green-200' },
    { title: 'Cotizaciones', icon: '📋', link: '/admin/quotations', color: 'bg-blue-50 border-blue-200' },
    { title: 'Productos', icon: '🔩', link: '/admin/products', color: 'bg-purple-50 border-purple-200' },
    { title: 'Todas las Facturas', icon: '🧾', link: '/admin/invoices', color: 'bg-yellow-50 border-yellow-200' },
  ];

  if (loading) return (
    <div className="flex justify-center py-20"><div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div></div>
  );

  const tm = data?.thisMonth || {};
  const maxRevenue = Math.max(...(data?.monthlyRevenue || []).map(m => m.revenue), 1);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Panel de Administración</h1>
        <p className="text-gray-500 mt-0.5">Bienvenido, {user?.name} · {new Date().toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* Alertas */}
      {data?.lowStockCount > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-semibold text-orange-800">{data.lowStockCount} producto{data.lowStockCount > 1 ? 's' : ''} con stock bajo</p>
            <p className="text-sm text-orange-600">{data.lowStockProducts.slice(0, 3).map(p => p.name).join(', ')}{data.lowStockCount > 3 ? ` y ${data.lowStockCount - 3} más` : ''}.</p>
            <Link to="/admin/products" className="text-xs text-orange-700 font-semibold underline mt-1 inline-block">Ver en gestión de productos →</Link>
          </div>
        </div>
      )}
      {data?.pendingQuotations > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl">📋</span>
          <div>
            <p className="font-semibold text-blue-800">{data.pendingQuotations} cotización{data.pendingQuotations > 1 ? 'es' : ''} pendiente{data.pendingQuotations > 1 ? 's' : ''} de revisar</p>
            <p className="text-sm text-blue-600">Clientes esperan respuesta a sus solicitudes de cotización.</p>
            <Link to="/admin/quotations" className="text-xs text-blue-700 font-semibold underline mt-1 inline-block">Ver cotizaciones →</Link>
          </div>
        </div>
      )}

      {/* Stats del mes */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Ventas este mes" value={`$${(tm.sales_total || 0).toLocaleString('es-CL')}`} sub={`${tm.sales_count || 0} facturas`} color="border-green-500" icon="📈" />
        <StatCard title="Compras este mes" value={`$${(tm.purchase_total || 0).toLocaleString('es-CL')}`} sub={`${tm.purchase_count || 0} facturas`} color="border-blue-500" icon="📦" />
        <StatCard title="Cotiz. pendientes" value={data?.pendingQuotations || 0} sub="Sin responder" color="border-yellow-500" icon="📋" />
        <StatCard title="Stock bajo" value={data?.lowStockCount || 0} sub="Productos a reponer" color={data?.lowStockCount > 0 ? "border-red-500" : "border-gray-300"} icon="⚠️" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Gráfico ventas mensuales */}
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-4">Ventas últimos 6 meses</h2>
          {data?.monthlyRevenue?.length > 0 ? (
            <div className="space-y-3">
              {data.monthlyRevenue.map(m => (
                <MiniBar key={m.month} label={m.month} value={m.revenue} max={maxRevenue} revenue={m.revenue} />
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Sin ventas registradas aún</p>
          )}
        </div>

        {/* Top productos */}
        <div className="card">
          <h2 className="font-bold text-gray-800 mb-4">Productos más vendidos este mes</h2>
          {data?.topProducts?.length > 0 ? (
            <div className="space-y-3">
              {data.topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.product_name}</p>
                    <p className="text-xs text-gray-400">{p.total_qty} unidades</p>
                  </div>
                  <span className="text-sm font-bold text-primary">${p.total_revenue.toLocaleString('es-CL')}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Sin ventas este mes</p>
          )}
        </div>

        {/* Últimas facturas */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">Últimas facturas</h2>
            <Link to="/admin/invoices" className="text-xs text-primary font-semibold hover:underline">Ver todas →</Link>
          </div>
          {data?.recentInvoices?.length > 0 ? (
            <div className="space-y-2">
              {data.recentInvoices.map(inv => (
                <div key={inv.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <span className={`badge ${inv.type === 'sale' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                    {inv.type === 'sale' ? 'Venta' : 'Compra'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{inv.customer_name || inv.supplier_name || 'Sin nombre'}</p>
                    <p className="text-xs text-gray-400">{inv.date}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">${inv.total.toLocaleString('es-CL')}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Sin facturas aún</p>
          )}
        </div>

        {/* Últimas cotizaciones */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-800">Últimas cotizaciones</h2>
            <Link to="/admin/quotations" className="text-xs text-primary font-semibold hover:underline">Ver todas →</Link>
          </div>
          {data?.recentQuotations?.length > 0 ? (
            <div className="space-y-2">
              {data.recentQuotations.map(q => (
                <div key={q.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <span className={`badge text-xs ${
                    q.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    q.status === 'converted' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-600'}`}>
                    {q.status === 'pending' ? 'Pendiente' : q.status === 'converted' ? 'Convertida' : 'Rechazada'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{q.customer_name || 'Sin nombre'}</p>
                    <p className="text-xs text-gray-400">{q.date}</p>
                  </div>
                  <span className="text-sm font-bold text-primary">${q.total.toLocaleString('es-CL')}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm text-center py-8">Sin cotizaciones aún</p>
          )}
        </div>
      </div>

      {/* Accesos rápidos */}
      <div>
        <h2 className="font-bold text-gray-800 mb-3">Accesos rápidos</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {quickLinks.map(c => (
            <Link key={c.title} to={c.link} className={`card border-2 ${c.color} hover:shadow-md transition-all hover:-translate-y-0.5 flex flex-col gap-2 text-center items-center py-4`}>
              <div className="text-3xl">{c.icon}</div>
              <p className="font-bold text-gray-800 text-sm">{c.title}</p>
            </Link>
          ))}
        </div>
      </div>

    </div>
  );
}
