import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { salesApi } from '../services/salesApi';
import SalesTable from '../components/SalesTable';
import SalesForm from '../components/SalesForm';
import ConfirmModal from '../components/ConfirmModal';
import { PlusCircle, FileSpreadsheet, RefreshCw, DollarSign, Package, Search, Filter, X } from 'lucide-react';

const SalesPage = () => {
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [productFilter, setProductFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableSources, setAvailableSources] = useState([]);
  const [editingSale, setEditingSale] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1, limit: 50 });
  const [metrics, setMetrics] = useState({ revenue: 0, profit: 0, items: 0 });
  
  // Deletion Modal
  const [saleToDelete, setSaleToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const fileInputRef = useRef(null);

  // Debounce search input (400ms delay before hitting server)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch sales from API
  const fetchSales = useCallback(async (page = currentPage) => {
    try {
      setIsRefreshing(true);
      const response = await salesApi.getSales(page, pagination.limit, {
        search: debouncedSearch,
        product: productFilter,
        source: sourceFilter,
        month: selectedMonth
      });
      setSales(response.data);
      setPagination({
        total: response.total,
        totalPages: response.total_pages,
        limit: response.limit
      });
      setMetrics({
        revenue: response.metrics.total_revenue,
        profit: response.metrics.total_profit,
        items: response.metrics.total_items
      });
      setAvailableProducts(response.available_products || []);
      setAvailableSources(response.available_sources || []);
      if (response.data.length > 0) {
        const mostRecent = response.data.reduce((latest, sale) => {
          const timestamp = sale.created_at.endsWith('Z') ? sale.created_at : sale.created_at + 'Z';
          const d = new Date(timestamp);
          return d > latest ? d : latest;
        }, new Date(0));
        setLastUpdated(mostRecent);
      }
      setIsLoading(false);
      setIsRefreshing(false);
    } catch (error) {
      toast.error("Error al cargar las ventas.");
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [currentPage, debouncedSearch, productFilter, sourceFilter, selectedMonth, pagination.limit]);

  useEffect(() => {
    fetchSales(currentPage);
  }, [currentPage, debouncedSearch, productFilter, sourceFilter, selectedMonth]);

  // Handle successful manual record insertion or update
  const handleSaleSaved = () => {
    setIsFormOpen(false);
    setEditingSale(null);
    setCurrentPage(1);
    fetchSales(1);
  };

  // Open the form in 'Edit' mode
  const handleEditClick = (sale) => {
    setEditingSale(sale);
    setIsFormOpen(true);
    // Scroll to top to see the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Delete Action with confirmation Toast
  const handleDeleteClick = (id) => {
    setSaleToDelete(id);
  };

  const confirmDeleteSale = async () => {
    if (!saleToDelete) return;
    setIsDeleting(true);
    try {
      await salesApi.deleteSale(saleToDelete);
      toast.success('Registro eliminado exitosamente');
      setSaleToDelete(null);
      fetchSales();
    } catch (error) {
      toast.error('Error al eliminar el registro');
    } finally {
      setIsDeleting(false);
    }
  };

  // UI/UX: Derived Metrics for the Dashboard
  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Por favor selecciona un archivo .csv válido');
      return;
    }

    try {
      setIsUploading(true);
      const loadingToast = toast.loading('Procesando archivo CSV...');
      
      const response = await salesApi.uploadCsv(file);
      
      toast.dismiss(loadingToast);
      
      if (response.total_imported > 0) {
        toast.success(`¡Éxito! Se importaron ${response.total_imported} ventas nuevas.`);
        fetchSales(); // Recargar tabla
      } else if (response.total_ignored > 0 && response.total_errors === 0) {
        toast.success(`Archivo procesado. ${response.total_ignored} filas ignoradas (no entregadas). No hubo errores.`);
      } else {
        toast.error(`Importación completada con errores. Revisa la consola.`);
      }

      if (response.total_errors > 0) {
        toast.error(`Omitimos ${response.total_errors} filas defectuosas o duplicadas.`);
        console.warn('Detalles de errores CSV:', response.error_details);
      }
      
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.detail || 'Error crítico al subir el archivo CSV.');
    } finally {
      setIsUploading(false);
      // Reset input para permitir subir el mismo archivo otra vez si se corrió
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const hasActiveFilters = debouncedSearch || productFilter || sourceFilter;

  const clearAllFilters = () => {
    setSearchQuery('');
    setDebouncedSearch('');
    setProductFilter('');
    setSourceFilter('');
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: document.querySelector('[data-section="table"]')?.offsetTop - 20 || 0, behavior: 'smooth' });
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="flex flex-col gap-6">

      <ConfirmModal
        isOpen={saleToDelete !== null}
        title="Eliminar Registro de Venta"
        message={
          <>
            ¿Estás seguro que deseas eliminar este registro histórico?<br/><br/>
            Esta acción no se puede deshacer y los montos se descontarán del reporte mensual de inmediato.
          </>
        }
        confirmText="Eliminar Venta"
        cancelText="Conservar"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={confirmDeleteSale}
        onCancel={() => setSaleToDelete(null)}
      />
      
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-gray-100/80">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent tracking-tight">Ventas Entregadas</h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">Gestión centralizada y cálculo automático de utilidades.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 p-1.5 rounded-lg shadow-sm">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-2">Mes:</label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                setSelectedMonth(e.target.value);
                setCurrentPage(1);
              }}
              className="border-none bg-transparent focus:ring-0 text-sm font-bold text-gray-700 py-1"
            />
          </div>

          <button 
            onClick={fetchSales}
            disabled={isRefreshing}
            className="p-2.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50/80 bg-white border border-gray-200 rounded-xl transition-all shadow-sm hover:shadow active:scale-95 disabled:opacity-50 flex items-center justify-center"
            title="Refrescar tabla"
          >
            <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
          </button>
          
          <button 
            disabled={isUploading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-white text-gray-700 font-medium px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm hover:shadow disabled:opacity-50"
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploading ? (
              <span className="w-4 h-4 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></span>
            ) : (
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            )}
            <span className="hidden sm:inline">{isUploading ? 'Procesando...' : 'Importar CSV'}</span>
            <span className="sm:hidden">CSV</span>
          </button>
          
          <input 
            type="file" 
            accept=".csv"
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
          
          <button 
            onClick={() => {
              setEditingSale(null); // Ensure we open a clean form
              setIsFormOpen(!isFormOpen);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-gradient-to-b from-blue-500 to-blue-600 text-white font-medium px-5 py-2.5 rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-md shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30 active:scale-95 border border-blue-600/50"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">{isFormOpen ? 'Cerrar Formulario' : 'Registrar Venta'}</span>
            <span className="sm:hidden">{isFormOpen ? 'Cerrar' : 'Nueva'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition-all hover:shadow-md hover:border-blue-100 group">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 group-hover:scale-110 transition-transform">
            <DollarSign className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Ingresos Totales</p>
            <p className="text-2xl font-bold text-gray-800 tracking-tight">{formatCurrency(metrics.revenue)}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition-all hover:shadow-md hover:purple-100 group">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center group-hover:bg-purple-100 group-hover:scale-110 transition-transform">
            <Package className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Unidades Entregadas</p>
            <p className="text-2xl font-bold text-gray-800 tracking-tight">{metrics.items.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Manual Entry Form Canvas */}
      {isFormOpen && (
        <div className="animate-in fade-in slide-in-from-top-4 duration-300">
          <SalesForm 
            onSuccess={handleSaleSaved} 
            onCancel={() => {
              setIsFormOpen(false);
              setEditingSale(null);
            }} 
            initialData={editingSale} 
          />
        </div>
      )}

      {/* Data Section */}
      <div className="bg-white shadow-sm shadow-gray-200/50 border border-gray-200 rounded-2xl overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-gray-700">Registro de Transacciones</h3>
              {!isLoading && (
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-200/50">
                  {pagination.total} {hasActiveFilters ? 'Filtrados' : 'Entregas'}
                </span>
              )}
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar producto, vendedor, monto..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
              />
            </div>
          </div>

          {/* Filter Dropdowns Row */}
          <div className="flex flex-wrap items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={productFilter}
              onChange={(e) => { setProductFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm cursor-pointer"
            >
              <option value="">Todos los productos</option>
              {availableProducts.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => { setSourceFilter(e.target.value); setCurrentPage(1); }}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-sm cursor-pointer"
            >
              <option value="">Todos los orígenes</option>
              {availableSources.map(s => (
                <option key={s} value={s}>{s.toUpperCase()}</option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100 transition-all active:scale-95"
              >
                <X className="w-3 h-3" />
                Limpiar filtros
              </button>
            )}
          </div>
        </div>
        
        {/* Table wrapper with height constraints for inner scrolling */}
        <div className="relative overflow-hidden">
          <SalesTable 
            sales={sales} 
            isLoading={isLoading} 
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
            lastUpdated={lastUpdated}
            currentPage={currentPage}
            totalPages={pagination.totalPages}
            totalRecords={pagination.total}
            onPageChange={handlePageChange}
            hasActiveFilters={!!hasActiveFilters}
            onClearFilters={clearAllFilters}
          />
        </div>
      </div>
      
    </div>
  );
};

export default SalesPage;
