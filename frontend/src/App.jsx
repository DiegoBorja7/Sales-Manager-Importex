import { Toaster } from 'react-hot-toast'
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import SalesPage from './pages/SalesPage'
import MonthlySummaryPage from './pages/MonthlySummaryPage'
import InventoryPage from './pages/InventoryPage'
import { LayoutDashboard, ReceiptText, Package } from 'lucide-react'

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Toaster position="top-right" />
        
        {/* Header NavBar */}
        <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 border-none">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xl">I</span>
              </div>
              <h1 className="text-xl font-semibold text-gray-900 hidden sm:block">
                Importex <span className="text-gray-500 font-normal">Dashboard</span>
              </h1>
            </div>
            
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
              <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full hidden sm:block">Admin</span>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in duration-300">
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
