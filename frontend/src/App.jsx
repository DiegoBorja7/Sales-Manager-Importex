import { useState, useRef } from 'react'
import { Toaster, toast } from 'react-hot-toast'
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import SalesPage from './pages/SalesPage'
import MonthlySummaryPage from './pages/MonthlySummaryPage'
import InventoryPage from './pages/InventoryPage'
import { LayoutDashboard, ReceiptText, Package, FileSpreadsheet } from 'lucide-react'
import { salesApi } from './services/salesApi'

function App() {
  const [isUploading, setIsUploading] = useState(false);
  const [csvErrors, setCsvErrors] = useState([]);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast.error('Por favor selecciona un archivo .csv válido');
      return;
    }

    try {
      setIsUploading(true);
      const loadingToast = toast.loading('Procesando archivo CSV global...');
      
      const response = await salesApi.uploadCsv(file);
      
      toast.dismiss(loadingToast);
      
      if (response.total_imported > 0) {
        toast.success(`¡Éxito! Se importaron ${response.total_imported} ventas nuevas.`);
        if (response.total_errors === 0) setTimeout(() => window.location.reload(), 1500);
      } else if (response.total_ignored > 0 && response.total_errors === 0) {
        toast.success(`Archivo procesado. ${response.total_ignored} filas ignoradas. Sin errores.`);
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error(`Importación completada con errores.`);
      }

      if (response.total_errors > 0) {
        toast.error(`Se omitieron ${response.total_errors} fila(s) con errores.`);
        setCsvErrors(response.error_details || []);
      } else {
        setCsvErrors([]);
      }
      
    } catch (error) {
      toast.dismiss();
      toast.error(error.response?.data?.detail || 'Error crítico al subir el archivo CSV.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Toaster position="top-right" />
        
        {/* Header NavBar */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <a href="/" title="Recargar Dashboard" className="flex items-center gap-2 border-none cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <span className="text-white font-bold text-xl">I</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 hidden sm:block tracking-tight">
                Importex <span className="text-gray-500 font-normal">Dashboard</span>
              </h1>
            </a>
            
            <nav className="flex bg-gray-100 p-1 rounded-lg">
              <NavLink
                to="/resumen"
                className={({ isActive }) => `flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
              >
                <ReceiptText className="w-4 h-4" />
                <span className="hidden sm:block">Resumen Financiero</span>
              </NavLink>

              <NavLink
                to="/ventas"
                className={({ isActive }) => `flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span className="hidden sm:block">Ventas</span>
              </NavLink>

              <NavLink
                to="/inventario"
                className={({ isActive }) => `flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive
                    ? 'bg-white text-emerald-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                }`}
              >
                <Package className="w-4 h-4" />
                <span className="hidden sm:block">Inventario</span>
              </NavLink>
            </nav>

            <div className="flex items-center gap-4">
              <button 
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-medium px-4 py-2 rounded-lg hover:from-emerald-600 hover:to-emerald-700 transition-all shadow-sm active:scale-95 disabled:opacity-70 border border-emerald-600"
              >
                {isUploading ? (
                  <span className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-4 h-4" />
                )}
                <span className="hidden sm:block text-sm">☁️ Importar CSV</span>
              </button>
              
              <input 
                type="file" 
                accept=".csv"
                className="hidden" 
                ref={fileInputRef}
                onChange={handleFileUpload}
              />

              <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1.5 rounded-full hidden sm:block border border-gray-200">Admin</span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
          
          {/* Panel de Errores CSV Global */}
          {csvErrors.length > 0 && (
            <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 flex flex-col gap-3 mb-6 shadow-sm animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <h3 className="font-bold text-rose-800 text-sm">Errores detectados al importar CSV ({csvErrors.length} fila{csvErrors.length !== 1 ? 's' : ''})</h3>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      setCsvErrors([]);
                      window.location.reload();
                    }}
                    className="text-white hover:bg-rose-700 bg-rose-600 transition-colors text-xs font-semibold px-4 py-1.5 rounded-md shadow-sm"
                  >
                    Entendido (Recargar Aplicación)
                  </button>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto pr-1">
                {csvErrors.map((err, i) => (
                  <div key={i} className="flex items-start gap-3 bg-white border border-rose-100 rounded-lg px-3 py-2">
                    <span className="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-md whitespace-nowrap mt-0.5">Fila #{err.fila}</span>
                    <span className="text-xs text-rose-700 flex-1">{err.error}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Routes>
            <Route path="/" element={<Navigate to="/resumen/global" replace />} />
            <Route path="/ventas" element={<SalesPage />} />
            <Route path="/resumen" element={<Navigate to="/resumen/global" replace />} />
            <Route path="/resumen/:sourceTab" element={<MonthlySummaryPage />} />
            <Route path="/inventario" element={<InventoryPage />} />
            <Route path="*" element={<Navigate to="/resumen/global" replace />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
