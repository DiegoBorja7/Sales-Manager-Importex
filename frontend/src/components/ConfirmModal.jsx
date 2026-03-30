import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ 
  isOpen, 
  title, 
  message, 
  onConfirm, 
  onCancel, 
  confirmText = "Confirmar", 
  cancelText = "Cancelar", 
  isDestructive = true,
  isLoading = false
}) => {
  
  // UX Enhancement: Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        onCancel();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isLoading, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-full flex-shrink-0 ${isDestructive ? 'bg-rose-100 text-rose-600' : 'bg-indigo-100 text-indigo-600'}`}>
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="pt-1">
              <h3 className="text-lg font-bold text-gray-900">{title}</h3>
              <p className="mt-2 text-sm text-gray-600 leading-relaxed">
                {message}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-3 border-t border-gray-100">
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className={`px-5 py-2 font-semibold text-white text-sm rounded-lg shadow-sm transition-all active:scale-95 flex items-center justify-center min-w-[100px] ${
              isDestructive 
                ? 'bg-rose-600 hover:bg-rose-700 focus:ring-rose-500 disabled:opacity-70' 
                : 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500 disabled:opacity-70'
            }`}
          >
            {isLoading ? (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : confirmText}
          </button>
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-5 py-2 bg-white border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {cancelText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
