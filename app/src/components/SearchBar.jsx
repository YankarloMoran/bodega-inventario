import React from 'react';
import { Search, X, FileSpreadsheet } from 'lucide-react';

export default function SearchBar({
  searchQuery = '',
  onSearchChange = () => {},
  activeFilter = 'todos',
  onFilterChange = () => {},
  onOpenQuickFind,
  counts,
  stats
}) {
  const data = stats || counts || {};
  const total = data.total || 0;
  const pending = data.pending || 0;
  const counted = data.counted || 0;
  const differences = data.differences !== undefined ? data.differences : (data.discrepancies || 0);
  const newItems = data.newItems || 0;

  return (
    <div className="px-4 py-2 bg-slate-900 border-b border-slate-800">
      {/* Campo de búsqueda y botón Ctrl+B */}
      <div className="flex items-center gap-2 mb-2.5">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre, caja (#209) o fila (ej: 45)..."
            className="w-full pl-9 pr-9 py-2 bg-slate-800 text-sm text-white placeholder-slate-400 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Botón de acceso rápido al Localizador Tipo Excel (Ctrl+B) */}
        {onOpenQuickFind && (
          <button
            type="button"
            onClick={onOpenQuickFind}
            className="px-2.5 py-2 rounded-xl bg-amber-950/70 hover:bg-amber-900/80 active:scale-95 text-amber-300 border border-amber-800/80 font-semibold text-xs flex items-center gap-1.5 transition shadow-sm shrink-0"
            title="Abrir buscador manual rápido de filas (Ctrl+B)"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Ctrl+B</span>
            <span className="sm:hidden font-mono">Fila</span>
          </button>
        )}
      </div>

      {/* Filtros horizontales deslizables */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          type="button"
          onClick={() => onFilterChange('todos')}
          className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all ${
            activeFilter === 'todos'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Todos ({total})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('pendientes')}
          className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all ${
            activeFilter === 'pendientes'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Pendientes ({pending})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('contados')}
          className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all ${
            activeFilter === 'contados'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Contados ({counted})
        </button>

        <button
          type="button"
          onClick={() => onFilterChange('diferencias')}
          className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all ${
            activeFilter === 'diferencias' || activeFilter === 'discrepancias'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Diferencias ({differences})
        </button>

        {newItems > 0 && (
          <button
            type="button"
            onClick={() => onFilterChange('nuevos')}
            className={`px-3 py-1.5 rounded-full font-medium whitespace-nowrap transition-all ${
              activeFilter === 'nuevos'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            Nuevos Físicos ({newItems})
          </button>
        )}
      </div>
    </div>
  );
}
