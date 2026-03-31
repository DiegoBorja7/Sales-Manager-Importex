import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { TrendingUp, TrendingDown, Package, AlertCircle, ShoppingCart, Loader2, Plus, Edit2, Trash2, ReceiptText, Globe, ShoppingBag, Store, HelpCircle, ArrowUpDown, Search, Filter, Settings, Activity, ChevronDown } from 'lucide-react';
import ExpenseForm from '../components/ExpenseForm';
import ConfirmModal from '../components/ConfirmModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const KpiWidget = ({ title, value, icon: Icon, gradient, children, ring }) => (
  <div className={`bg-gradient-to-br ${gradient} rounded-xl shadow-md p-5 text-white transform transition hover:-translate-y-1 hover:shadow-lg ${ring}`}>
    <div className="flex items-center justify-between opacity-80 mb-2">
      <span className="text-sm font-semibold tracking-wider">{title}</span>
      <Icon className="w-5 h-5" />
    </div>
    <div className="text-3xl font-extrabold">{value}</div>
    {children}
  </div>
);

const MonthlySummaryPage = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  // 'global' | 'csv' | 'manual'
  const { sourceTab } = useParams();
  const navigate = useNavigate();
  const activeTab = sourceTab || 'global';

  const [summaryData, setSummaryData] = useState([]);
  const [totalData, setTotalData] = useState(null);
  const [expensesList, setExpensesList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [availableProducts, setAvailableProducts] = useState([]);
  
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState(null);

  // Deletion Modal State
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Filtering and Search for Expenses
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas');
  
  // UI State
  const [isExpensesOpen, setIsExpensesOpen] = useState(true);

  // Sorting Configuration: { key, direction }
  const [sortConfig, setSortConfig] = useState({ key: 'ventas', direction: 'desc' });

  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const sourceQuery = activeTab === 'global' ? '' : `&source=${activeTab}`;
      const [productsRes, totalRes, expensesRes] = await Promise.all([
        axios.get(`${API_URL}/api/summary/monthly?month=${selectedMonth}${sourceQuery}`),
        axios.get(`${API_URL}/api/summary/monthly-total?month=${selectedMonth}${sourceQuery}`),
        axios.get(`${API_URL}/api/expenses?month=${selectedMonth}${sourceQuery}`)
      ]);
      setSummaryData(productsRes.data);
      setTotalData(totalRes.data);
      setExpensesList(expensesRes.data);
      
      const prodNames = productsRes.data
        .map(p => p.product_name)
        .filter(name => name && !name.includes('Gastos Generales'));
      
      setAvailableProducts(prodNames);
    } catch (error) {
      console.error("Error fetching summary:", error);
      toast.error("Error al cargar el resumen mensual.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (key) => {
    let direction = 'desc';
    if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = 'asc';
    }
    setSortConfig({ key, direction });
  };

  const sortedSummaryData = React.useMemo(() => {
    let sortableData = [...summaryData];
    if (sortConfig.key) {
      sortableData.sort((a, b) => {
        // Ignorar "Gastos Generales" al final siempre
        if (a.product_name.includes('Gastos Generales')) return 1;
        if (b.product_name.includes('Gastos Generales')) return -1;

        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Calcular porcentajes dinámicos si la llave es margen o participacion
        if (sortConfig.key === 'margen') {
           aValue = a.ventas > 0 ? a.utilidad / a.ventas : 0;
           bValue = b.ventas > 0 ? b.utilidad / b.ventas : 0;
        } else if (sortConfig.key === 'participacion') {
           aValue = totalData?.utilidad_real > 0 ? a.utilidad / totalData.utilidad_real : 0;
           bValue = totalData?.utilidad_real > 0 ? b.utilidad / totalData.utilidad_real : 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableData;
  }, [summaryData, sortConfig, totalData]);

  // --- Expenses Intelligence ---
  const expenseSummary = React.useMemo(() => {
    return expensesList.reduce((acc, exp) => {
      const cat = exp.category;
      const amt = parseFloat(exp.amount) || 0;
      acc[cat] = (acc[cat] || 0) + amt;
      acc.total = (acc.total || 0) + amt;
      return acc;
    }, { total: 0 });
  }, [expensesList]);

  const filteredExpenses = React.useMemo(() => {
    return expensesList.filter(exp => {
      const matchesSearch = 
        (exp.product_name?.toLowerCase().includes(searchTerm.toLowerCase())) || 
        (exp.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (exp.category.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesCategory = filterCategory === 'Todas' || exp.category === filterCategory;
      
      return matchesSearch && matchesCategory;
    });
  }, [expensesList, searchTerm, filterCategory]);

  const expenseCategories = React.useMemo(() => {
    const cats = new Set(expensesList.map(e => e.category));
    return ['Todas', ...Array.from(cats)];
  }, [expensesList]);

  const calculateROI = (amount, productName) => {
    if (!productName) return null;
    const product = summaryData.find(p => p.product_name === productName);
    if (!product || product.ventas === 0) return null;
    return ((amount / product.ventas) * 100).toFixed(1);
  };

  const getCategoryTheme = (cat) => {
    const c = cat.toLowerCase();
    if (c.includes('log')) return { badge: 'bg-slate-100 text-slate-700 border-slate-200', bar: 'bg-slate-500' };
    if (c.includes('prov')) return { badge: 'bg-stone-100 text-stone-700 border-stone-200', bar: 'bg-stone-500' };
    if (c.includes('dev')) return { badge: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200', bar: 'bg-fuchsia-500' };
    if (c.includes('facebook')) return { badge: 'bg-blue-100 text-blue-700 border-blue-200', bar: 'bg-blue-500' };
    if (c.includes('tiktok')) return { badge: 'bg-purple-100 text-purple-700 border-purple-200', bar: 'bg-purple-500' };
    return { badge: 'bg-violet-100 text-violet-700 border-violet-200', bar: 'bg-violet-500' };
  };

  useEffect(() => {
    fetchSummary();
  }, [selectedMonth, activeTab]);

  const handleExpenseSuccess = () => {
    closeExpenseForm();
    fetchSummary();
  };

  const closeExpenseForm = () => {
    setShowExpenseForm(false);
    setExpenseToEdit(null);
  };

  const openFormForEditing = (expense) => {
    setExpenseToEdit(expense);
    setShowExpenseForm(true);
  };

  const triggerDelete = (expense) => {
    setExpenseToDelete(expense);
  };

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    
    setIsDeleting(true);
    try {
      await axios.delete(`${API_URL}/api/expenses/${expenseToDelete.id}`);
      toast.success("Gasto eliminado exitosamente");
      setExpenseToDelete(null);
      fetchSummary();
    } catch (error) {
      console.error("Error al eliminar gasto:", error);
      toast.error("Hubo un error al eliminar el gasto.");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2
    }).format(val || 0);
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString + 'T00:00:00');
    return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
  };

  // UI helpers
  const getTabClasses = (tabName) => {
    const isActive = activeTab === tabName;
    return `flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all focus:outline-none ${
      isActive
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
        : 'bg-white text-gray-500 hover:text-gray-900 border border-gray-200 hover:bg-gray-50'
    }`;
  };

  return (
    <div className="space-y-6">
      {/* ── Modals ── */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <ExpenseForm 
            onSuccess={handleExpenseSuccess}
            onCancel={closeExpenseForm}
            availableProducts={availableProducts}
            initialData={expenseToEdit}
          />
        </div>
      )}

      <ConfirmModal
        isOpen={expenseToDelete !== null}
        title="Eliminar Gasto Operativo"
        message={
          <>
            ¿Estás seguro que deseas eliminar el gasto de <strong className="text-gray-900">{expenseToDelete ? formatCurrency(expenseToDelete.amount) : ''}</strong> en la categoría <strong className="text-gray-900">{expenseToDelete?.category}</strong>?<br/><br/>
            Esta acción no se puede deshacer y la utilidad del mes se recalculará.
          </>
        }
        confirmText="Eliminar Gasto"
        cancelText="Conservar"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={confirmDeleteExpense}
        onCancel={() => setExpenseToDelete(null)}
      />

      {/* ── Header & Segmented Controls ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 border-b-2 border-indigo-500 inline-block pb-1">Resumen Financiero</h2>
              <p className="mt-1 text-sm text-gray-500">
                Análisis de Rentabilidad por Canal de Origen
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 p-1.5 rounded-lg shadow-sm">
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-2">Mes:</label>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="border-none bg-transparent focus:ring-0 text-sm font-bold text-gray-700 py-1"
                />
              </div>
              <button
                onClick={() => setShowExpenseForm(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm shadow-sm transition-all active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Añadir Gasto</span>
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100">
            <button onClick={() => navigate('/resumen/global')} className={getTabClasses('global')}>
              <Globe className="w-4 h-4" /> Global / Consolidado
            </button>
            <button onClick={() => navigate('/resumen/csv')} className={getTabClasses('csv')}>
              <ShoppingBag className="w-4 h-4" /> E-commerce
            </button>
            <button onClick={() => navigate('/resumen/manual')} className={getTabClasses('manual')}>
              <Store className="w-4 h-4" /> Físico (Tienda)
            </button>
          </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        </div>
      ) : (
        <>
          {/* ── KPI Widgets ── */}
          {totalData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-500">
              <KpiWidget
                title="Ventas Totales"
                value={formatCurrency(totalData?.ventas_totales)}
                icon={ShoppingCart}
                gradient="from-indigo-500 to-indigo-600"
              />
              <KpiWidget
                title={activeTab === 'manual' ? 'Gasto Local y Comisiones' : 'Gastos Operativos'}
                icon={AlertCircle}
                gradient={activeTab === 'manual' ? 'from-rose-400 to-rose-500' : 'from-rose-500 to-rose-600'}
                value={
                  activeTab === 'manual' 
                    ? formatCurrency((totalData?.split_seller_total || 0) + (totalData?.split_local_total || 0) + (totalData?.split_app_total || 0) + (totalData?.split_dev_total || 0) + (totalData?.split_company_total || 0))
                    : formatCurrency((totalData?.logistica_total || 0) + (totalData?.devolucion_total || 0) + (totalData?.ads_total || 0))
                }
              >
                 <p className="text-xs opacity-80 mt-1 font-medium">
                  {activeTab === 'manual' ? 'Suma de todos los conceptos de liquidación' : 'Logística + Devoluciones + Ads'}
                </p>
              </KpiWidget>
              <KpiWidget
                title="Costo Proveedor"
                value={formatCurrency(totalData?.proveedor_total)}
                icon={Package}
                gradient="from-amber-500 to-amber-600"
              />
              <KpiWidget
                title="UTILIDAD NETA"
                value={formatCurrency(totalData?.utilidad_real)}
                icon={TrendingUp}
                gradient="from-emerald-500 to-emerald-600"
                ring="ring-2 ring-emerald-400 ring-offset-2 hover:shadow-xl"
              />
            </div>
          )}

          {/* ── Desglose por Producto ── */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
              {summaryData.length === 0 ? (
                <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                  <ReceiptText className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-lg font-medium">No hay datos financieros para {selectedMonth}</p>
                  <p className="text-sm mt-1">Registra ventas o cambia de origin/pestaña para explorar.</p>
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-xs tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Producto</th>
                      <th className="px-4 py-4 text-right">Ventas</th>
                      {activeTab === 'global' ? (
                        <>
                          <th 
                            className="px-4 py-4 text-right text-indigo-700 cursor-pointer hover:bg-indigo-50/50 transition-colors group"
                            onClick={() => handleSort('cantidad')}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              Unidades
                              <ArrowUpDown className={`w-3 h-3 ${sortConfig.key === 'cantidad' ? 'text-indigo-600' : 'text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity'}`} />
                            </div>
                          </th>
                          <th 
                            className="px-4 py-4 text-right text-amber-700 cursor-pointer hover:bg-amber-50/50 transition-colors group"
                            onClick={() => handleSort('participacion')}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="flex items-center gap-1 group-hover:underline decoration-dotted" title="Importancia: Qué porcentaje de la utilidad neta total del mes aporta este producto específico.">
                                Participación %
                                <HelpCircle className="w-3 h-3 cursor-help text-amber-400" />
                              </span>
                              <ArrowUpDown className={`w-3 h-3 ${sortConfig.key === 'participacion' ? 'text-amber-600' : 'text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity'}`} />
                            </div>
                          </th>
                          <th 
                            className="px-4 py-4 text-right text-blue-700 cursor-pointer hover:bg-blue-50/50 transition-colors group"
                            onClick={() => handleSort('margen')}
                          >
                            <div className="flex items-center justify-end gap-1.5">
                              <span className="flex items-center gap-1 group-hover:underline decoration-dotted" title="Eficiencia: De cada $1 vendido, cuánto es ganancia real después de todos los costos contables.">
                                Margen %
                                <HelpCircle className="w-3 h-3 cursor-help text-blue-400" />
                              </span>
                              <ArrowUpDown className={`w-3 h-3 ${sortConfig.key === 'margen' ? 'text-blue-600' : 'text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity'}`} />
                            </div>
                          </th>
                        </>
                      ) : activeTab === 'manual' ? (
                        <>
                          <th className="px-4 py-4 text-right text-amber-700">Costo Inv.</th>
                          <th className="px-3 py-4 text-right text-indigo-600 bg-indigo-50/30">Vendedor (40%)</th>
                          <th className="px-3 py-4 text-right text-slate-600 bg-slate-50/50">Local (25%)</th>
                          <th className="px-3 py-4 text-right text-blue-600 bg-blue-50/30">App (25%)</th>
                          <th className="px-3 py-4 text-right text-rose-600 bg-rose-50/30">Fondo Dev (5%)</th>
                          <th className="px-3 py-4 text-right text-emerald-600 bg-emerald-50/30">Empresa (5%)</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-4 text-right text-amber-700">Costo Inv.</th>
                          <th className="px-4 py-4 text-right text-rose-700">Logística</th>
                          <th className="px-4 py-4 text-right text-rose-700">Devolución</th>
                          <th className="px-4 py-4 text-right text-rose-700">Ads</th>
                        </>
                      )}
                      
                      <th className="px-6 py-4 text-right text-emerald-700">Utilidad Bruta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedSummaryData.map((item, idx) => {
                      const isUnassigned = item.product_name.includes('Gastos Generales');
                      return (
                        <tr 
                          key={idx} 
                          className={`hover:bg-slate-50 transition-colors ${
                            isUnassigned ? 'bg-orange-50/40 text-gray-600' : ''
                          }`}
                        >
                          <td className="px-6 py-4 font-semibold text-gray-800">
                            {item.product_name}
                            {isUnassigned && <span className="block text-[10px] uppercase font-bold text-orange-600 mt-0.5">Gastos Globales</span>}
                          </td>
                          <td className="px-4 py-4 text-right font-medium">{formatCurrency(item.ventas)}</td>
                          {activeTab === 'global' ? (
                            <>
                               <td className="px-4 py-4 text-right font-bold text-indigo-600">{item.cantidad || 0}</td>
                               <td className="px-4 py-4 text-right">
                                 <span className="text-xs font-bold text-gray-500">
                                   {totalData?.utilidad_real > 0 ? ((item.utilidad / totalData.utilidad_real) * 100).toFixed(1) : '0'}%
                                 </span>
                               </td>
                               <td className="px-4 py-4 text-right">
                                 <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                                   (item.utilidad / item.ventas) > 0.3 ? 'bg-emerald-100 text-emerald-700' :
                                   (item.utilidad / item.ventas) > 0.15 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                                 }`}>
                                   {item.ventas > 0 ? ((item.utilidad / item.ventas) * 100).toFixed(1) : '0'}%
                                 </span>
                               </td>
                            </>
                          ) : activeTab === 'manual' ? (
                            <>
                               <td className="px-4 py-4 text-right text-gray-500">{formatCurrency(item.proveedor)}</td>
                               <td className="px-3 py-4 text-right text-indigo-600/80 bg-indigo-50/10 font-medium">{formatCurrency(item.split_seller)}</td>
                               <td className="px-3 py-4 text-right text-slate-600/80 bg-slate-50/10 font-medium">{formatCurrency(item.split_local)}</td>
                               <td className="px-3 py-4 text-right text-blue-600/80 bg-blue-50/10 font-medium">{formatCurrency(item.split_app)}</td>
                               <td className="px-3 py-4 text-right text-rose-600/80 bg-rose-50/10 font-medium">{formatCurrency(item.split_dev)}</td>
                               <td className="px-3 py-4 text-right text-emerald-600/80 bg-emerald-50/10 font-medium">{formatCurrency(item.split_company)}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-4 text-right text-gray-500">{formatCurrency(item.proveedor)}</td>
                              <td className="px-4 py-4 text-right text-gray-500">{formatCurrency(item.logistica)}</td>
                              <td className="px-4 py-4 text-right text-gray-500">{formatCurrency(item.devolucion)}</td>
                              <td className="px-4 py-4 text-right text-gray-500">{formatCurrency(item.ads)}</td>
                            </>
                          )}

                          <td className={`px-6 py-4 text-right font-bold tracking-wide ${
                            item.utilidad === 0 ? 'text-gray-400' :
                            item.utilidad > 0 ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {item.utilidad < 0 ? '-' : ''}{formatCurrency(Math.abs(item.utilidad))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold border-t-2 border-gray-300 shadow-inner text-gray-800">
                    <tr>
                      <td className="px-6 py-5 uppercase tracking-wider text-[13px]">TOTAL MES</td>
                      <td className="px-4 py-5 text-right">{formatCurrency(totalData?.ventas_totales)}</td>
                      {activeTab === 'global' ? (
                        <>
                           <td className="px-4 py-5 text-right text-indigo-700">{totalData?.unidades_totales || 0}</td>
                           <td className="px-4 py-5 text-right text-amber-700">100%</td>
                           <td className="px-4 py-5 text-right text-blue-700">
                             {totalData?.ventas_totales > 0 ? ((totalData.utilidad_real / totalData.ventas_totales) * 100).toFixed(1) : '0'}%
                           </td>
                        </>
                      ) : activeTab === 'manual' ? (
                        <>
                           <td className="px-4 py-5 text-right text-amber-700">{formatCurrency(totalData?.proveedor_total)}</td>
                           <td className="px-3 py-5 text-right text-indigo-700 bg-indigo-50/20">{formatCurrency(totalData?.split_seller_total)}</td>
                           <td className="px-3 py-5 text-right text-slate-700 bg-slate-50/30">{formatCurrency(totalData?.split_local_total)}</td>
                           <td className="px-3 py-5 text-right text-blue-700 bg-blue-50/20">{formatCurrency(totalData?.split_app_total)}</td>
                           <td className="px-3 py-5 text-right text-rose-700 bg-rose-50/20">{formatCurrency(totalData?.split_dev_total)}</td>
                           <td className="px-3 py-5 text-right text-emerald-700 bg-emerald-50/20">{formatCurrency(totalData?.split_company_total)}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-5 text-right text-amber-700">{formatCurrency(totalData?.proveedor_total)}</td>
                          <td className="px-4 py-5 text-right text-rose-700">{formatCurrency(totalData?.logistica_total)}</td>
                          <td className="px-4 py-5 text-right text-rose-700">{formatCurrency(totalData?.devolucion_total)}</td>
                          <td className="px-4 py-5 text-right text-rose-700">{formatCurrency(totalData?.ads_total)}</td>
                        </>
                      )}
                      
                      <td className={`px-6 py-5 text-right text-lg tracking-wide ${
                        totalData?.utilidad_real === 0 ? 'text-gray-500' :
                        totalData?.utilidad_real > 0 ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {formatCurrency(totalData?.utilidad_real)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          </div>

          {/* ── Detalle de Gastos Operativos ── */}
          {expensesList.length > 0 && (
             <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden animate-in fade-in duration-500">
                <button
                  onClick={() => setIsExpensesOpen(!isExpensesOpen)}
                  className="p-6 w-full text-left flex justify-between items-center bg-gray-50/50 hover:bg-gray-100/60 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <TrendingDown className="w-6 h-6 text-rose-600" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Egresos Operativos</h3>
                        <p className="text-sm text-gray-500 mt-1">Total de este mes: <span className="font-bold text-rose-600">{formatCurrency(expenseSummary.total)}</span></p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-6 h-6 text-gray-400 transition-transform duration-300 ${
                      isExpensesOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                <div
                  className={`transition-all duration-500 ease-in-out overflow-hidden ${
                    isExpensesOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'
                  }`}
                >
                  <div className="border-t border-gray-200">
                      <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <h3 className="text-lg font-bold text-gray-800 tracking-tight">Análisis de Egresos</h3>
                          <p className="text-sm text-gray-500 mt-1">Filtra y busca para auditar los gastos.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                          <div className="relative flex-grow md:flex-grow-0">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input 
                              type="text" 
                              placeholder="Buscar..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                            />
                          </div>
                          <div className="relative">
                            <select 
                              value={filterCategory}
                              onChange={(e) => setFilterCategory(e.target.value)}
                              className="pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm appearance-none cursor-pointer font-medium text-gray-600 focus:ring-2 focus:ring-indigo-500/20"
                            >
                              {expenseCategories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                            <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                          </div>
                        </div>
                      </div>

                      <div className="p-6 bg-gray-50/70 border-b border-gray-100">
                        <h4 className="text-sm font-bold text-gray-600 uppercase tracking-wider mb-4">Resumen por Categoría</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          {Object.entries(expenseSummary).filter(([cat]) => cat !== 'total').map(([cat, amount]) => {
                            const percentage = expenseSummary.total > 0 ? (amount / expenseSummary.total) * 100 : 0;
                            const theme = getCategoryTheme(cat);
                            return (
                              <div key={cat} className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-sm font-bold text-gray-700 truncate" title={cat}>{cat}</span>
                                    <span className="text-sm font-bold text-gray-800">{formatCurrency(amount)}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                                  <div
                                    className={`${theme.bar} h-2.5 rounded-full`}
                                    style={{ width: `${percentage}%` }}
                                  ></div>
                                </div>
                                <p className="text-right text-xs font-semibold text-gray-500 mt-1.5">{percentage.toFixed(1)}% del total</p>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-xs tracking-wider">
                            <tr>
                              <th className="px-6 py-4 pl-8">Fecha</th>
                              <th className="px-6 py-4">Categoría</th>
                              <th className="px-6 py-4">Concepto / Análisis de Impacto</th>
                              <th className="px-6 py-4 text-right">Monto</th>
                              <th className="px-6 py-4 text-center">Referencia</th>
                              <th className="px-6 py-4 text-right pr-8">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filteredExpenses.map((exp) => {
                              const roi = calculateROI(exp.amount, exp.product_name);
                              const theme = getCategoryTheme(exp.category);
                              return (
                                <tr key={exp.id} className="hover:bg-slate-50 transition-colors group">
                                  <td className="px-6 py-5 whitespace-nowrap text-gray-500 font-medium pl-8">
                                    {formatDate(exp.expense_date)}
                                  </td>
                                  <td className="px-6 py-5 whitespace-nowrap">
                                    <span className={`${theme.badge} px-2.5 py-1 rounded-md text-xs font-bold border`}>
                                      {exp.category}
                                    </span>
                                  </td>
                                  <td className="px-6 py-5">
                                    <div className="font-semibold text-gray-800">
                                      {exp.product_name || exp.description || "Gasto sin concepto"}
                                    </div>
                                    {exp.product_name && exp.description && (
                                      <div className="text-xs text-gray-500 italic">
                                        {exp.description}
                                      </div>
                                    )}
                                    {roi && (
                                      <div className="mt-1 flex items-center gap-1.5">
                                        <Activity className="w-3.5 h-3.5 text-emerald-500" />
                                        <span className="text-emerald-600 text-xs font-bold">
                                          {roi}% de impacto en ventas
                                        </span>
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-6 py-5 whitespace-nowrap text-right font-bold text-gray-800 text-base">
                                    {formatCurrency(exp.amount)}
                                  </td>
                                  <td className="px-6 py-5 text-center">
                                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${
                                      exp.target_source === 'csv' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                      exp.target_source === 'manual' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                      'bg-orange-50 text-orange-700 border-orange-200'
                                    }`}>
                                      {exp.target_source === 'csv' ? <Globe className="w-3.h-3.5" /> :
                                       exp.target_source === 'manual' ? <Store className="w-3.5 h-3.5" /> :
                                       <Settings className="w-3.5 h-3.5" />}
                                      {exp.target_source === 'csv' ? 'E-com' :
                                       exp.target_source === 'manual' ? 'Tienda' :
                                       'Global'}
                                    </span>
                                  </td>
                                  <td className="px-6 py-5 whitespace-nowrap text-right pr-8">
                                    <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                      <button
                                        onClick={() => openFormForEditing(exp)}
                                        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                        title="Editar"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() => triggerDelete(exp)}
                                        className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                        title="Eliminar"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        {filteredExpenses.length === 0 && (
                          <div className="p-12 text-center">
                            <div className="bg-gray-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                              <Search className="w-8 h-8 text-gray-400" />
                            </div>
                            <p className="text-gray-500 font-medium">No se encontraron gastos con estos filtros.</p>
                            <button onClick={() => {setSearchTerm(''); setFilterCategory('Todas');}} className="text-indigo-600 text-sm mt-2 font-bold hover:underline">
                              Limpiar filtros
                            </button>
                          </div>
                        )}
                      </div>
                  </div>
                </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MonthlySummaryPage;
