import React from 'react';
import { Plus, X, Hash, FileSpreadsheet, CheckCircle2, Sparkles } from 'lucide-react';

export default function LastCountedBanner({
  lastCounted,
  onAddCount,
  onClose
}) {
  if (!lastCounted) return null;

  const handleAdd = (delta) => {
    if (onAddCount) {
      onAddCount(lastCounted.product, delta, 'Último Contado');
      if (navigator.vibrate) {
        navigator.vibrate(40);
      }
    }
  };

  const product = lastCounted.product;
  const delta = lastCounted.delta || 1;
  const method = lastCounted.method || 'Manual';

  return (
    <div className="fixed bottom-24 inset-x-3 z-30 max-w-md mx-auto animate-in slide-in-from-bottom-4 duration-200">
      <div className="bg-slate-900/95 border border-blue-500/40 rounded-2xl p-2.5 shadow-2xl backdrop-blur-md flex items-center justify-between gap-2.5">
        
        {/* Info del producto */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[9px] uppercase tracking-wider font-extrabold text-blue-400 bg-blue-950/80 px-1.5 py-0.5 rounded flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5 text-blue-400" /> Último contado (+{delta} {method})
            </span>
            <span className="text-[10px] font-bold text-amber-300 font-mono">
              Fila #{product.id}
            </span>
            {product.numero && (
              <span className="text-[10px] font-bold text-blue-300 font-mono">
                #{product.numero}
              </span>
            )}
          </div>

          <div className="text-xs font-semibold text-white truncate leading-tight">
            {product.nombre}
          </div>

          <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
            <span>Físico actual:</span>
            <strong className="text-white text-xs">{product.conteo_fisico || 0}</strong>
            <span className="text-slate-500">| Sist: {product.stock_teorico || 0}</span>
          </div>
        </div>

        {/* Acciones Rápidas (+1, +5, Dismiss) */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => handleAdd(1)}
            className="px-2.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs shadow flex items-center gap-0.5 transition"
            title="Sumar 1 más a este mismo producto"
          >
            <Plus className="w-3.5 h-3.5" /> 1
          </button>

          <button
            type="button"
            onClick={() => handleAdd(5)}
            className="px-2 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold text-xs border border-slate-700 transition"
            title="Sumar 5 más a este producto"
          >
            +5
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-white"
            title="Ocultar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      </div>
    </div>
  );
}
