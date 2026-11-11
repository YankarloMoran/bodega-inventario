import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Hash, Tag, Plus, Check, FileSpreadsheet, ArrowRight, CornerDownLeft } from 'lucide-react';
import { searchProducts } from '../utils/fuzzySearch';

export default function QuickFindModal({
  isOpen,
  onClose,
  catalog = [],
  onAddCount,
  onJumpToProduct
}) {
  const [query, setQuery] = useState('');
  const [quickDelta, setQuickDelta] = useState({});
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    } else {
      setQuery('');
      setQuickDelta({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filtrar resultados con el motor de búsqueda difusa avanzado
  const results = query.trim() ? searchProducts(catalog, query, 50) : [];

  const handleQuickAdd = (product, delta) => {
    if (onAddCount) {
      onAddCount(product, delta, 'Buscador Ctrl+B');
    }
  };

  const handleCustomAdd = (product) => {
    const rawVal = quickDelta[product.id];
    const val = parseInt(rawVal, 10);
    if (!isNaN(val) && val > 0) {
      handleQuickAdd(product, val);
      setQuickDelta(prev => ({ ...prev, [product.id]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-start justify-center p-3 pt-6 sm:pt-12 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        
        {/* Cabecera del Buscador (Estilo Excel Ctrl+B) */}
        <div className="p-4 bg-slate-900/95 border-b border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-600/20 text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-500/30">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  Buscador Rápido <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">Ctrl + B</span>
                </h3>
                <p className="text-[11px] text-slate-400">Busca por fila de Excel (ej: 36), caja (#209) o nombre</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Cerrar (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Campo de Entrada Principal */}
          <div className="relative mt-2">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-blue-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') onClose();
              }}
              placeholder="Escribe fila (ej: 45), # de caja o palabras..."
              className="w-full pl-11 pr-10 py-3 bg-slate-800 text-base text-white placeholder-slate-400 rounded-2xl border border-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 shadow-inner transition"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Atajos rápidos de sugerencias */}
          <div className="flex items-center gap-2 mt-2.5 text-[11px] text-slate-400 overflow-x-auto pb-0.5 no-scrollbar">
            <span className="text-slate-500 shrink-0">Ejemplos:</span>
            <button
              type="button"
              onClick={() => setQuery('fila 36')}
              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-mono border border-slate-700 shrink-0"
            >
              fila 36
            </button>
            <button
              type="button"
              onClick={() => setQuery('209')}
              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-blue-300 font-mono border border-slate-700 shrink-0"
            >
              #209
            </button>
            <button
              type="button"
              onClick={() => setQuery('michael jordan')}
              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 shrink-0"
            >
              jordan
            </button>
            <button
              type="button"
              onClick={() => setQuery('harry potter')}
              className="px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 shrink-0"
            >
              harry potter
            </button>
          </div>
        </div>

        {/* Lista de Resultados Encontrados */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 divide-y divide-slate-800/60">
          {!query.trim() ? (
            <div className="text-center py-12 px-4 text-slate-400">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">Localizador manual para hojas y catálogo</p>
              <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                Ingresa el número de fila para encontrarlo de inmediato y registrar las cantidades que tienes en físico.
              </p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-10 px-4 text-slate-400">
              <p className="text-sm font-semibold text-slate-300">No se encontraron coincidencias para "{query}"</p>
              <p className="text-xs text-slate-500 mt-1">
                Verifica el número de fila o escribe parte del nombre del personaje.
              </p>
            </div>
          ) : (
            results.map((product) => {
              const teorico = product.stock_teorico || 0;
              const fisico = product.conteo_fisico || 0;
              const diff = fisico - teorico;

              return (
                <div
                  key={product.id}
                  className="pt-2 first:pt-0 bg-slate-800/40 hover:bg-slate-800/80 p-3 rounded-2xl border border-slate-750 transition"
                >
                  {/* Encabezado: Fila en Hoja Excel y Número de Caja */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-amber-300 bg-amber-950/80 border border-amber-800/80 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                        <FileSpreadsheet className="w-3 h-3 text-amber-400" />
                        <span>Fila #{product.id}</span>
                      </span>

                      {product.numero && (
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-blue-950/90 text-blue-300 border border-blue-800/80 flex items-center gap-0.5">
                          <Hash className="w-3 h-3 text-blue-400" /> Caja #{product.numero}
                        </span>
                      )}

                      {product.codigo && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-900 text-slate-400 border border-slate-800">
                          {product.codigo}
                        </span>
                      )}
                    </div>

                    {/* Botón para saltar a esta fila en la lista principal */}
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onJumpToProduct) onJumpToProduct(product.id);
                      }}
                      className="text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 hover:underline"
                      title="Ver en la lista general"
                    >
                      <span>Ver en lista</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Nombre del producto */}
                  <div className="text-xs font-semibold text-slate-100 mb-2 leading-tight">
                    {product.nombre}
                  </div>

                  {/* Fila de acción y conteo rápido */}
                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="text-[9px] uppercase font-bold text-slate-400">Sistema</div>
                        <div className="text-xs font-bold text-slate-300">{teorico}</div>
                      </div>
                      <div>
                        <div className="text-[9px] uppercase font-bold text-blue-400">Físico</div>
                        <div className="text-base font-extrabold text-white">{fisico}</div>
                      </div>
                      {fisico > 0 && (
                        <div className="text-[10px] font-semibold">
                          {diff === 0 ? (
                            <span className="text-emerald-400">Coincide</span>
                          ) : diff > 0 ? (
                            <span className="text-amber-400">+{diff}</span>
                          ) : (
                            <span className="text-rose-400">{diff}</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Acciones directas de suma */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleQuickAdd(product, 1)}
                        className="px-2.5 py-1 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-xs shadow flex items-center gap-0.5"
                        title="Sumar 1 unidad"
                      >
                        <Plus className="w-3 h-3" /> 1
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickAdd(product, 5)}
                        className="px-2 py-1 rounded-xl bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-100 font-semibold text-xs border border-slate-600"
                        title="Sumar 5 unidades"
                      >
                        +5
                      </button>

                      {/* Input manual libre para sumar cantidad arbitraria */}
                      <div className="flex items-center gap-1 pl-1">
                        <input
                          type="number"
                          min="1"
                          placeholder="+"
                          value={quickDelta[product.id] || ''}
                          onChange={(e) => setQuickDelta({ ...quickDelta, [product.id]: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCustomAdd(product);
                          }}
                          className="w-11 py-1 px-1.5 text-center bg-slate-900 text-xs text-white rounded-lg border border-slate-700 focus:outline-none focus:border-blue-500"
                        />
                        {quickDelta[product.id] && (
                          <button
                            type="button"
                            onClick={() => handleCustomAdd(product)}
                            className="p-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white"
                            title="Confirmar suma"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Barra inferior con total de resultados */}
        {query.trim() && (
          <div className="p-2.5 bg-slate-900 border-t border-slate-800 text-center text-xs text-slate-400">
            Encontrados: <strong className="text-white">{results.length}</strong> artículos coincidentes
          </div>
        )}

      </div>
    </div>
  );
}

