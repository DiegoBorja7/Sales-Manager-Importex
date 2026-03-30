import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { salesApi } from '../services/salesApi';
import { productApi } from '../services/productApi';
import { Save, X } from 'lucide-react';

const SalesForm = ({ onSuccess, onCancel, initialData }) => {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    productApi.getProducts(1, 50, { nopage: true })
      .then(setProducts)
      .catch(() => toast.error('Error al cargar catálogo'));
  }, []);

  const [formData, setFormData] = useState({
    sale_date: initialData?.sale_date || new Date().toISOString().split('T')[0],
    product_id: initialData?.product_id || '',
    quantity: initialData?.quantity || 1,
    purchase_price: initialData?.purchase_price || '',
    sale_price: initialData?.sale_price || '',
    seller: initialData?.seller || '',
    payment_method: initialData?.payment_method || 'Efectivo'
  });

  // Reset form when switching between Edit and New mode
  useEffect(() => {
    setFormData({
      sale_date: initialData?.sale_date || new Date().toISOString().split('T')[0],
      product_id: initialData?.product_id || '',
      quantity: initialData?.quantity || 1,
      purchase_price: initialData?.purchase_price || '',
      sale_price: initialData?.sale_price || '',
      seller: initialData?.seller || '',
      payment_method: initialData?.payment_method || 'Efectivo'
    });
  }, [initialData]);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProductChange = (e) => {
    const productId = e.target.value;
    const selectedProd = products.find(p => p.id === parseInt(productId));
    if (selectedProd) {
      setFormData(prev => ({
        ...prev,
        product_id: productId,
        purchase_price: selectedProd.purchase_price,
        sale_price: selectedProd.sale_price,
      }));
    } else {
      setFormData(prev => ({ ...prev, product_id: productId }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.product_id || !formData.sale_date || !formData.quantity || formData.purchase_price === '' || formData.sale_price === '') {
      toast.error('Por favor completa todos los campos obligatorios');
      return;
    }

    if (formData.quantity <= 0 || formData.purchase_price < 0 || formData.sale_price < 0) {
      toast.error('Los valores numéricos deben ser positivos');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const payload = {
        ...formData,
        product_id: parseInt(formData.product_id, 10),
        quantity: parseInt(formData.quantity, 10),
        purchase_price: parseFloat(formData.purchase_price),
        sale_price: parseFloat(formData.sale_price),
      };

      // Call real API - Choose between CREATE or UPDATE based on initialData
      if (initialData && initialData.id) {
        await salesApi.updateSale(initialData.id, payload);
        toast.success('Cambios guardados exitosamente');
      } else {
        await salesApi.createSale(payload);
        toast.success('Venta manual registrada exitosamente');
      }
      
      onSuccess(); // Trigger parent refresh and close form
      
    } catch (error) {
      console.error(error);
      toast.error('Error al registrar la venta. Revisa la conexión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white/80 backdrop-blur-md p-6 sm:p-8 rounded-2xl shadow-sm border border-gray-100/80 mb-6 transition-all">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
        <div>
          <h3 className="text-lg font-bold text-gray-800">
            {initialData ? 'Editar Venta' : 'Registrar Venta Manual'}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {initialData ? 'Actualiza los detalles financieros del registro.' : 'Ingresa los detalles financieros. El cálculo de utilidad será automático.'}
          </p>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-xl transition-all active:scale-95">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Fecha */}
          <div className="space-y-1.5 border border-transparent focus-within:border-blue-100 focus-within:bg-blue-50/20 p-2 -m-2 rounded-xl transition-colors">
            <label className="block text-[13px] font-semibold text-gray-700 ml-1">Fecha de Venta <span className="text-red-400">*</span></label>
            <input 
              type="date" 
              name="sale_date"
              value={formData.sale_date}
              onChange={handleChange}
              disabled={isSubmitting}
              className="mt-1 block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 transition-shadow" 
              required
            />
          </div>

          {/* Producto */}
          <div className="space-y-1.5 border border-transparent focus-within:border-blue-100 focus-within:bg-blue-50/20 p-2 -m-2 rounded-xl transition-colors">
            <label className="block text-[13px] font-semibold text-gray-700 ml-1">Producto <span className="text-red-400">*</span></label>
            <select
              name="product_id"
              value={formData.product_id}
              onChange={handleProductChange}
              disabled={isSubmitting}
              className="mt-1 block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 transition-shadow disabled:bg-gray-50"
              required
            >
              <option value="" disabled>Seleccione en catálogo</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} (Stock: {p.stock})
                </option>
              ))}
            </select>
            {formData.product_id && (
              <p className="text-xs text-blue-600 ml-1 mt-1 font-medium">Auto-completado de precios activado</p>
            )}
          </div>

          {/* Vendedor */}
          <div className="space-y-1.5 border border-transparent focus-within:border-blue-100 focus-within:bg-blue-50/20 p-2 -m-2 rounded-xl transition-colors">
            <label className="block text-[13px] font-semibold text-gray-700 ml-1">Vendedor / Asesor</label>
            <input 
              type="text" 
              name="seller"
              placeholder="Nombre del asesor (opcional)"
              value={formData.seller}
              onChange={handleChange}
              disabled={isSubmitting}
              className="mt-1 block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 transition-shadow" 
            />
          </div>

          {/* Cantidad */}
          <div className="space-y-1.5 border border-transparent focus-within:border-blue-100 focus-within:bg-blue-50/20 p-2 -m-2 rounded-xl transition-colors">
            <label className="block text-[13px] font-semibold text-gray-700 ml-1">Cant. de Unidades <span className="text-red-400">*</span></label>
            <input 
              type="number" 
              name="quantity"
              min="1"
              value={formData.quantity}
              onChange={handleChange}
              disabled={isSubmitting}
              className="mt-1 block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm shadow-sm placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 transition-shadow" 
              required
            />
          </div>

          {/* Costo Proveedor */}
          <div className="space-y-1.5 border border-transparent p-2 -m-2 rounded-xl transition-colors opacity-80">
            <label className="block text-[13px] font-semibold text-gray-700 ml-1 flex items-center gap-1.5">
              Costo Unitario ($) 
              <span className="text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded tracking-wide">FIJADO POR BODEGA</span>
            </label>
            <div className="relative mt-1 rounded-xl shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-gray-400 sm:text-sm font-medium">$</span>
              </div>
              <input 
                type="number" 
                name="purchase_price"
                value={formData.purchase_price}
                readOnly
                className="block w-full pl-7 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none transition-shadow cursor-not-allowed select-none text-gray-500 font-bold" 
                title="El costo se extrae automáticamente del Catálogo de Inventario"
              />
            </div>
          </div>

          {/* Precio Venta */}
          <div className="space-y-1.5 border border-transparent focus-within:border-emerald-100 focus-within:bg-emerald-50/20 p-2 -m-2 rounded-xl transition-colors">
            <label className="block text-[13px] font-semibold text-emerald-700 ml-1">Precio Venta Total ($) <span className="text-red-400">*</span></label>
            <div className="relative mt-1 rounded-xl shadow-sm">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <span className="text-emerald-500 sm:text-sm font-medium">$</span>
              </div>
              <input 
                type="number" 
                name="sale_price"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.sale_price}
                onChange={handleChange}
                disabled={isSubmitting}
                className="block w-full pl-7 pr-4 py-2.5 bg-white border border-emerald-200 rounded-xl text-sm focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60 transition-shadow" 
                required
              />
            </div>
          </div>

          {/* Método de Pago */}
          <div className="space-y-1.5 border border-transparent focus-within:border-blue-100 focus-within:bg-blue-50/20 p-2 -m-2 rounded-xl transition-colors">
            <label className="block text-[13px] font-semibold text-gray-700 ml-1">Método de Pago</label>
            <select
              name="payment_method"
              value={formData.payment_method}
              onChange={handleChange}
              disabled={isSubmitting}
              className="mt-1 block w-full px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 transition-shadow"
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
        </div>

        <div className="pt-4 flex justify-end gap-3 mt-8 border-t border-gray-100/80">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-5 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-200 disabled:opacity-60 transition-all active:scale-95"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-br from-blue-600 to-blue-700 border border-transparent rounded-xl shadow-lg shadow-blue-500/30 text-sm font-bold text-white hover:from-blue-500 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:from-blue-400 disabled:to-blue-400 transition-all active:scale-95"
          >
            {isSubmitting ? (
               <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
             ) : (
               <Save className="w-4 h-4" />
             )}
            {isSubmitting ? 'Procesando...' : (initialData ? 'Guardar Cambios' : 'Confirmar Venta')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SalesForm;
