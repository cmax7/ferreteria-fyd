import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Navbar';
import CartDrawer from './components/CartDrawer';
import ProtectedRoute from './components/ProtectedRoute';
import Catalog from './pages/Catalog';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/admin/Dashboard';
import Products from './pages/admin/Products';
import Invoices from './pages/admin/Invoices';
import InvoiceForm from './pages/admin/InvoiceForm';
import Quotations from './pages/admin/Quotations';

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <Navbar />
          <CartDrawer />
          <main>
            <Routes>
              <Route path="/" element={<Catalog />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/admin" element={<ProtectedRoute role="employee"><Dashboard /></ProtectedRoute>} />
              <Route path="/admin/products" element={<ProtectedRoute role="employee"><Products /></ProtectedRoute>} />
              <Route path="/admin/invoices" element={<ProtectedRoute role="employee"><Invoices /></ProtectedRoute>} />
              <Route path="/admin/invoices/new" element={<ProtectedRoute role="employee"><InvoiceForm /></ProtectedRoute>} />
              <Route path="/admin/quotations" element={<ProtectedRoute role="employee"><Quotations /></ProtectedRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
