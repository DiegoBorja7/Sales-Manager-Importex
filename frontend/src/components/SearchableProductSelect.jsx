import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Check, X, Package } from 'lucide-react';

const SearchableProductSelect = ({ products, value, onChange, disabled, placeholder = "Buscar producto..." }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const wrapperRef = useRef(null);

  // Synchronize internal state with parent value
  useEffect(() => {
    if (value) {
      const prod = products.find(p => p.id === parseInt(value));
      setSelectedProduct(prod || null);
    } else {
      setSelectedProduct(null);
    }
  }, [value, products]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSelect = (product) => {
    onChange({ target: { name: 'product_id', value: product.id.toString() } });
    setIsOpen(false);
    setSearchTerm('');
  };

  const clearSelection = (e) => {
    e.stopPropagation();
    onChange({ target: { name: 'product_id', value: '' } });
    setSelectedProduct(null);
    setSearchTerm('');
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div 
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between w-full px-4 py-2.5 bg-white border rounded-xl text-sm shadow-sm cursor-pointer transition-all
          ${disabled ? 'opacity-60 bg-gray-50 cursor-not-allowed' : 'hover:border-blue-400 focus-within:ring-2 focus-within:ring-blue-500/20'}
          ${isOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200'}
        `}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          {selectedProduct ? (
            <>
              <Package className="w-4 h-4 text-blue-500 flex-shrink-0" />
              <span className="truncate font-medium text-gray-900">{selectedProduct.name}</span>
            </>
          ) : (
            <span className="text-gray-400">{placeholder}</span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          {selectedProduct && !disabled && (
            <X 
              className="w-4 h-4 text-gray-400 hover:text-red-500 transition-colors bg-gray-100 hover:bg-red-50 rounded-full p-0.5" 
              onClick={clearSelection}
            />
          ) }
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-3 border-b border-gray-50 bg-gray-50/50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                autoFocus
                type="text"
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                placeholder="Escribe el nombre del producto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
          
          <ul className="max-h-72 overflow-y-auto py-1 scroll-smooth">
            {filteredProducts.length > 0 ? (
              filteredProducts.map((p) => (
                <li
                  key={p.id}
                  onClick={() => handleSelect(p)}
                  className={`
                    px-4 py-3 cursor-pointer flex items-center justify-between transition-colors
                    ${value === p.id.toString() ? 'bg-blue-50' : 'hover:bg-gray-50'}
                  `}
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className={`text-[13px] font-semibold truncate ${value === p.id.toString() ? 'text-blue-700' : 'text-gray-800'}`}>
                      {p.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                        p.stock > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        Stock: {p.stock}
                      </span>
                      {p.sku && <span className="text-[10px] text-gray-400 font-medium">SKU: {p.sku}</span>}
                    </div>
                  </div>
                  {value === p.id.toString() && <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />}
                </li>
              ))
            ) : (
              <div className="px-4 py-8 text-center space-y-2">
                <Package className="w-8 h-8 text-gray-200 mx-auto" />
                <p className="text-sm text-gray-400 italic">No se encontraron productos...</p>
              </div>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SearchableProductSelect;
