import React, { useState } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { Save, X, Info } from 'lucide-react';

const rawApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_URL = rawApiUrl.replace(/\/+$/, '');

const CATEGORIES = [
  'Logística', 
  'Facebook Ads', 
  'TikTok Ads', 
  'Devoluciones', 
  'Proveedor', 
  'Generales', 
  'Imprevistos'
];

const ExpenseForm = ({ onSuccess, onCancel, availableProducts = [], initialData = null }) => {
  const [formData, setFormData] = useState({
    expense_date: initialData?.expense_date || new Date().toISOString().split('T')[0],
    category: initialData?.category || 'Facebook Ads',
    amount: initialData?.amount || '',
    product_name: initialData?.product_name || '', // Empty means generic/prorated
    description: initialData?.description || '',
    target_source: initialData?.target_source || 'global'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => {
      const newState = { ...prev, [name]: value };
      
      // Smart defaulting: Ads are usually for E-commerce
      if (name === 'category' && (value === 'Facebook Ads' || value === 'TikTok Ads')) {
        newState.target_source = 'csv';
      }
      
      return newState;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.expense_date || !formData.category || !formData.amount) {
      toast.error('Fecha, categoría y monto son obligatorios');
      return;
    }

    if (parseFloat(formData.amount) <= 0) {
      toast.error('El monto debe ser mayor a cero');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
          ...formData,
          amount: parseFloat(formData.amount),
          product_name: formData.product_name.trim() === '' ? null : formData.product_name.trim()
      };
      
      if (initialData?.id) {
          await axios.put(`${API_URL}/api/expenses/${initialData.id}`, payload);
          toast.success('Gasto actualizado con éxito');
      } else {
          await axios.post(`${API_URL}/api/expenses`, payload);
          toast.success('Gasto registrado con éxito');
      }
      
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error guardando gasto:', error);
      toast.error('Error al guardar el gasto operativo');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-auto overflow-hidden animate-in fade-in zoom-in duration-200">
      <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center border-b border-indigo-700">
        <h3 className="text-xl font-bold text-white tracking-wide">
          Nuevo Gasto Operativo
        </h3>
        <button
          onClick={onCancel}
          className="text-indigo-200 hover:text-white hover:bg-indigo-500 rounded-full p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5 bg-gray-50/50">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Fecha */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Fecha de Gasto <span className="text-rose-500">*</span></label>
            <input
              type="date"
              name="expense_date"
              value={formData.expense_date}
              onChange={handleChange}
              className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 bg-white"
              required
            />
          </div>

          {/* Categoría */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Categoría <span className="text-rose-500">*</span></label>
            <select
              name="category"
              value={formData.category}
              onChange={handleChange}
              className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 bg-white"
              required
            >
              <option value="" disabled>Seleccione...</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Origen del Gasto (Target Source) */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Afectación Financiera (Submódulo) <span className="text-rose-500">*</span></label>
          <select
            name="target_source"
            value={formData.target_source}
            onChange={handleChange}
            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 bg-white"
            required
          >
            <option value="global">Global (Tienda Completa)</option>
            <option value="csv">E-Commerce / Dropi (CSV)</option>
            <option value="manual">Local Físico / Ventas Directas</option>
          </select>
        </div>

        {/* Amount */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Monto Total (USD) <span className="text-rose-500">*</span></label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-gray-500 sm:text-sm font-semibold">$</span>
            </div>
            <input
              type="number"
              step="0.01"
              min="0.01"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              placeholder="0.00"
              className="w-full pl-8 border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-800 bg-white font-medium text-lg"
              required
            />
          </div>
        </div>

        {/* Producto (Opcional) */}
        <div className="space-y-1.5 pt-1 border-t border-gray-200 mt-4 pt-4">
          <label className="flex items-center gap-2 text-xs font-bold text-gray-700 uppercase tracking-wider">
            Producto Vinculado 
            <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded tracking-normal normal-case font-medium">Opcional</span>
          </label>
          <div className="relative flex items-center group">
            <input
              type="text"
              name="product_name"
              list="product-list"
              value={formData.product_name}
              onChange={handleChange}
              placeholder="Ej: FilmPro® (Dejar en blanco para gastos globales)"
              className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 bg-white"
            />
            <datalist id="product-list">
              {availableProducts.map(p => <option key={p} value={p} />)}
            </datalist>
          </div>
          <p className="text-[11px] text-gray-500 mt-1 flex items-start gap-1">
            <Info className="w-3.5 h-3.5 inline text-indigo-400 flex-shrink-0" />
            Si el gasto es a nivel de tienda (ej. Ads generales de marca), déjalo en blanco para restarlo a la utilidad global.
          </p>
        </div>

        {/* Descripción */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Descripción / Notas</label>
          <input
            type="text"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Ej: Pauta semana 1 campaña Black Friday"
            className="w-full border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-gray-700 bg-white placeholder-gray-400"
          />
        </div>

        {/* Actions */}
        <div className="pt-6 flex justify-end gap-3 border-t border-gray-200 mt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 inline-flex items-center gap-2 bg-indigo-600 border border-transparent rounded-lg text-sm font-semibold text-white shadow-sm shadow-indigo-500/30 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-all active:scale-95"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Guardando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Guardar Gasto
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExpenseForm;
