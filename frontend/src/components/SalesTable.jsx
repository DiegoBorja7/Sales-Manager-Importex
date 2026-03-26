import { useState, useRef, useEffect } from 'react';
import { PackageOpen, AlertCircle, Edit2, Trash2, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Clock, ArrowDown, SearchX } from 'lucide-react';

const SalesTable = ({ sales, isLoading, onEdit, onDelete, lastUpdated, currentPage, totalPages, totalRecords, onPageChange, hasActiveFilters, onClearFilters }) => {
  const [sortOrder, setSortOrder] = useState('asc');
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const scrollRef = useRef(null);

  // Track scroll position to show/hide the floating button
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
      setShowScrollBtn(!isNearBottom && el.scrollHeight > el.clientHeight + 200);
    };
    handleScroll(); // initial check
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [sales]);

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
      <div className="w-full overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead className="bg-gray-50/95 border-b border-gray-200">
            <tr>
              {['Fecha', 'Producto', 'Cant.', 'Precio Compra', 'Precio Venta', 'Vendedor', 'Origen', ''].map((h, i) => (
                <th key={i} className="px-6 py-3.5 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="px-6 py-4"><div className="h-4 w-20 bg-gray-200 rounded-md animate-pulse" style={{ animationDelay: `${i * 80}ms` }} /></td>
                <td className="px-6 py-4"><div className="h-4 w-36 bg-gray-200 rounded-md animate-pulse" style={{ animationDelay: `${i * 80 + 40}ms` }} /></td>
                <td className="px-6 py-4"><div className="h-4 w-8 bg-gray-200 rounded-md animate-pulse mx-auto" style={{ animationDelay: `${i * 80 + 80}ms` }} /></td>
                <td className="px-6 py-4"><div className="h-4 w-16 bg-gray-200 rounded-md animate-pulse" style={{ animationDelay: `${i * 80 + 120}ms` }} /></td>
                <td className="px-6 py-4"><div className="h-4 w-16 bg-gray-200 rounded-md animate-pulse" style={{ animationDelay: `${i * 80 + 160}ms` }} /></td>
                <td className="px-6 py-4"><div className="h-4 w-24 bg-gray-200 rounded-md animate-pulse" style={{ animationDelay: `${i * 80 + 200}ms` }} /></td>
                <td className="px-6 py-4"><div className="h-5 w-12 bg-gray-200 rounded-md animate-pulse mx-auto" style={{ animationDelay: `${i * 80 + 240}ms` }} /></td>
                <td className="px-6 py-4"><div className="h-4 w-14 bg-gray-100 rounded-md" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (!sales || sales.length === 0) {
    return (
      <div className="w-full h-80 flex flex-col items-center justify-center text-gray-500 bg-gray-50/30">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 ring-8 ring-gray-50/50 ${
          hasActiveFilters ? 'bg-amber-100/80' : 'bg-gray-100/80'
        }`}>
          {hasActiveFilters 
            ? <SearchX className="w-10 h-10 text-amber-500" />
            : <PackageOpen className="w-10 h-10 text-gray-400" />
          }
        </div>
        <h3 className="text-xl font-semibold text-gray-700">
          {hasActiveFilters ? 'Sin resultados para tu búsqueda' : 'No se encontraron ventas'}
        </h3>
        <p className="text-sm mt-2 text-center max-w-sm text-gray-500 leading-relaxed">
          {hasActiveFilters 
            ? 'Ningún registro coincide con los filtros aplicados. Prueba con otros términos o limpia los filtros.'
            : 'Aún no hay registros con estado "entregado". Importa un CSV o registra una venta manual para comenzar.'
          }
        </p>
        {hasActiveFilters && onClearFilters && (
          <button
            onClick={onClearFilters}
            className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-semibold hover:bg-amber-100 transition-all active:scale-95"
          >
            Limpiar filtros
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <div ref={scrollRef} className="overflow-x-auto overflow-y-auto max-h-[600px] scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent">
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
                <div className="flex items-center justify-center gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
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
      </div>

      {/* Floating scroll-to-bottom button */}
      {showScrollBtn && (
        <button
          onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })}
          className="absolute bottom-24 right-6 z-20 w-9 h-9 bg-blue-600 text-white rounded-full shadow-lg shadow-blue-500/40 flex items-center justify-center hover:bg-blue-700 hover:shadow-xl hover:scale-110 active:scale-95 transition-all animate-bounce"
          title="Ir al final de la tabla"
        >
          <ArrowDown className="w-4 h-4" />
        </button>
      )}

      <div className="bg-gray-50/80 px-6 py-4 border-t border-gray-200 text-xs text-gray-500 backdrop-blur-sm">
        {/* Row 1: Record count + Last Updated + Status */}
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-medium">Mostrando <strong className="text-gray-900">{sales.length}</strong> de <strong className="text-gray-900">{totalRecords}</strong> resultados</span>
            {lastUpdated && (
              <span className="flex items-center gap-1.5 text-gray-400 font-medium">
                <Clock className="w-3.5 h-3.5" />
                Actualizado: {lastUpdated.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })}{' '}
                {lastUpdated.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </span>
            )}
          </div>
          <span className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-md border border-gray-200 shadow-sm font-medium">
            <AlertCircle className="w-3.5 h-3.5 text-blue-500" />
            Solo estado <span className="text-blue-600 uppercase tracking-wide text-[10px]">Entregado</span>
          </span>
        </div>

        {/* Row 2: Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-1.5 mt-3 pt-3 border-t border-gray-200/60">
            <button
              onClick={() => onPageChange(1)}
              disabled={currentPage <= 1}
              className="flex items-center gap-0.5 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
              title="Primera página"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 1}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Anterior
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                let pageNum;
                if (totalPages <= 7) {
                  pageNum = i + 1;
                } else if (currentPage <= 4) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 3) {
                  pageNum = totalPages - 6 + i;
                } else {
                  pageNum = currentPage - 3 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => onPageChange(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                      pageNum === currentPage
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 border border-blue-700'
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
            >
              Siguiente
              <ChevronRight className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => onPageChange(totalPages)}
              disabled={currentPage >= totalPages}
              className="flex items-center gap-0.5 px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-500 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-95 shadow-sm"
              title="Última página"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SalesTable;
