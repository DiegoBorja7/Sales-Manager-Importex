import { useState } from 'react';
import { PackageOpen, AlertCircle, Edit2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const SalesTable = ({ sales, isLoading, onEdit, onDelete }) => {
  const [sortOrder, setSortOrder] = useState('asc');

  // Sort sales based on date
  const sortedSales = sales ? [...sales].sort((a, b) => {
    const dateA = new Date(a.sale_date);
    const dateB = new Date(b.sale_date);
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  }) : [];

  // Format as USD currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Format Date to "01-marzo-2026"
  const formatDate = (dateString) => {
    // If it's empty, avoid Invalid Date errors
    if (!dateString) return '';
    // Append T12:00:00 to prevent timezone shifting issues when parsing YYYY-MM-DD
    const date = new Date(`${dateString}T12:00:00`);

    const day = date.getDate().toString().padStart(2, '0');
    // Using simple array for months to match exactly the required Spanish format "marzo"
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const month = months[date.getMonth()];
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  };

  if (isLoading) {
    return (
      <div className="w-full h-64 flex flex-col items-center justify-center text-gray-400 bg-white/50 backdrop-blur-sm">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 border-4 border-gray-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
        </div>
        <p className="font-medium mt-4 text-sm tracking-wide text-gray-500 animate-pulse">Obteniendo registros...</p>
      </div>
    );
  }

  if (!sales || sales.length === 0) {
    return (
      <div className="w-full h-80 flex flex-col items-center justify-center text-gray-500 bg-gray-50/30">
        <div className="w-20 h-20 bg-gray-100/80 rounded-full flex items-center justify-center mb-5 ring-8 ring-gray-50/50">
          <PackageOpen className="w-10 h-10 text-gray-400" />
        </div>
        <h3 className="text-xl font-semibold text-gray-700">No se encontraron ventas</h3>
        <p className="text-sm mt-2 text-center max-w-sm text-gray-500 leading-relaxed">Aún no hay registros con estado "entregado" en la base de datos o que coincidan con tu búsqueda. Importa un CSV o registra una venta manual para comenzar.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
      <table className="w-full text-sm text-left align-middle border-collapse isolate">
        <thead className="text-xs text-gray-500 uppercase bg-gray-50/95 backdrop-blur-md sticky top-0 z-10 border-b border-gray-200 shadow-sm">
          <tr>
            <th
              scope="col"
              className="px-6 py-4 font-bold tracking-wider w-32 cursor-pointer hover:bg-gray-100 transition-colors select-none group"
              onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            >
              <div className="flex items-center gap-1">
                Fecha
                {sortOrder === 'desc' ? (
                  <ChevronDown className="w-4 h-4 text-blue-500 opacity-80" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-blue-500 opacity-80" />
                )}
              </div>
            </th>
            <th scope="col" className="px-6 py-4 font-bold tracking-wider">Producto</th>
            <th scope="col" className="px-6 py-4 font-bold tracking-wider text-center w-24">Cant.</th>
            <th scope="col" className="px-6 py-4 font-bold tracking-wider text-right">Monto Venta</th>
            <th scope="col" className="px-6 py-4 font-bold tracking-wider">Vendedor</th>
            <th scope="col" className="px-6 py-4 font-bold tracking-wider text-center w-28">Origen</th>
            <th scope="col" className="px-6 py-4 font-bold tracking-wider text-center w-24">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100/80 bg-white">
          {sortedSales.map((sale) => (
            <tr key={sale.id} className="hover:bg-blue-50/40 transition-colors group cursor-default">
              <td className="px-6 py-4.5 text-gray-500 font-medium whitespace-nowrap">
                {formatDate(sale.sale_date)}
              </td>

              <td className="px-6 py-4.5 font-semibold text-gray-800">
                {sale.product_name}
              </td>

              <td className="px-6 py-4.5 text-gray-600 text-center font-medium bg-gray-50/30 group-hover:bg-transparent transition-colors">
                {sale.quantity}
              </td>

              <td className="px-6 py-4.5 text-gray-700 text-right font-semibold">
                {formatCurrency(sale.sale_price)}
              </td>

              <td className="px-6 py-4.5 text-gray-600 font-medium">
                {sale.seller || <span className="text-gray-300 italic font-normal">No asignado</span>}
              </td>

              <td className="px-6 py-4.5 text-center">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider
                  ${sale.source === 'csv'
                    ? 'bg-blue-100 text-blue-700 border border-blue-200/60'
                    : 'bg-purple-100 text-purple-700 border border-purple-200/60'}`}>
                  {sale.source}
                </span>
              </td>

              <td className="px-6 py-4.5 text-center whitespace-nowrap">
                <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => onEdit(sale)}
                    className="p-1.5 text-blue-500 hover:text-blue-700 hover:bg-blue-100 rounded-md transition-colors tooltip-trigger"
                    title="Editar venta"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(sale.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                    title="Eliminar registro"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="bg-gray-50/80 px-6 py-4 border-t border-gray-200 text-xs text-gray-500 flex justify-between items-center backdrop-blur-sm">
        <span className="font-medium">Mostrando <strong className="text-gray-900">{sales.length}</strong> resultados</span>
        <span className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm font-medium">
          <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
          Solo estado <span className="text-blue-600 uppercase tracking-wide text-[10px]">Entregado</span>
        </span>
      </div>
    </div>
  );
};

export default SalesTable;
