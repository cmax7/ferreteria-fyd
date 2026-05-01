import { useState } from 'react';
import { useCart } from '../context/CartContext';
import axios from 'axios';

export default function CartDrawer() {
  const { items, open, setOpen, removeItem, updateQty, total, clearCart, sendToWhatsApp } = useCart();
  const [quoteModal, setQuoteModal] = useState(false);
  const [quoteForm, setQuoteForm] = useState({ customer_name: '', customer_phone: '', customer_email: '', notes: '' });
  const [quoteSent, setQuoteSent] = useState(false);
  const [quoteSending, setQuoteSending] = useState(false);

  const handleQuote = async (e) => {
    e.preventDefault();
    setQuoteSending(true);
    try {
      await axios.post('/api/quotations', {
        ...quoteForm,
        items: items.map(i => ({ product_id: i.id, product_code: i.code, product_name: i.name, quantity: i.qty, unit_price: i.price })),
        valid_days: 7,
      });
      setQuoteSent(true);
      setTimeout(() => { setQuoteSent(false); setQuoteModal(false); setQuoteForm({ customer_name: '', customer_phone: '', customer_email: '', notes: '' }); }, 3000);
    } finally { setQuoteSending(false); }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div className="relative bg-white w-full max-w-md h-full flex flex-col shadow-xl">
        <div className="flex items-center justify-between p-4 border-b bg-dark text-white">
          <h2 className="font-bold text-lg">Tu pedido</h2>
          <button onClick={() => setOpen(false)} className="hover:text-gray-300 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center text-gray-500 py-16">
              <div className="text-5xl mb-3">🛒</div>
              <p>Tu carrito está vacío</p>
            </div>
          ) : items.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{item.name}</p>
                <p className="text-xs text-gray-500">{item.code} · ${item.price.toLocaleString('es-CL')} c/u</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => updateQty(item.id, item.qty - 1)} className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold text-sm">-</button>
                <span className="w-8 text-center text-sm font-semibold">{item.qty}</span>
                <button onClick={() => updateQty(item.id, item.qty + 1)} className="w-7 h-7 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center font-bold text-sm">+</button>
              </div>
              <div className="text-right min-w-[80px]">
                <p className="font-bold text-sm">${(item.price * item.qty).toLocaleString('es-CL')}</p>
                <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600 text-xs">quitar</button>
              </div>
            </div>
          ))}
        </div>

        {items.length > 0 && (
          <div className="p-4 border-t space-y-3">
            <div className="flex justify-between font-bold text-lg">
              <span>Total estimado</span>
              <span className="text-primary">${total.toLocaleString('es-CL')}</span>
            </div>
            <p className="text-xs text-gray-500 text-center">El total puede variar. La ferretería confirmará el pedido.</p>
            <button onClick={sendToWhatsApp} className="w-full btn-primary flex items-center justify-center gap-2 py-3 text-base">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Enviar pedido por WhatsApp
            </button>
            <button onClick={() => setQuoteModal(true)} className="w-full btn-secondary flex items-center justify-center gap-2 py-2.5 text-sm">
              📋 Solicitar cotización formal
            </button>
            <button onClick={clearCart} className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-1">Limpiar carrito</button>
          </div>
        )}
      </div>

      {/* Modal cotización */}
      {quoteModal && (
        <div className="absolute inset-0 z-10 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-bold text-lg">Solicitar cotización</h2>
              <button onClick={() => { setQuoteModal(false); setQuoteSent(false); }} className="text-gray-400 hover:text-gray-700">✕</button>
            </div>
            {quoteSent ? (
              <div className="p-8 text-center">
                <div className="text-5xl mb-3">✅</div>
                <p className="font-bold text-green-700 text-lg">¡Cotización enviada!</p>
                <p className="text-sm text-gray-500 mt-1">La ferretería revisará tu solicitud y te contactará pronto.</p>
              </div>
            ) : (
              <form onSubmit={handleQuote} className="p-5 space-y-4">
                <p className="text-sm text-gray-500">Te contactaremos con los precios y disponibilidad confirmados.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input className="input" required value={quoteForm.customer_name}
                    onChange={e => setQuoteForm({ ...quoteForm, customer_name: e.target.value })}
                    placeholder="Tu nombre completo" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono *</label>
                  <input className="input" required value={quoteForm.customer_phone}
                    onChange={e => setQuoteForm({ ...quoteForm, customer_phone: e.target.value })}
                    placeholder="+56 9 XXXX XXXX" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email (opcional)</label>
                  <input className="input" type="email" value={quoteForm.customer_email}
                    onChange={e => setQuoteForm({ ...quoteForm, customer_email: e.target.value })}
                    placeholder="tu@email.com" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notas (opcional)</label>
                  <input className="input" value={quoteForm.notes}
                    onChange={e => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                    placeholder="Ej: necesito para el lunes, entrega a domicilio..." />
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
                  <strong>{items.length} producto{items.length > 1 ? 's' : ''}</strong> · Total estimado: <strong className="text-primary">${total.toLocaleString('es-CL')}</strong>
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={quoteSending} className="btn-primary flex-1">
                    {quoteSending ? 'Enviando...' : 'Enviar solicitud'}
                  </button>
                  <button type="button" onClick={() => setQuoteModal(false)} className="btn-secondary flex-1">Cancelar</button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
