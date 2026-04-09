import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  TrendingUp, TrendingDown, Package, AlertCircle, ShoppingCart,
  Loader2, Plus, Edit2, Trash2, ReceiptText, Globe, ShoppingBag,
  Store, HelpCircle, ArrowUpDown, Search, Filter, Settings,
  Activity, ChevronDown, BarChart2
} from 'lucide-react';
import ExpenseForm from '../components/ExpenseForm';
import ConfirmModal from '../components/ConfirmModal';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
  LabelList
} from 'recharts';

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_URL = rawApiUrl.replace(/\/+$/, '');

// ─── Palette ───
const CHART_COLORS = {
  ventas:    '#6366f1',
  costos:    '#f43f5e',
  utilidad:  '#10b981',
  proveedor: '#f59e0b',
  logistica: '#64748b',
  devolucion:'#a855f7',
  ads:       '#3b82f6',
};
const SPLIT_COLORS      = ['#6366f1','#64748b','#3b82f6','#f43f5e','#10b981'];
const DONUT_COST_COLORS = ['#f59e0b','#64748b','#a855f7','#3b82f6'];

const fmt$ = (v) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v || 0);

// ─── Tooltips ───
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 shadow-2xl text-white text-sm min-w-[160px]">
      {label && <p className="font-bold text-gray-300 mb-2 border-b border-gray-700 pb-1">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-300">{entry.name}</span>
          </span>
          <span className="font-bold">{fmt$(entry.value)}</span>
        </div>
      ))}
    </div>
  );
};

const CustomPieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 shadow-2xl text-white text-sm">
      <span className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-full" style={{ background: entry.payload.fill }} />
        <span className="font-bold text-gray-200">{entry.name}</span>
      </span>
      <p className="mt-1 text-right font-bold">{fmt$(entry.value)}</p>
      <p className="text-xs text-gray-400 text-right">{entry.payload.pct}% del total</p>
    </div>
  );
};

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

// ─── Logistics KPI Pill ───
const KPI_PILL_THEMES = {
  emerald: 'bg-emerald-50 border-emerald-100 text-emerald-600 text-emerald-700',
  fuchsia: 'bg-fuchsia-50 border-fuchsia-100 text-fuchsia-600 text-fuchsia-700',
  blue:    'bg-blue-50 border-blue-100 text-blue-600 text-blue-700',
  amber:   'bg-amber-50 border-amber-100 text-amber-600 text-amber-700',
  orange:  'bg-orange-50 border-orange-100 text-orange-600 text-orange-700',
  rose:    'bg-rose-50 border-rose-100 text-rose-600 text-rose-700',
  slate:   'bg-slate-50 border-slate-100 text-slate-600 text-slate-700',
  gray:    'bg-gray-50 border-gray-100 text-gray-600 text-gray-700',
};

const KpiPill = ({ title, count, total, color }) => {
  const pct = total > 0 ? ((count / total) * 100).toFixed(0) : '0';
  const theme = KPI_PILL_THEMES[color];
  const [bg, border, textSm, textLg] = theme.split(' ');
  return (
    <div className={`${bg} ${border} bg-opacity-70 rounded-xl p-3 flex flex-col justify-center items-center text-center shadow-sm hover:shadow-md transition-all hover:-translate-y-1`}>
      <span className={`text-[10px] font-bold ${textSm} uppercase tracking-wider mb-1`}>{title}</span>
      <span className={`text-2xl font-extrabold ${textLg}`}>{pct}%</span>
      <span className="text-xs text-slate-500 font-medium mt-0.5">{count} unds</span>
    </div>
  );
};

