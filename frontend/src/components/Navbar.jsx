import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count, setOpen } = useCart();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/'); };

  return (
    <nav className="bg-dark text-white shadow-lg sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-2xl">🔧</span>
          <span>Ferretería <span className="text-primary">FyD</span></span>
        </Link>

        <div className="flex items-center gap-4">
          <Link to="/" className="text-gray-300 hover:text-white text-sm transition-colors">Catálogo</Link>

          {user?.role === 'employee' && (
            <>
              <Link to="/admin" className="text-gray-300 hover:text-white text-sm transition-colors">Panel Admin</Link>
              <Link to="/admin/quotations" className="text-gray-300 hover:text-white text-sm transition-colors">Cotizaciones</Link>
            </>
          )}

          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-gray-300 text-sm hidden sm:block">Hola, {user.name.split(' ')[0]}</span>
              <button onClick={handleLogout} className="text-gray-300 hover:text-red-400 text-sm transition-colors">Salir</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="text-gray-300 hover:text-white text-sm transition-colors">Ingresar</Link>
              <Link to="/register" className="btn-primary text-sm py-1.5 px-3">Registrarse</Link>
            </div>
          )}

          {user?.role !== 'employee' && (
            <button onClick={() => setOpen(true)} className="relative p-2 hover:bg-dark-light rounded-lg transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2 8m12-8l2 8M9 21a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2z" />
              </svg>
              {count > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{count}</span>
              )}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
