import { useState, useEffect, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import { salesApi } from '../services/salesApi';
import SalesTable from '../components/SalesTable';
import SalesForm from '../components/SalesForm';
import { PlusCircle, FileSpreadsheet, RefreshCw, TrendingUp, DollarSign, Package, Search } from 'lucide-react';

const SalesPage = () => {
  const [sales, setSales] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSale, setEditingSale] = useState(null); // Tracks the sale being edited
  
  const fileInputRef = useRef(null);

  // Fetch sales on component mount
  const fetchSales = async () => {
    try {
      setIsRefreshing(true);
      // Fetch real data from FastAPI
      const data = await salesApi.getSales();
      setSales(data);
      setIsLoading(false);
      setIsRefreshing(false);
      
    } catch (error) {
      toast.error("Error al cargar las ventas.");
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  // Handle successful manual record insertion or update
  const handleSaleSaved = () => {
    setIsFormOpen(false);
    setEditingSale(null);
    fetchSales(); // Refresh the list from the DB
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
    toast((t) => (
      <div className="flex flex-col gap-3">
        <span className="font-medium text-gray-800">¿Estás seguro de eliminar este registro?</span>
        <div className="flex gap-2 justify-end">
          <button 
            className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors"
            onClick={() => toast.dismiss(t.id)}
          >
            Cancelar
          </button>
          <button 
            className="px-3 py-1.5 text-xs bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors font-medium shadow-sm"
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                const loadingToast = toast.loading('Eliminando...');
                await salesApi.deleteSale(id);
                toast.dismiss(loadingToast);
                toast.success('Registro eliminado exitosamente');
                fetchSales();
              } catch (error) {
                toast.error('Error al eliminar el registro');
              }
            }}
          >
            Sí, eliminar
          </button>
        </div>
      </div>
    ), { 
      duration: 5000, 
      position: 'top-center',
      style: { minWidth: '300px' }
    });
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

  // UI/UX: Derived Metrics for the Dashboard
  const metrics = useMemo(() => {
    if (!sales.length) return { revenue: 0, profit: 0, items: 0 };
    return sales.reduce((acc, sale) => ({
      revenue: acc.revenue + Number(sale.sale_price || 0),
      profit: acc.profit + Number(sale.profit || 0),
      items: acc.items + Number(sale.quantity || 0)
    }), { revenue: 0, profit: 0, items: 0 });
  }, [sales]);

  // UI/UX: Search Filter
  const filteredSales = useMemo(() => {
    if (!searchQuery) return sales;
    const lowerQuery = searchQuery.toLowerCase();
    return sales.filter(s => 
      s.product_name?.toLowerCase().includes(lowerQuery) || 
      s.seller?.toLowerCase().includes(lowerQuery)
    );
  }, [sales, searchQuery]);

  const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  return (
    <div className="flex flex-col gap-6">
      
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-sm border border-gray-100/80">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent tracking-tight">Ventas Entregadas</h2>
          <p className="text-sm text-gray-500 mt-1 font-medium">Gestión centralizada y cálculo automático de utilidades.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition-all hover:shadow-md hover:border-blue-100 group">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 group-hover:scale-110 transition-transform">
            <DollarSign className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Ingresos Totales</p>
            <p className="text-2xl font-bold text-gray-800 tracking-tight">{formatCurrency(metrics.revenue)}</p>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 transition-all hover:shadow-md hover:emerald-100 group">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500">Ganancia Neta</p>
            <p className="text-2xl font-bold text-emerald-600 tracking-tight">{formatCurrency(metrics.profit)}</p>
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
        <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
             <h3 className="font-semibold text-gray-700">Registro de Transacciones</h3>
             {!isLoading && sales.length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full border border-blue-200/50">
                  {sales.length} Entregas
                </span>
             )}
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Buscar por producto..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
            />
          </div>
        </div>
        
        {/* Table wrapper with height constraints for inner scrolling */}
        <div className="relative overflow-hidden">
          <SalesTable 
            sales={filteredSales} 
            isLoading={isLoading} 
            onEdit={handleEditClick}
            onDelete={handleDeleteClick}
          />
        </div>
      </div>
      
    </div>
  );
};

export default SalesPage;
