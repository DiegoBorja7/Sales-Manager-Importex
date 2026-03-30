import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { TrendingUp, TrendingDown, DollarSign, Package, AlertCircle, ShoppingCart, Loader2, Plus, Edit2, Trash2, ReceiptText, Globe, ShoppingBag, Store } from 'lucide-react';
import ExpenseForm from '../components/ExpenseForm';
import ConfirmModal from '../components/ConfirmModal';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-md p-5 text-white transform transition hover:-translate-y-1 hover:shadow-lg">
                <div className="flex items-center justify-between opacity-80 mb-2">
                  <span className="text-sm font-semibold tracking-wider">Ventas Totales</span>
                  <ShoppingCart className="w-5 h-5" />
                </div>
                <div className="text-3xl font-extrabold">{formatCurrency(totalData?.ventas_totales)}</div>
              </div>

              <div className={`bg-gradient-to-br rounded-xl shadow-md p-5 text-white transform transition hover:-translate-y-1 hover:shadow-lg ${
                activeTab === 'manual' ? 'from-rose-400 to-rose-500' : 'from-rose-500 to-rose-600'
              }`}>
                <div className="flex items-center justify-between opacity-80 mb-2">
                  <span className="text-sm font-semibold tracking-wider">
                    {activeTab === 'manual' ? 'Gasto Local y Comisiones' : 'Gastos Operativos'}
                  </span>
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div className="text-3xl font-extrabold">
                  {activeTab === 'manual' 
                    ? formatCurrency((totalData?.split_seller_total || 0) + (totalData?.split_local_total || 0) + (totalData?.split_app_total || 0) + (totalData?.split_dev_total || 0) + (totalData?.split_company_total || 0))
                    : formatCurrency((totalData?.logistica_total || 0) + (totalData?.devolucion_total || 0) + (totalData?.ads_total || 0))
                  }
                </div>
                <p className="text-xs opacity-80 mt-1 font-medium">
                  {activeTab === 'manual' ? 'Suma de todos los conceptos de liquidación' : 'Logística + Devoluciones + Ads'}
                </p>
              </div>

              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl shadow-md p-5 text-white transform transition hover:-translate-y-1 hover:shadow-lg">
                <div className="flex items-center justify-between opacity-80 mb-2">
                  <span className="text-sm font-semibold tracking-wider">Costo Proveedor</span>
                  <Package className="w-5 h-5" />
                </div>
                <div className="text-3xl font-extrabold">{formatCurrency(totalData?.proveedor_total)}</div>
              </div>

              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-md p-5 text-white ring-2 ring-emerald-400 ring-offset-2 transform transition hover:-translate-y-1 hover:shadow-xl">
                <div className="flex items-center justify-between opacity-90 mb-2">
                  <span className="text-sm font-semibold tracking-wider">UTILIDAD NETA</span>
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="text-3xl font-extrabold">{formatCurrency(totalData?.utilidad_real)}</div>
              </div>
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
                      <th className="px-4 py-4 text-right text-amber-700">Costo Inv.</th>
                      
                      {activeTab === 'manual' ? (
                        <>
                          <th className="px-3 py-4 text-right text-indigo-600 bg-indigo-50/30">Vendedor (40%)</th>
                          <th className="px-3 py-4 text-right text-slate-600 bg-slate-50/50">Local (25%)</th>
                          <th className="px-3 py-4 text-right text-blue-600 bg-blue-50/30">App (25%)</th>
                          <th className="px-3 py-4 text-right text-rose-600 bg-rose-50/30">Fondo Dev (5%)</th>
                          <th className="px-3 py-4 text-right text-emerald-600 bg-emerald-50/30">Empresa (5%)</th>
                        </>
                      ) : (
                        <>
                          <th className="px-4 py-4 text-right text-rose-700">Logística</th>
                          <th className="px-4 py-4 text-right text-rose-700">Devolución</th>
                          <th className="px-4 py-4 text-right text-rose-700">Ads</th>
                        </>
                      )}
                      
                      <th className="px-6 py-4 text-right text-emerald-700">Utilidad Bruta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {summaryData.map((item, idx) => {
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
                          <td className="px-4 py-4 text-right text-gray-500">{formatCurrency(item.proveedor)}</td>
                          
                          {activeTab === 'manual' ? (
                            <>
                               <td className="px-3 py-4 text-right text-indigo-600/80 bg-indigo-50/10 font-medium">{formatCurrency(item.split_seller)}</td>
                               <td className="px-3 py-4 text-right text-slate-600/80 bg-slate-50/10 font-medium">{formatCurrency(item.split_local)}</td>
                               <td className="px-3 py-4 text-right text-blue-600/80 bg-blue-50/10 font-medium">{formatCurrency(item.split_app)}</td>
                               <td className="px-3 py-4 text-right text-rose-600/80 bg-rose-50/10 font-medium">{formatCurrency(item.split_dev)}</td>
                               <td className="px-3 py-4 text-right text-emerald-600/80 bg-emerald-50/10 font-medium">{formatCurrency(item.split_company)}</td>
                            </>
                          ) : (
                            <>
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
                      <td className="px-4 py-5 text-right text-amber-700">{formatCurrency(totalData?.proveedor_total)}</td>
                      
                      {activeTab === 'manual' ? (
                        <>
                           <td className="px-3 py-5 text-right text-indigo-700 bg-indigo-50/20">{formatCurrency(totalData?.split_seller_total)}</td>
                           <td className="px-3 py-5 text-right text-slate-700 bg-slate-50/30">{formatCurrency(totalData?.split_local_total)}</td>
                           <td className="px-3 py-5 text-right text-blue-700 bg-blue-50/20">{formatCurrency(totalData?.split_app_total)}</td>
                           <td className="px-3 py-5 text-right text-rose-700 bg-rose-50/20">{formatCurrency(totalData?.split_dev_total)}</td>
                           <td className="px-3 py-5 text-right text-emerald-700 bg-emerald-50/20">{formatCurrency(totalData?.split_company_total)}</td>
                        </>
                      ) : (
                        <>
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

          {/* ── Detalle de Gastos Manuales ── */}
          {expensesList.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <ReceiptText className="w-5 h-5 text-indigo-500" />
                  Listado de Gastos Registrados
                </h3>
              </div>
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
                <table className="w-full text-sm text-left text-gray-500">
                  <thead className="bg-white text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Fecha</th>
                      <th className="px-6 py-3 font-semibold">Categoría</th>
                      <th className="px-6 py-3 font-semibold">Producto/Detalle</th>
                      <th className="px-6 py-3 font-semibold text-right">Monto</th>
                      <th className="px-6 py-3 font-semibold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {expensesList.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium">
                          {formatDate(exp.expense_date)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-md text-xs font-semibold border border-gray-200">
                            {exp.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-gray-800 font-medium">{exp.product_name || <span className="text-xs text-orange-600 uppercase tracking-tight bg-orange-50 px-1 py-0.5 rounded">Gasto Global</span>}</div>
                          {exp.description && <div className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{exp.description}</div>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-gray-700">
                          {formatCurrency(exp.amount)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                          <button
                            onClick={() => openFormForEditing(exp)}
                            className="text-indigo-600 hover:text-indigo-900 mx-2 transition-colors p-1"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => triggerDelete(exp)}
                            className="text-rose-600 hover:text-rose-900 mx-2 transition-colors p-1"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MonthlySummaryPage;