// ─── Chart Card ───
const ChartCard = ({ title, subtitle, children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-md border border-gray-100 p-6 flex flex-col gap-3 ${className}`}>
    <div>
      <h3 className="text-base font-bold text-gray-800 tracking-tight">{title}</h3>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
    {children}
  </div>
);

// ─────────────────────────────────────────────────────
const MonthlySummaryPage = () => {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const { sourceTab } = useParams();
  const navigate      = useNavigate();
  const activeTab     = sourceTab || 'global';

  const [summaryData, setSummaryData]   = useState([]);
  const [totalData, setTotalData]       = useState(null);
  const [expensesList, setExpensesList] = useState([]);
  const [trendData, setTrendData]       = useState([]);
  const [logisticsKpis, setLogisticsKpis] = useState(null);
  const [isLoading, setIsLoading]       = useState(true);
  const [availableProducts, setAvailableProducts] = useState([]);

  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [expenseToEdit, setExpenseToEdit]     = useState(null);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [isDeleting, setIsDeleting]           = useState(false);

  const [searchTerm, setSearchTerm]         = useState('');
  const [filterCategory, setFilterCategory] = useState('Todas');
  const [isExpensesOpen, setIsExpensesOpen] = useState(true);
  const [sortConfig, setSortConfig]         = useState({ key: 'ventas', direction: 'desc' });

  // ── Fetch ──
  const fetchSummary = async () => {
    setIsLoading(true);
    try {
      const sourceQuery = activeTab === 'global' ? '' : `&source=${activeTab}`;
      
      const requestPromises = [
        axios.get(`${API_URL}/api/summary/monthly?month=${selectedMonth}${sourceQuery}`),
        axios.get(`${API_URL}/api/summary/monthly-total?month=${selectedMonth}${sourceQuery}`),
        axios.get(`${API_URL}/api/expenses?month=${selectedMonth}${sourceQuery}`),
        axios.get(`${API_URL}/api/summary/trend?months=6&anchor=${selectedMonth}${sourceQuery}`),
      ];
      
      if (activeTab === 'global') {
        requestPromises.push(axios.get(`${API_URL}/api/summary/logistics-kpis?month=${selectedMonth}`));
      }

      const responses = await Promise.all(requestPromises);
      const [productsRes, totalRes, expensesRes, trendRes, logisticsRes] = responses;

      setSummaryData(productsRes.data);
      setTotalData(totalRes.data);
      setExpensesList(expensesRes.data);
      setTrendData(trendRes.data);
      if (logisticsRes) {
        setLogisticsKpis(logisticsRes.data);
      } else {
        setLogisticsKpis(null);
      }
      
      setAvailableProducts(
        productsRes.data
          .map(p => p.product_name)
          .filter(n => n && !n.includes('Gastos Generales'))
      );
    } catch (error) {
      console.error('Error fetching summary:', error);
      toast.error('Error al cargar el resumen mensual.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchSummary(); }, [selectedMonth, activeTab]);

  // ── Sort ──
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const sortedSummaryData = React.useMemo(() => {
    let data = [...summaryData];
    if (sortConfig.key) {
      data.sort((a, b) => {
        if (a.product_name.includes('Gastos Generales')) return 1;
        if (b.product_name.includes('Gastos Generales')) return -1;
        let av = a[sortConfig.key], bv = b[sortConfig.key];
        if (sortConfig.key === 'margen')       { av = a.ventas > 0 ? a.utilidad / a.ventas : 0; bv = b.ventas > 0 ? b.utilidad / b.ventas : 0; }
        if (sortConfig.key === 'participacion'){ av = totalData?.utilidad_real > 0 ? a.utilidad / totalData.utilidad_real : 0; bv = totalData?.utilidad_real > 0 ? b.utilidad / totalData.utilidad_real : 0; }
        return av < bv ? (sortConfig.direction === 'asc' ? -1 : 1) : av > bv ? (sortConfig.direction === 'asc' ? 1 : -1) : 0;
      });
    }
    return data;
  }, [summaryData, sortConfig, totalData]);

  // ── Expenses helpers ──
  const expenseSummary = React.useMemo(() =>
    expensesList.reduce((acc, exp) => {
      const cat = exp.category, amt = parseFloat(exp.amount) || 0;
      acc[cat] = (acc[cat] || 0) + amt;
      acc.total = (acc.total || 0) + amt;
      return acc;
    }, { total: 0 }), [expensesList]);

  const filteredExpenses = React.useMemo(() =>
    expensesList.filter(exp => {
      const ms = (exp.product_name?.toLowerCase().includes(searchTerm.toLowerCase()))
        || (exp.description?.toLowerCase().includes(searchTerm.toLowerCase()))
        || (exp.category.toLowerCase().includes(searchTerm.toLowerCase()));
      const mc = filterCategory === 'Todas' || exp.category === filterCategory;
      return ms && mc;
    }), [expensesList, searchTerm, filterCategory]);

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
    if (c.includes('log'))      return { badge: 'bg-slate-100 text-slate-700 border-slate-200',   bar: 'bg-slate-500' };
    if (c.includes('prov'))     return { badge: 'bg-stone-100 text-stone-700 border-stone-200',   bar: 'bg-stone-500' };
    if (c.includes('dev'))      return { badge: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200', bar: 'bg-fuchsia-500' };
    if (c.includes('facebook')) return { badge: 'bg-blue-600 text-white border-blue-600',       bar: 'bg-blue-600' };
    if (c.includes('tiktok'))   return { badge: 'bg-zinc-900 text-white border-zinc-900', bar: 'bg-zinc-900' };
    return { badge: 'bg-violet-100 text-violet-700 border-violet-200', bar: 'bg-violet-500' };
  };

  const handleExpenseSuccess = () => { closeExpenseForm(); fetchSummary(); };
  const closeExpenseForm     = () => { setShowExpenseForm(false); setExpenseToEdit(null); };
  const openFormForEditing   = (expense) => { setExpenseToEdit(expense); setShowExpenseForm(true); };
  const triggerDelete        = (expense) => setExpenseToDelete(expense);

  const confirmDeleteExpense = async () => {
    if (!expenseToDelete) return;
    setIsDeleting(true);
    try {
      await axios.delete(`${API_URL}/api/expenses/${expenseToDelete.id}`);
      toast.success('Gasto eliminado exitosamente');
      setExpenseToDelete(null);
      fetchSummary();
    } catch { toast.error('Hubo un error al eliminar el gasto.'); }
    finally { setIsDeleting(false); }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(val || 0);

  const formatDate = (dateString) => {
    const d = new Date(dateString + 'T00:00:00');
    return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
  };

  const getTabClasses = (tabName) => {
    const isActive = activeTab === tabName;
    return `flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all focus:outline-none ${
      isActive
        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
        : 'bg-white text-gray-500 hover:text-gray-900 border border-gray-200 hover:bg-gray-50'
    }`;
  };

  // ─── Chart Data ───

  // Chart 1: Grouped bar
  const barOverviewData = totalData ? [{
    name: selectedMonth,
    Ventas:   parseFloat(totalData.ventas_totales   || 0),
    Costos:   parseFloat((totalData.proveedor_total || 0) + (totalData.logistica_total || 0) + (totalData.devolucion_total || 0) + (totalData.ads_total || 0)),
    Utilidad: parseFloat(totalData.utilidad_real    || 0),
  }] : [];

  // Chart 2: Cost Donut
  const costDonutData = totalData ? [
    { name: 'Proveedor',  value: parseFloat(totalData.proveedor_total  || 0), fill: DONUT_COST_COLORS[0] },
    { name: 'Logística',  value: parseFloat(totalData.logistica_total  || 0), fill: DONUT_COST_COLORS[1] },
    { name: 'Devolución', value: parseFloat(totalData.devolucion_total || 0), fill: DONUT_COST_COLORS[2] },
    { name: 'Ads',        value: parseFloat(totalData.ads_total        || 0), fill: DONUT_COST_COLORS[3] },
  ].filter(d => d.value > 0).map(d => {
    const total = [totalData.proveedor_total, totalData.logistica_total, totalData.devolucion_total, totalData.ads_total]
      .reduce((s, v) => s + parseFloat(v || 0), 0);
    return { ...d, pct: total > 0 ? ((d.value / total) * 100).toFixed(1) : '0' };
  }) : [];

  // Chart 3: Top 5 utilidad
  const top5Data = [...summaryData]
    .filter(p => !p.product_name.includes('Gastos Generales'))
    .sort((a, b) => b.utilidad - a.utilidad)
    .slice(0, 5)
    .map(p => ({
      name: p.product_name.length > 20 ? p.product_name.slice(0, 18) + '…' : p.product_name,
      Utilidad: parseFloat(p.utilidad || 0),
    }))
    .reverse();

  // Chart 4: Split Donut (manual)
  const splitLabels = ['Vendedor 40%', 'Local 25%', 'App 25%', 'Devolución 5%', 'Empresa 5%'];
  const splitDonutData = (totalData && activeTab === 'manual') ? [
    { name: splitLabels[0], value: parseFloat(totalData.split_seller_total  || 0), fill: SPLIT_COLORS[0] },
    { name: splitLabels[1], value: parseFloat(totalData.split_local_total   || 0), fill: SPLIT_COLORS[1] },
    { name: splitLabels[2], value: parseFloat(totalData.split_app_total     || 0), fill: SPLIT_COLORS[2] },
    { name: splitLabels[3], value: parseFloat(totalData.split_dev_total     || 0), fill: SPLIT_COLORS[3] },
    { name: splitLabels[4], value: parseFloat(totalData.split_company_total || 0), fill: SPLIT_COLORS[4] },
  ].filter(d => d.value > 0).map(d => {
    const total = [totalData.split_seller_total, totalData.split_local_total, totalData.split_app_total, totalData.split_dev_total, totalData.split_company_total]
      .reduce((s, v) => s + parseFloat(v || 0), 0);
    return { ...d, pct: total > 0 ? ((d.value / total) * 100).toFixed(1) : '0' };
  }) : [];

  // ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Modals ── */}
      {showExpenseForm && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <ExpenseForm onSuccess={handleExpenseSuccess} onCancel={closeExpenseForm} availableProducts={availableProducts} initialData={expenseToEdit} />
        </div>
      )}

      <ConfirmModal
        isOpen={expenseToDelete !== null}
        title="Eliminar Gasto Operativo"
        message={<>¿Estás seguro de eliminar el gasto de <strong className="text-gray-900">{expenseToDelete ? formatCurrency(expenseToDelete.amount) : ''}</strong> en <strong className="text-gray-900">{expenseToDelete?.category}</strong>?<br/><br/>Esta acción no se puede deshacer.</>}
        confirmText="Eliminar Gasto"
        cancelText="Conservar"
        isDestructive={true}
        isLoading={isDeleting}
        onConfirm={confirmDeleteExpense}
        onCancel={() => setExpenseToDelete(null)}
      />

      {/* ── Header ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col gap-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 border-b-2 border-indigo-500 inline-block pb-1">Resumen Financiero</h2>
            <p className="mt-1 text-sm text-gray-500">Análisis de Rentabilidad por Canal de Origen</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 p-1.5 rounded-lg shadow-sm">
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide px-2">Mes:</label>
              <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="border-none bg-transparent focus:ring-0 text-sm font-bold text-gray-700 py-1" />
            </div>
            <button onClick={() => setShowExpenseForm(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-semibold text-sm shadow-sm transition-all active:scale-95">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Añadir Gasto</span>
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-100">
          <button onClick={() => navigate('/resumen/global')}  className={getTabClasses('global')}><Globe className="w-4 h-4" /> Global / Consolidado</button>
          <button onClick={() => navigate('/resumen/csv')}     className={getTabClasses('csv')}><ShoppingBag className="w-4 h-4" /> E-commerce</button>
          <button onClick={() => navigate('/resumen/manual')}  className={getTabClasses('manual')}><Store className="w-4 h-4" /> Físico (Tienda)</button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-12 h-12 text-indigo-500 animate-spin" /></div>
      ) : (
        <>
          {/* ── 1. KPI Widgets / Pills ── */}
          {activeTab === 'global' ? (
            logisticsKpis && logisticsKpis.total_pedidos > 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold tracking-tight text-gray-800 uppercase flex items-center gap-2">
                    <Package className="w-4 h-4 text-indigo-500" />
                    Eficiencia Logística del Mes
                  </h3>
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-md">Total: {logisticsKpis.total_pedidos} Pedidos</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
                  <KpiPill title="Entregas" count={logisticsKpis.entregados} total={logisticsKpis.total_pedidos} color="emerald" />
                  <KpiPill title="Devolución" count={logisticsKpis.devoluciones} total={logisticsKpis.total_pedidos} color="fuchsia" />
                  <KpiPill title="Pendientes" count={logisticsKpis.pendientes} total={logisticsKpis.total_pedidos} color="orange" />
                  <KpiPill title="Proceso" count={logisticsKpis.proceso} total={logisticsKpis.total_pedidos} color="blue" />
                  <KpiPill title="Novedad" count={logisticsKpis.novedades} total={logisticsKpis.total_pedidos} color="amber" />
                  <KpiPill title="Cancelados" count={logisticsKpis.cancelados} total={logisticsKpis.total_pedidos} color="rose" />
                  <KpiPill title="Revisar" count={logisticsKpis.revisar} total={logisticsKpis.total_pedidos} color="slate" />
                  {logisticsKpis.otros > 0 && <KpiPill title="Otros" count={logisticsKpis.otros} total={logisticsKpis.total_pedidos} color="gray" />}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center animate-in fade-in duration-500">
                <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-500">No hay datos logísticos (CSV) para generar el reporte de eficiencias.</p>
              </div>
            )
          ) : (
            totalData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in duration-500">
                <KpiWidget title="Ventas Totales" value={formatCurrency(totalData?.ventas_totales)} icon={ShoppingCart} gradient="from-indigo-500 to-indigo-600" />
                <KpiWidget title="Costo Proveedor" value={formatCurrency(totalData?.proveedor_total)} icon={Package} gradient="from-amber-500 to-amber-600" />
                <KpiWidget
                  title={activeTab === 'manual' ? 'Gasto Local y Comisiones' : 'Gastos Operativos'}
                  icon={AlertCircle}
                  gradient={activeTab === 'manual' ? 'from-rose-400 to-rose-500' : 'from-rose-500 to-rose-600'}
                  value={activeTab === 'manual'
                    ? formatCurrency((totalData?.split_seller_total || 0) + (totalData?.split_local_total || 0) + (totalData?.split_app_total || 0) + (totalData?.split_dev_total || 0) + (totalData?.split_company_total || 0))
                    : formatCurrency((totalData?.logistica_total || 0) + (totalData?.devolucion_total || 0) + (totalData?.ads_total || 0))}
                >
                  <p className="text-xs opacity-80 mt-1 font-medium">{activeTab === 'manual' ? 'Suma de todos los conceptos de liquidación' : 'Logística + Devoluciones + Ads'}</p>
                </KpiWidget>
                <KpiWidget title="UTILIDAD NETA" value={formatCurrency(totalData?.utilidad_real)} icon={TrendingUp} gradient="from-emerald-500 to-emerald-600" ring="ring-2 ring-emerald-400 ring-offset-2 hover:shadow-xl" />
              </div>
            )
          )}

          {/* ── 2. Tabla Desglose por Producto ── */}
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-200">
              {summaryData.length === 0 ? (
                <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                  <ReceiptText className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="text-lg font-medium">No hay datos financieros para {selectedMonth}</p>
                  <p className="text-sm mt-1">Registra ventas o cambia de origen/pestaña para explorar.</p>
                </div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-xs tracking-wider">
                    <tr>
                      <th className="px-6 py-4">Producto</th>
                      <th className="px-4 py-4 text-right">Ventas</th>
                      {activeTab === 'global' ? (
                        <>
                          <th className="px-4 py-4 text-right text-indigo-700 cursor-pointer hover:bg-indigo-50/50 transition-colors group" onClick={() => handleSort('cantidad')}>
                            <div className="flex items-center justify-end gap-1.5">Unidades <ArrowUpDown className={`w-3 h-3 ${sortConfig.key === 'cantidad' ? 'text-indigo-600' : 'text-gray-300 opacity-0 group-hover:opacity-100'}`} /></div>
                          </th>
                          <th className="px-4 py-4 text-right text-amber-700 cursor-pointer hover:bg-amber-50/50 transition-colors group" onClick={() => handleSort('participacion')}>
                            <div className="flex items-center justify-end gap-1.5"><span className="flex items-center gap-1">Participación % <HelpCircle className="w-3 h-3 cursor-help text-amber-400" /></span><ArrowUpDown className={`w-3 h-3 ${sortConfig.key === 'participacion' ? 'text-amber-600' : 'text-gray-300 opacity-0 group-hover:opacity-100'}`} /></div>
                          </th>
                          <th className="px-4 py-4 text-right text-blue-700 cursor-pointer hover:bg-blue-50/50 transition-colors group" onClick={() => handleSort('margen')}>
                            <div className="flex items-center justify-end gap-1.5"><span className="flex items-center gap-1">Margen % <HelpCircle className="w-3 h-3 cursor-help text-blue-400" /></span><ArrowUpDown className={`w-3 h-3 ${sortConfig.key === 'margen' ? 'text-blue-600' : 'text-gray-300 opacity-0 group-hover:opacity-100'}`} /></div>
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
                  {/* ── Producto rows (pure sales data — matches PM Excel) ── */}
                  <tbody className="divide-y divide-gray-100">
                    {sortedSummaryData.filter(i => !i.product_name.includes('Gastos Generales')).map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-semibold text-gray-800">{item.product_name}</td>
                        <td className="px-4 py-4 text-right font-medium">{formatCurrency(item.ventas)}</td>
                        {activeTab === 'global' ? (
                          <>
                            <td className="px-4 py-4 text-right font-bold text-indigo-600">{item.cantidad || 0}</td>
                            <td className="px-4 py-4 text-right"><span className="text-xs font-bold text-gray-500">{totalData?.utilidad_real > 0 ? ((item.utilidad / totalData.utilidad_real) * 100).toFixed(1) : '0'}%</span></td>
                            <td className="px-4 py-4 text-right">
                              <span className={`px-2 py-1 rounded-md text-xs font-bold ${(item.utilidad / item.ventas) > 0.3 ? 'bg-emerald-100 text-emerald-700' : (item.utilidad / item.ventas) > 0.15 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}`}>
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
                        <td className={`px-6 py-4 text-right font-bold tracking-wide ${item.utilidad === 0 ? 'text-gray-400' : item.utilidad > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {item.utilidad < 0 ? '-' : ''}{formatCurrency(Math.abs(item.utilidad))}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  {/* ── SUBTOTAL MES (solo ventas, sin gastos — igual al Excel del PM) ── */}
                  {(() => {
                    const prodRows = sortedSummaryData.filter(i => !i.product_name.includes('Gastos Generales'));
                    const expRows  = sortedSummaryData.filter(i => i.product_name.includes('Gastos Generales'));
                    const subtotVentas   = prodRows.reduce((s, i) => s + (i.ventas    || 0), 0);
                    const subtotLog      = prodRows.reduce((s, i) => s + (i.logistica || 0), 0);
                    const subtotDev      = prodRows.reduce((s, i) => s + (i.devolucion|| 0), 0);
                    const subtotAds      = prodRows.reduce((s, i) => s + (i.ads       || 0), 0);
                    const subtotProv     = prodRows.reduce((s, i) => s + (i.proveedor || 0), 0);
                    const subtotUtil     = prodRows.reduce((s, i) => s + (i.utilidad  || 0), 0);
                    const subtotUnidades = prodRows.reduce((s, i) => s + (i.cantidad  || 0), 0);
                    // Expense rows totals
                    const expLog  = expRows.reduce((s, i) => s + (i.logistica || 0), 0);
                    const expAds  = expRows.reduce((s, i) => s + (i.ads       || 0), 0);
                    const expProv = expRows.reduce((s, i) => s + (i.proveedor || 0), 0);
                    const expUtil = expRows.reduce((s, i) => s + (i.utilidad  || 0), 0);
                    const netaUtil = subtotUtil + expUtil; // expUtil is negative (costs)
                    const colSpanExtra = activeTab === 'global' ? 3 : activeTab === 'manual' ? 6 : 4;
                    return (
                      <tfoot className="text-gray-800 font-bold">
                        {/* ── SUBTOTAL productos (coincide con Excel del PM) ── */}
                        <tr className="bg-indigo-50/60 border-t-2 border-indigo-200">
                          <td className="px-6 py-3.5 text-xs font-bold uppercase tracking-widest text-indigo-700">
                            SUBTOTAL VENTAS
                            <span className="block text-[10px] font-normal text-indigo-400 normal-case tracking-normal">Solo costos derivados de ventas</span>
                          </td>
                          <td className="px-4 py-3.5 text-right text-indigo-700">{formatCurrency(subtotVentas)}</td>
                          {activeTab === 'global' ? (
                            <>
                              <td className="px-4 py-3.5 text-right text-indigo-600">{subtotUnidades}</td>
                              <td className="px-4 py-3.5 text-right text-indigo-600">—</td>
                              <td className="px-4 py-3.5 text-right text-indigo-600">{subtotVentas > 0 ? ((subtotUtil / subtotVentas) * 100).toFixed(1) : '0'}%</td>
                            </>
                          ) : activeTab === 'manual' ? (
                            <>
                              <td className="px-4 py-3.5 text-right text-amber-700">{formatCurrency(subtotProv)}</td>
                              <td className="px-3 py-3.5 text-right text-indigo-600">{formatCurrency(totalData?.split_seller_total)}</td>
                              <td className="px-3 py-3.5 text-right text-slate-600">{formatCurrency(totalData?.split_local_total)}</td>
                              <td className="px-3 py-3.5 text-right text-blue-600">{formatCurrency(totalData?.split_app_total)}</td>
                              <td className="px-3 py-3.5 text-right text-rose-600">{formatCurrency(totalData?.split_dev_total)}</td>
                              <td className="px-3 py-3.5 text-right text-emerald-600">{formatCurrency(totalData?.split_company_total)}</td>
                            </>
                          ) : (
                            <>
                              <td className="px-4 py-3.5 text-right text-amber-700">{formatCurrency(subtotProv)}</td>
                              <td className="px-4 py-3.5 text-right text-rose-700">{formatCurrency(subtotLog)}</td>
                              <td className="px-4 py-3.5 text-right text-rose-700">{formatCurrency(subtotDev)}</td>
                              <td className="px-4 py-3.5 text-right text-rose-700">{formatCurrency(subtotAds)}</td>
                            </>
                          )}
                          <td className="px-6 py-3.5 text-right text-base text-indigo-700">{formatCurrency(subtotUtil)}</td>
                        </tr>

                        {/* ── Separador Gastos Operativos ── */}
                        {expRows.length > 0 && (
                          <>
                            <tr className="bg-amber-50 border-t border-amber-200">
                              <td colSpan={2 + colSpanExtra + 1} className="px-6 py-2.5">
                                <div className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                                  <span className="text-xs font-bold text-amber-700 uppercase tracking-widest">Gastos Operativos Adicionales</span>
                                  <span className="text-[10px] text-amber-500 font-normal">No incluidos en el subtotal de ventas</span>
                                </div>
                              </td>
                            </tr>
                            {expRows.map((item, idx) => (
                              <tr key={`exp-${idx}`} className="bg-amber-50/40 hover:bg-amber-50 transition-colors border-t border-amber-100">
                                <td className="px-6 py-3 text-gray-700 font-medium pl-9 text-sm">
                                  <span className="text-amber-600 mr-1.5">•</span>
                                  {item.product_name.replace('Gastos Generales / Sin Asignar', 'Gastos sin producto asignado')}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-400 text-sm">—</td>
                                {activeTab === 'global' ? (
                                  <>
                                    <td className="px-4 py-3 text-right text-gray-400 text-sm">—</td>
                                    <td className="px-4 py-3 text-right text-gray-400 text-sm">—</td>
                                    <td className="px-4 py-3 text-right text-gray-400 text-sm">—</td>
                                  </>
                                ) : activeTab === 'manual' ? (
                                  <>
                                    <td className="px-4 py-3 text-right text-gray-500 text-sm">{formatCurrency(item.proveedor)}</td>
                                    <td className="px-3 py-3 text-right text-gray-400 text-sm">—</td>
                                    <td className="px-3 py-3 text-right text-gray-400 text-sm">—</td>
                                    <td className="px-3 py-3 text-right text-gray-400 text-sm">—</td>
                                    <td className="px-3 py-3 text-right text-gray-400 text-sm">—</td>
                                    <td className="px-3 py-3 text-right text-gray-400 text-sm">—</td>
                                  </>
                                ) : (
                                  <>
                                    <td className="px-4 py-3 text-right text-gray-500 text-sm">{formatCurrency(item.proveedor)}</td>
                                    <td className="px-4 py-3 text-right text-gray-500 text-sm">{formatCurrency(item.logistica)}</td>
                                    <td className="px-4 py-3 text-right text-gray-500 text-sm">{formatCurrency(item.devolucion)}</td>
                                    <td className="px-4 py-3 text-right text-gray-500 text-sm">{formatCurrency(item.ads)}</td>
                                  </>
                                )}
                                <td className="px-6 py-3 text-right text-sm font-semibold text-rose-600">
                                  {formatCurrency(item.utilidad)}
                                </td>
                              </tr>
                            ))}
                            {/* Sub-total gastos */}
                            <tr className="bg-amber-100/60 border-t border-amber-300">
                              <td colSpan={2 + colSpanExtra} className="px-6 py-3 text-right text-xs font-bold text-amber-700 uppercase tracking-wider">
                                Total Gastos Operativos adicionales
                              </td>
                              <td className="px-6 py-3 text-right text-sm font-bold text-rose-700">{formatCurrency(expUtil)}</td>
                            </tr>
                          </>
                        )}

                        {/* ── UTILIDAD NETA FINAL ── */}
                        <tr className="bg-emerald-50 border-t-2 border-emerald-300">
                          <td colSpan={2 + colSpanExtra} className="px-6 py-4 text-right text-sm font-extrabold text-emerald-800 uppercase tracking-widest">
                            UTILIDAD NETA FINAL
                          </td>
                          <td className={`px-6 py-4 text-right text-xl font-extrabold tracking-wide ${netaUtil >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {formatCurrency(netaUtil)}
                          </td>
                        </tr>
                      </tfoot>
                    );
                  })()}
                </table>
              )}
            </div>
          </div>

          {/* ── 3. Sección de Gráficas (solo Global) ── */}
          {activeTab === 'global' && (summaryData.length > 0 || trendData.some(d => d.ventas > 0)) && (
            <div className="space-y-4 animate-in fade-in duration-700">
              <div className="flex items-center gap-2 px-1">
                <BarChart2 className="w-5 h-5 text-indigo-500" />
                <h3 className="text-lg font-bold text-gray-800 tracking-tight">Inteligencia Visual</h3>
                <span className="text-xs font-medium bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                  {selectedMonth} · {activeTab === 'global' ? 'Consolidado' : activeTab === 'csv' ? 'E-commerce' : 'Tienda Física'}
                </span>
              </div>

              {/* Row 1: Barras agrupadas + Donut costos */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <ChartCard title="Ingresos vs Costos vs Utilidad" subtitle="Comparativa del mes en moneda" className="lg:col-span-2">
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={barOverviewData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }} barCategoryGap="30%">
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={52} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                        <Bar dataKey="Ventas"   fill={CHART_COLORS.ventas}   radius={[6,6,0,0]} />
                        <Bar dataKey="Costos"   fill={CHART_COLORS.costos}   radius={[6,6,0,0]} />
                        <Bar dataKey="Utilidad" fill={CHART_COLORS.utilidad} radius={[6,6,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                <ChartCard title="Distribución de Costos" subtitle="¿Dónde se va el dinero?">
                  {costDonutData.length > 0 ? (
                    <div className="h-52 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={costDonutData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                            {costDonutData.map((entry, i) => <Cell key={i} fill={entry.fill} stroke="none" />)}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                          <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, lineHeight: '1.8' }}
                            formatter={(value, entry) => (
                              <span style={{ color: '#475569' }}>{value} <strong>{entry.payload.pct}%</strong></span>
                            )}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-52 flex items-center justify-center text-gray-400 text-sm">Sin datos de costos</div>
                  )}
                </ChartCard>
              </div>

              {/* Row 2: Top 5 + Tendencia */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Top 5 Productos por Utilidad" subtitle="Ranking del mes">
                  {top5Data.length > 0 ? (
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={top5Data} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                          <XAxis type="number" tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }} axisLine={false} tickLine={false} width={100} />
                          <Tooltip content={<CustomTooltip />} />
                          <Bar dataKey="Utilidad" fill={CHART_COLORS.utilidad} radius={[0,6,6,0]}>
                            <LabelList dataKey="Utilidad" position="right" formatter={v => fmt$(v)} style={{ fontSize: 11, fill: '#10b981', fontWeight: 700 }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-52 flex items-center justify-center text-gray-400 text-sm">Sin datos de productos</div>
                  )}
                </ChartCard>

                <ChartCard title="Evolución Últimos 6 Meses" subtitle="Tendencia de ventas y utilidad">
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                        <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={48} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                        <Line type="monotone" dataKey="ventas"   name="Ventas"   stroke={CHART_COLORS.ventas}   strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLORS.ventas }}   activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="utilidad" name="Utilidad" stroke={CHART_COLORS.utilidad} strokeWidth={2.5} dot={{ r: 4, fill: CHART_COLORS.utilidad }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="costos"   name="Costos"   stroke={CHART_COLORS.costos}   strokeWidth={2}   strokeDasharray="5 4" dot={{ r: 3, fill: CHART_COLORS.costos }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </div>

              {/* Chart 4 — Reparto comisiones (solo manual) */}
              {activeTab === 'manual' && splitDonutData.length > 0 && (
                <ChartCard title="Reparto de Utilidad — Liquidación de Comisiones" subtitle="Distribución del beneficio neto entre los participantes del negocio">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={splitDonutData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                            {splitDonutData.map((entry, i) => <Cell key={i} fill={entry.fill} stroke="none" />)}
                          </Pie>
                          <Tooltip content={<CustomPieTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex flex-col gap-2">
                      {splitDonutData.map((entry, i) => (
                        <div key={i} className="flex items-center justify-between bg-gray-50 px-4 py-2.5 rounded-lg border border-gray-100">
                          <div className="flex items-center gap-2.5">
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: entry.fill }} />
                            <span className="text-sm font-semibold text-gray-700">{entry.name}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-bold text-gray-900">{formatCurrency(entry.value)}</span>
                            <span className="block text-xs text-gray-400">{entry.pct}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </ChartCard>
              )}
            </div>
          )}

          {/* ── 3b. Donut Comisiones — solo tab Manual ── */}
          {activeTab === 'manual' && splitDonutData.length > 0 && (
            <ChartCard
              title="Reparto de Utilidad — Liquidación de Comisiones"
              subtitle="Distribución del beneficio neto entre los participantes del negocio"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
                <div className="h-56">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={splitDonutData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                        {splitDonutData.map((entry, i) => <Cell key={i} fill={entry.fill} stroke="none" />)}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col gap-2">
                  {splitDonutData.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-50 px-4 py-2.5 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-2.5">
                        <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: entry.fill }} />
                        <span className="text-sm font-semibold text-gray-700">{entry.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-gray-900">{formatCurrency(entry.value)}</span>
                        <span className="block text-xs text-gray-400">{entry.pct}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          )}

          {/* ── 4. Egresos Operativos ── */}
          {expensesList.length > 0 && (
            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden animate-in fade-in duration-500">
              <button onClick={() => setIsExpensesOpen(!isExpensesOpen)} className="p-6 w-full text-left flex justify-between items-center bg-gray-50/50 hover:bg-gray-100/60 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500/30">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-rose-100 rounded-lg flex items-center justify-center flex-shrink-0"><TrendingDown className="w-6 h-6 text-rose-600" /></div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">Egresos Operativos</h3>
                    <p className="text-sm text-gray-500 mt-1">Total de este mes: <span className="font-bold text-rose-600">{formatCurrency(expenseSummary.total)}</span></p>
                  </div>
                </div>
                <ChevronDown className={`w-6 h-6 text-gray-400 transition-transform duration-300 ${isExpensesOpen ? 'rotate-180' : ''}`} />
              </button>

              <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpensesOpen ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="border-t border-gray-200">
                  <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h3 className="text-lg font-bold text-gray-800 tracking-tight">Análisis de Egresos</h3>
                      <p className="text-sm text-gray-500 mt-1">Filtra y busca para auditar los gastos.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                      <div className="relative flex-grow md:flex-grow-0">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input type="text" placeholder="Buscar..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all" />
                      </div>
                      <div className="relative">
                        <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)} className="pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm appearance-none cursor-pointer font-medium text-gray-600 focus:ring-2 focus:ring-indigo-500/20">
                          {expenseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
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
                              <div className={`${theme.bar} h-2.5 rounded-full`} style={{ width: `${percentage}%` }} />
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
                              <td className="px-6 py-5 whitespace-nowrap text-gray-500 font-medium pl-8">{formatDate(exp.expense_date)}</td>
                              <td className="px-6 py-5 whitespace-nowrap">
                                <span className={`${theme.badge} px-2.5 py-1 rounded-md text-xs font-bold border`}>{exp.category}</span>
                              </td>
                              <td className="px-6 py-5">
                                <div className="font-semibold text-gray-800">{exp.product_name || exp.description || 'Gasto sin concepto'}</div>
                                {exp.product_name && exp.description && <div className="text-xs text-gray-500 italic">{exp.description}</div>}
                                {roi && (
                                  <div className="mt-1 flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5 text-emerald-500" />
                                    <span className="text-emerald-600 text-xs font-bold">{roi}% de impacto en ventas</span>
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap text-right font-bold text-gray-800 text-base">{formatCurrency(exp.amount)}</td>
                              <td className="px-6 py-5 text-center">
                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-md border ${
                                  exp.target_source === 'csv'    ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                  exp.target_source === 'manual' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                  'bg-orange-50 text-orange-700 border-orange-200'
                                }`}>
                                  {exp.target_source === 'csv' ? <Globe className="w-3.5 h-3.5" /> : exp.target_source === 'manual' ? <Store className="w-3.5 h-3.5" /> : <Settings className="w-3.5 h-3.5" />}
                                  {exp.target_source === 'csv' ? 'E-com' : exp.target_source === 'manual' ? 'Tienda' : 'Global'}
                                </span>
                              </td>
                              <td className="px-6 py-5 whitespace-nowrap text-right pr-8">
                                <div className="flex justify-end items-center gap-1 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                  <button onClick={() => openFormForEditing(exp)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Editar"><Edit2 className="w-4 h-4" /></button>
                                  <button onClick={() => triggerDelete(exp)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {filteredExpenses.length === 0 && (
                      <div className="p-12 text-center">
                        <div className="bg-gray-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"><Search className="w-8 h-8 text-gray-400" /></div>
                        <p className="text-gray-500 font-medium">No se encontraron gastos con estos filtros.</p>
                        <button onClick={() => { setSearchTerm(''); setFilterCategory('Todas'); }} className="text-indigo-600 text-sm mt-2 font-bold hover:underline">Limpiar filtros</button>
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
