import React, { useState } from 'react';
import { History, X, Undo2, AlertTriangle, Check, Camera, Mic, Hand } from 'lucide-react';

export default function HistoryModal({
  isOpen,
  onClose,
  history,
  onUndo
}) {
  const [selectedUndoItem, setSelectedUndoItem] = useState(null);

  if (!isOpen) return null;

  const handleConfirmUndo = () => {
    if (!selectedUndoItem) return;
    onUndo(selectedUndoItem);
    setSelectedUndoItem(null);
  };

  const getMethodIcon = (method) => {
    if (!method) return <Hand className="w-3.5 h-3.5" />;
    if (method.includes('Foto')) return <Camera className="w-3.5 h-3.5 text-blue-400" />;
    if (method.includes('Voz')) return <Mic className="w-3.5 h-3.5 text-rose-400" />;
    return <Hand className="w-3.5 h-3.5 text-amber-400" />;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end sm:justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col w-full max-w-lg mx-auto shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6">
        
        {/* Cabecera */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Historial de Conteos</h3>
              <p className="text-xs text-slate-400">Revisa las acciones recientes y deshaz errores</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-4 overflow-y-auto flex-1 space-y-2.5">
          {history.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-sm">
              No hay conteos registrados en esta sesión aún.
            </div>
          ) : (
            history.map((entry) => (
              <div
                key={entry.history_id}
                className={`p-3 rounded-2xl bg-slate-800/80 border ${
                  entry.reverted ? 'border-slate-800 opacity-50 line-through' : 'border-slate-700/80'
                } flex items-center justify-between gap-3`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400">
                      {getMethodIcon(entry.method)}
                      {entry.method || 'Manual'}
                    </span>
                    <span className="text-[10px] text-slate-500">•</span>
                    <span className="text-[10px] text-slate-400 font-mono">{entry.timestamp}</span>
                    <span className="text-[10px] text-slate-500">•</span>
                    <span className="text-[10px] font-medium text-blue-400">{entry.user}</span>
                  </div>
                  
                  <div className="text-xs font-bold text-slate-100 truncate">
                    #{entry.productId} {entry.productName}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-sm font-extrabold px-2 py-0.5 rounded-lg ${
                    entry.delta > 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-rose-950 text-rose-400'
                  }`}>
                    +{entry.delta}
                  </span>

                  {!entry.reverted && (
                    <button
                      onClick={() => setSelectedUndoItem(entry)}
                      className="p-1.5 rounded-lg bg-slate-700 hover:bg-rose-900/60 text-slate-300 hover:text-rose-300 border border-slate-600 transition"
                      title="Deshacer este conteo"
                    >
                      <Undo2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modal de confirmación para DESHACER */}
        {selectedUndoItem && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-amber-950/80 border border-amber-800 text-amber-400 flex items-center justify-center mx-auto">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <div className="text-center">
                <h4 className="font-bold text-white text-base mb-1">¿Confirmar Deshacer?</h4>
                <p className="text-xs text-slate-300">
                  Se restarán <strong className="text-rose-400 font-bold">{selectedUndoItem.delta} unidades</strong> a:
                </p>
                <p className="text-xs font-bold text-white mt-1 bg-slate-800 p-2 rounded-xl border border-slate-700 truncate">
                  #{selectedUndoItem.productId} {selectedUndoItem.productName}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setSelectedUndoItem(null)}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmUndo}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Undo2 className="w-3.5 h-3.5" /> Sí, Revertir
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pie */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/90 text-center">
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-white font-medium">
            Cerrar Historial
          </button>
        </div>
      </div>
    </div>
  );
}

