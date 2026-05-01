import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useCart } from '../context/CartContext';

const PRODUCT_IMAGES = {
  CLV001: '/products/nail.jpg',
  CLV002: '/products/nail.jpg',
  TOR001: '/products/screw.jpg',
  TOR002: '/products/screw.jpg',
  TOR003: '/products/screw.jpg',
  PIN001: '/products/paint_white.jpg',
  PIN002: '/products/paint_white.jpg',
  PIN003: '/products/paint_can.jpg',
  PIN004: '/products/paint_can.jpg',
  CAB001: '/products/cable.jpg',
  CAB002: '/products/cable.jpg',
  CAB003: '/products/wire.jpg',
  TUB001: '/products/pvc_pipe.jpg',
  TUB002: '/products/pvc_pipe.jpg',
  TUB003: '/products/pvc_pipe.jpg',
  CEM001: '/products/cement.jpg',
  ARE001: '/products/sand.jpg',
  LAD001: '/products/brick.jpg',
  MAR001: '/products/hammer.jpg',
  DES001: '/products/screwdriver.jpg',
  DES002: '/products/screwdriver.jpg',
  LLA001: '/products/wrench.jpg',
  LLA002: '/products/wrench.jpg',
  MAS001: '/products/sandpaper.jpg',
  LIJ001: '/products/sandpaper.jpg',
  LIJ002: '/products/sandpaper.jpg',
  CIN001: '/products/tape.jpg',
  INT001: '/products/switch.jpg',
  ENC001: '/products/plug.jpg',
  LLH001: '/products/valve.jpg',
};

const CATEGORY_IMAGES = {
  'Ferretería':   '/products/nail.jpg',
  'Pinturas':     '/products/paint_white.jpg',
  'Eléctrico':    '/products/cable.jpg',
  'Plomería':     '/products/pvc_pipe.jpg',
  'Construcción': '/products/cement.jpg',
  'Herramientas': '/products/hammer.jpg',
};

function getImage(product) {
  return PRODUCT_IMAGES[product.code]
    || CATEGORY_IMAGES[product.category]
    || '/products/hammer.jpg';
}

function ProductCard({ product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const imgSrc = getImage(product);

  const handleAdd = () => {
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="card flex flex-col gap-2 hover:shadow-md transition-all hover:-translate-y-0.5 p-0 overflow-hidden">
      <div className="h-36 w-full overflow-hidden bg-gray-100 rounded-t-xl">
        {!imgError ? (
          <img
            src={imgSrc}
            alt={product.name}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl bg-gray-100">🔩</div>
        )}
      </div>
      <div className="px-3 pb-1">
      <div className="flex-1">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-gray-400 font-mono">{product.code}</span>
          {product.category && <span className="badge bg-green-100 text-green-700">{product.category}</span>}
        </div>
        <h3 className="font-semibold text-sm mt-1 leading-tight">{product.name}</h3>
        {product.description && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{product.description}</p>}
      </div>
      <div className="flex items-center justify-between mt-1">
        <div>
          <p className="font-bold text-primary text-lg">${product.price.toLocaleString('es-CL')}</p>
          <p className="text-xs text-gray-400">{product.unit}</p>
        </div>
        <button onClick={handleAdd} className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${added ? 'bg-green-500 text-white' : 'btn-primary'}`}>
          {added ? '✓ Agregado' : '+ Agregar'}
        </button>
      </div>
      </div>
    </div>
  );
}

export default function Catalog() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchCategories = useCallback(async () => {
    const { data } = await axios.get('/api/products/categories');
    setCategories(data);
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get('/api/products', { params: { search, category, page, limit: 24 } });
      setProducts(data.products);
      setPages(data.pages);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [search, category, page]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
  useEffect(() => { setPage(1); }, [search, category]);
  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-dark to-dark-light text-white rounded-2xl p-6 mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Catálogo de Productos</h1>
          <p className="text-gray-300 mt-1">Ferretería FyD · Romeral, Chile</p>
          <p className="text-sm text-gray-400 mt-1">{total} productos disponibles</p>
        </div>
        <div className="text-7xl opacity-20">🔧</div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="input pl-10"
            placeholder="Buscar por nombre o código..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-48" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center py-20"><div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full"></div></div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-3">🔍</div>
          <p>No se encontraron productos</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {products.map(p => <ProductCard key={p.id} product={p} />)}
        </div>
      )}

      {/* Paginación */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40">← Anterior</button>
          <span className="px-4 py-1.5 text-sm text-gray-600">Página {page} de {pages}</span>
          <button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page === pages} className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-40">Siguiente →</button>
        </div>
      )}
    </div>
  );
}
