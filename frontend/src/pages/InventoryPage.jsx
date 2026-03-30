import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Package, Plus, Save, X, Edit2, RotateCcw, Trash2, AlertCircle, Search, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, RefreshCw, SearchX, History } from 'lucide-react';
import { productApi } from '../services/productApi';
import ConfirmModal from '../components/ConfirmModal';

const InventoryPage = () => {
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Deletion Modal
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Forms
  const [formData, setFormData] = useState({ 
    name: '', sku: '', purchase_price: '', sale_price: '', stock: 0, 
    purchased_by: '', purchase_date: new Date().toISOString().split('T')[0] 
  });
  const [stockDelta, setStockDelta] = useState('');
  const [stockReason, setStockReason] = useState('Ingreso de Bodega');
  const [stockType, setStockType] = useState('add');

  const [isKardexModalOpen, setIsKardexModalOpen] = useState(false);
  const [kardexLog, setKardexLog] = useState([]);
  const [isKardexLoading, setIsKardexLoading] = useState(false);

  // Pagination, Search, Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 50 });

  // UX Enhancement: Close modal forms on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isModalOpen) setIsModalOpen(false);
        if (isStockModalOpen) setIsStockModalOpen(false);
        if (isKardexModalOpen) setIsKardexModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isModalOpen, isStockModalOpen, isKardexModalOpen]);

  // Debounce search input (400ms delay before hitting server)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchProducts = useCallback(async (page = currentPage) => {
    try {
      if (products.length > 0) setIsRefreshing(true);
      const res = await productApi.getProducts(page, pagination.limit, {
        search: debouncedSearch,
        sort: sortOrder
      });
      setProducts(res.data || []);
      setPagination({
        total: res.total || 0,
        totalPages: res.total_pages || 1,
        limit: res.limit || 50
      });
    } catch (err) {
      toast.error('Error al cargar inventario');
      setProducts([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, debouncedSearch, sortOrder, pagination.limit]);

  useEffect(() => {
    fetchProducts(currentPage);
  }, [fetchProducts, currentPage]);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleSortToggle = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    setCurrentPage(1);
  };

  const handleOpenModal = (product = null) => {
    if (product) {
      setSelectedProduct(product);
      setFormData({
        name: product.name,
        sku: product.sku || '',
        purchase_price: product.purchase_price,
        sale_price: product.sale_price,
        stock: product.stock,
        purchased_by: product.purchased_by || '',
        purchase_date: product.purchase_date || new Date().toISOString().split('T')[0],
      });
    } else {
      setSelectedProduct(null);
      setFormData({ 
        name: '', sku: '', purchase_price: '', sale_price: '', stock: 0, 
        purchased_by: '', purchase_date: new Date().toISOString().split('T')[0] 
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenStockModal = (product) => {
    setSelectedProduct(product);
    setStockDelta('');
    setStockReason('Ingreso de Bodega');
    setStockType('add');
    setIsStockModalOpen(true);
  };

  const handleOpenKardex = async (product) => {
    setSelectedProduct(product);
    setIsKardexModalOpen(true);
    setIsKardexLoading(true);
    try {
      const logs = await productApi.getMovements(product.id);
      setKardexLog(logs);
    } catch (err) {
      toast.error('Error al cargar movimientos');
      setKardexLog([]);
    } finally {
      setIsKardexLoading(false);
    }
  };

  const handleSaveProduct = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        sku: formData.sku,
        purchase_price: parseFloat(formData.purchase_price),
        sale_price: parseFloat(formData.sale_price),
        stock: parseInt(formData.stock) || 0,
        purchased_by: formData.purchased_by,
        purchase_date: formData.purchase_date
      };

      if (selectedProduct) {
        // La API no requiere 'stock' en el update (suele ir en otro endpoint), pero lo enviamos. 
        // Eliminamos el stock del payload para evitar sobreescribirlo accidentalmente si el backend lo ignora.
        const { stock, ...updatePayload } = payload;
        await productApi.updateProduct(selectedProduct.id, updatePayload);
        toast.success('Producto actualizado exitosamente');
      } else {
        await productApi.createProduct(payload);
        toast.success('Producto registrado exitosamente');
      }
      setIsModalOpen(false);
      fetchProducts(currentPage);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al guardar el producto');
    }
  };

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    try {
      let qty = parseInt(stockDelta);
      if (isNaN(qty) || qty <= 0) return toast.error('Ingresa una cantidad mayor a 0');
      
      if (stockType === 'remove') {
        qty = -qty;
      }
      
      await productApi.adjustStock(selectedProduct.id, qty, stockReason);
      toast.success(qty > 0 ? 'Stock ingresado' : 'Stock descontado');
      setIsStockModalOpen(false);
      fetchProducts(currentPage);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al actualizar stock');
    }
  };

  const triggerDeleteProduct = (product) => {
    setProductToDelete(product);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);
    try {
      await productApi.deleteProduct(productToDelete.id);
      toast.success('Producto borrado de la base de datos');
      setProductToDelete(null);
      fetchProducts(currentPage);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'No se pudo eliminar el producto');
    } finally {
      setIsDeleting(false);
    }
  };

  const calculateMargin = (purchase, sale) => {
    if (!sale || sale <= 0) return { text: '-', color: 'text-gray-400 bg-gray-50 border-gray-100' };
    const margin = ((sale - purchase) / sale) * 100;
    if (margin >= 30) return { text: `${margin.toFixed(2)}%`, color: 'text-emerald-700 bg-emerald-100/50 font-bold border-emerald-200/60' };
    if (margin >= 15) return { text: `${margin.toFixed(2)}%`, color: 'text-yellow-700 bg-yellow-100/50 font-bold border-yellow-200/60' };
    return { text: `${margin.toFixed(2)}%`, color: 'text-red-700 bg-red-100/50 font-bold border-red-200/60' };
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return <span className="text-gray-300 italic">-</span>;
    try {
      const parts = dateStr.split('-');
      if (parts.length !== 3) return dateStr;
      const date = new Date(parts[0], parseInt(parts[1]) - 1, parts[2]);
      const monthName = date.toLocaleString('es-ES', { month: 'long' });
      return `${parts[2]}-${monthName}-${parts[0]}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      <ConfirmModal
        isOpen={productToDelete !== null}
        title="Eliminar Producto"
        message={
          <>
            ¿Eliminar definitivamente el producto <strong className="text-gray-900">"{productToDelete?.name}"</strong>?<br/><br/>
            Esta acción no se puede deshacer y borrará el producto de la base de datos permanentemente.
          </>
        }
        confirmText="Eliminar Producto"
        cancelText="Conservar"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={confirmDeleteProduct}
        onCancel={() => setProductToDelete(null)}
      />
      
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-gray-100/80">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent tracking-tight">Inventario & Catálogo</h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">Gestión de productos, precios predeterminados y control de stock real.</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => fetchProducts()}
            disabled={isRefreshing}
            className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50/80 bg-white border border-gray-200 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-50 flex items-center justify-center"
            title="Refrescar catálogo"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          
          <button 
            onClick={() => handleOpenModal()}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-gradient-to-b from-blue-500 to-blue-600 text-white font-medium px-5 py-2.5 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 active:scale-95 border border-blue-600/50"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Area */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col hover:border-blue-100 transition-colors">
          <span className="text-gray-500 font-medium text-xs tracking-wider uppercase mb-1">Valor Costo del Inventario</span>
          <span className="text-2xl font-bold text-gray-900">${products.reduce((acc, p) => acc + ((p.stock || 0) * (p.purchase_price || 0)), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col hover:border-blue-100 transition-colors">
          <span className="text-gray-500 font-medium text-xs tracking-wider uppercase mb-1">Unidades Físicas (Stock)</span>
          <span className="text-2xl font-bold text-gray-900">{products.reduce((acc, p) => acc + (p.stock || 0), 0)}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col border-l-4 border-l-emerald-500 hover:border-emerald-500 transition-colors">
          <span className="text-gray-500 font-medium text-xs tracking-wider uppercase mb-1">Ganancia Proyectada</span>
          <span className="text-2xl font-bold text-emerald-600">${products.reduce((acc, p) => acc + (Math.max(0, p.stock || 0) * Math.max(0, (p.sale_price || 0) - (p.purchase_price || 0))), 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white shadow-sm shadow-gray-200/50 border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
        
        {/* Toolbar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex items-center gap-3">
            <h3 className="font-semibold text-gray-700">Catálogo de Productos</h3>
            {!isLoading && (
              <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full border border-emerald-200/50">
                {pagination.total} Unidades
              </span>
            )}
          </div>
          
          <div className="relative w-full sm:w-72 group">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar producto, SKU o comprador..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-10 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 p-0.5 mt-[1px] text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                title="Borrar búsqueda"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table/Content */}
        <div className="overflow-x-auto min-h-[300px]">
          {isLoading ? (
             <div className="flex flex-col items-center justify-center h-64 text-gray-500">
               <span className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></span>
               Cargando inventario...
             </div>
          ) : products.length === 0 ? (
            <div className="w-full h-64 flex flex-col items-center justify-center text-gray-500">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <SearchX className="w-8 h-8 text-gray-400" />
              </div>
              <p className="font-medium">{debouncedSearch ? 'Sin resultados para la búsqueda' : 'No hay productos registrados'}</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left align-middle border-collapse">
              <thead className="bg-gray-50/95 text-xs text-gray-500 uppercase font-semibold border-b border-gray-200">
                <tr>
                  <th 
                    className="px-6 py-4 cursor-pointer hover:bg-gray-100 transition-colors select-none group"
                    onClick={handleSortToggle}
                  >
                    <div className="flex items-center gap-1">
                      Producto
                      {sortOrder === 'desc' ? <ChevronDown className="w-4 h-4 text-blue-500" /> : <ChevronUp className="w-4 h-4 text-blue-500" />}
                    </div>
                  </th>
                  <th className="px-6 py-4">SKU</th>
                  <th className="px-6 py-4">Adquirido Por</th>
                  <th className="px-6 py-4">Fecha Compra</th>
                  <th className="px-6 py-4">Costo Base</th>
                  <th className="px-6 py-4">Venta Base</th>
                  <th className="px-6 py-4">Porcentaje Ganancia</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100/80 bg-white">
                {products.map((prod) => (
                  <tr key={prod.id} className="hover:bg-emerald-50/30 transition-colors group">
                    <td className="px-6 py-4.5 font-semibold text-gray-900 line-clamp-2" title={prod.name}>{prod.name}</td>
                    <td className="px-6 py-4.5 text-gray-500 text-xs">{prod.sku || <span className="text-gray-300 italic">N/A</span>}</td>
                    <td className="px-6 py-4.5 text-gray-600 font-medium">{prod.purchased_by || <span className="text-gray-300 italic">-</span>}</td>
                    <td className="px-6 py-4.5 text-gray-500 text-xs">{formatDate(prod.purchase_date)}</td>
                    <td className="px-6 py-4.5 font-medium">${prod.purchase_price}</td>
                    <td className="px-6 py-4.5 font-medium bg-blue-50/30 text-blue-700">${prod.sale_price}</td>
                    <td className="px-6 py-4.5">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded border ${calculateMargin(prod.purchase_price, prod.sale_price).color}`}>
                        {calculateMargin(prod.purchase_price, prod.sale_price).text}
                      </span>
                    </td>
                    <td className="px-6 py-4.5">
                      {prod.stock <= 0 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide bg-red-50 text-red-600 border border-red-200/60 shadow-sm">
                          <AlertCircle className="w-3.5 h-3.5" /> AGOTADO
                        </span>
                      ) : prod.stock <= 5 ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide bg-orange-50 text-orange-600 border border-orange-200/60 shadow-sm">
                          BAJO STOCK ({prod.stock})
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide bg-emerald-50 text-emerald-600 border border-emerald-200/60 shadow-sm">
                          EN STOCK ({prod.stock})
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4.5 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-100 transition-all duration-200">
                        <button onClick={() => handleOpenKardex(prod)} className="p-2 text-indigo-600 hover:bg-indigo-100/80 bg-indigo-50 md:bg-transparent rounded-xl transition-colors active:scale-95" title="Ver Historial Kardex">
                          <History className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleOpenStockModal(prod)} className="p-2 text-emerald-600 hover:bg-emerald-100/80 bg-emerald-50 md:bg-transparent rounded-xl transition-colors active:scale-95" title="Ajustar Stock" >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleOpenModal(prod)} className="p-2 text-blue-600 hover:bg-blue-100/80 bg-blue-50 md:bg-transparent rounded-xl transition-colors active:scale-95" title="Editar Producto">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => triggerDeleteProduct(prod)} className="p-2 text-red-500 hover:bg-red-100/80 bg-red-50 md:bg-transparent rounded-xl transition-colors active:scale-95" title="Eliminar Producto">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Pagination */}
        {products.length > 0 && (
          <div className="bg-gray-50/80 px-6 py-4 border-t border-gray-200 text-xs text-gray-500 backdrop-blur-sm">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <span className="font-medium">
                Mostrando página <strong className="text-gray-900">{currentPage}</strong> de <strong className="text-gray-900">{pagination.totalPages}</strong> ({pagination.total} productos)
              </span>

              {pagination.totalPages > 1 && (
                <div className="flex justify-center items-center gap-1.5">
                  <button onClick={() => handlePageChange(1)} disabled={currentPage <= 1} className="flex items-center gap-0.5 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm">
                    <ChevronsLeft className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage <= 1} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm">
                    <ChevronLeft className="w-3.5 h-3.5" /> Ant.
                  </button>
                  <div className="flex items-center gap-1 hidden sm:flex">
                    {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                      let pageNum = Object.is(pagination.totalPages, NaN) ? 1 : i + 1;
                      if(pagination.totalPages > 5 && currentPage > 3) {
                         pageNum = Math.min(currentPage - 2 + i, pagination.totalPages - 4 + i);
                      }
                      return (
                        <button key={pageNum} onClick={() => handlePageChange(pageNum)} className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${pageNum === currentPage ? 'bg-blue-600 text-white shadow-md border-blue-700' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50' }`}>
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage >= pagination.totalPages} className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm">
                    Sig. <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handlePageChange(pagination.totalPages)} disabled={currentPage >= pagination.totalPages} className="flex items-center gap-0.5 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm">
                    <ChevronsRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Form Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                {selectedProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-red-500"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveProduct} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre <span className="text-red-500">*</span></label>
                <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                {!selectedProduct && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock Inicial</label>
                    <input type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adquirido Por 👀</label>
                  <input type="text" value={formData.purchased_by} onChange={e => setFormData({...formData, purchased_by: e.target.value})} placeholder="Ej: Diego B." className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Compra</label>
                  <input type="date" value={formData.purchase_date} onChange={e => setFormData({...formData, purchase_date: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Costo Base ($) <span className="text-red-500">*</span></label>
                  <input required type="number" step="0.01" min="0" value={formData.purchase_price} onChange={e => setFormData({...formData, purchase_price: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Venta Base ($) <span className="text-red-500">*</span></label>
                  <input required type="number" step="0.01" min="0" value={formData.sale_price} onChange={e => setFormData({...formData, sale_price: e.target.value})} className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-semibold py-2.5 rounded-xl hover:bg-blue-700 transition">Guadar Producto</button>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isStockModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 line-clamp-1 pr-4" title={selectedProduct?.name}>Stock: {selectedProduct?.name}</h3>
              <button onClick={() => setIsStockModalOpen(false)} className="text-gray-400 hover:text-red-500 shrink-0"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAdjustStock} className="p-5 space-y-4">
              <div className="flex bg-gray-100/50 p-1.5 rounded-xl border border-gray-200/60">
                <button type="button" onClick={() => setStockType('add')} className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${stockType === 'add' ? 'bg-white text-emerald-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>Ingreso</button>
                <button type="button" onClick={() => setStockType('remove')} className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-all ${stockType === 'remove' ? 'bg-white text-red-600 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}>Salida</button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Concepto del Movimiento</label>
                <select value={stockReason} onChange={(e) => setStockReason(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
                  {stockType === 'add' ? (
                    <>
                      <option value="Ingreso por Compra/Bodega">Ingreso por Compra/Bodega</option>
                      <option value="Ajuste de Conteo (+)">Ajuste de Conteo (+)</option>
                      <option value="Devolución de Cliente">Devolución de Cliente</option>
                    </>
                  ) : (
                    <>
                      <option value="Venta Física Manual">Venta Física Manual</option>
                      <option value="Baja por Merma/Daño">Baja por Merma/Daño</option>
                      <option value="Ajuste de Conteo (-)">Ajuste de Conteo (-)</option>
                      <option value="Devolución al Proveedor">Devolución al Proveedor</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad Física (Unidades)</label>
                <input required type="number" min="1" placeholder="Ej: 5" value={stockDelta} onChange={e => setStockDelta(e.target.value)} className="w-full border border-gray-200 rounded-xl px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <button type="submit" className={`w-full text-white font-semibold py-2.5 rounded-xl transition shadow-sm ${stockType === 'add' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20' : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'}`}>Guardar Movimiento</button>
            </form>
          </div>
        </div>
      )}

      {/* Kardex Modal */}
      {isKardexModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="flex justify-between items-center p-5 border-b border-gray-100">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-indigo-600" /> Historial de Movimientos
                </h3>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-1" title={selectedProduct?.name}>{selectedProduct?.name}</p>
              </div>
              <button onClick={() => setIsKardexModalOpen(false)} className="text-gray-400 hover:text-red-500 self-start mt-1"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-0 flex-1">
              {isKardexLoading ? (
                <div className="p-10 flex flex-col items-center justify-center text-gray-500">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-3"></div>
                  <span>Cargando bitácora...</span>
                </div>
              ) : kardexLog.length === 0 ? (
                <div className="p-10 flex flex-col items-center justify-center text-gray-400">
                  <History className="w-12 h-12 text-gray-200 mb-3" />
                  <span>No hay movimientos logueados para este producto.</span>
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold sticky top-0 border-b border-gray-200 shadow-sm">
                    <tr>
                      <th className="px-5 py-3.5">Fecha y Hora</th>
                      <th className="px-5 py-3.5">Operación</th>
                      <th className="px-5 py-3.5">Concepto Autorizado</th>
                      <th className="px-5 py-3.5 text-right">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {kardexLog.map(log => (
                      <tr key={log.id} className="hover:bg-indigo-50/30 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap text-gray-500 text-xs font-medium">{new Date(log.created_at).toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                        <td className="px-5 py-3">
                          {log.quantity > 0 
                            ? <span className="text-[10px] font-bold px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-md border border-emerald-200 shadow-sm">ENTRADA</span>
                            : <span className="text-[10px] font-bold px-2.5 py-1 bg-red-100 text-red-700 rounded-md border border-red-200 shadow-sm">SALIDA</span>
                          }
                        </td>
                        <td className="px-5 py-3 font-medium text-gray-700">{log.reason}</td>
                        <td className={`px-5 py-3 text-right font-bold text-lg ${log.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {log.quantity > 0 ? `+${log.quantity}` : log.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl text-right">
              <button onClick={() => setIsKardexModalOpen(false)} className="px-5 py-2 bg-white border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm">Cerrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryPage;
