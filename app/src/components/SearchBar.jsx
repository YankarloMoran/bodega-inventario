import React from 'react';
import { Search, X, FileSpreadsheet, AlertTriangle, TrendingDown, TrendingUp, ScanBarcode } from 'lucide-react';

export default function SearchBar({
  searchQuery = '',
  onSearchChange = () => {},
  activeFilter = 'todos',
  onFilterChange = () => {},
  onOpenQuickFind,
  onOpenBarcodeScanner,
  counts,
  stats
}) {
  const data = stats || counts || {};
  const total = data.total || 0;
  const pending = data.pending || 0;
  const counted = data.counted || 0;
  const missingCount = data.missingCount || 0;
  const surplusCount = data.surplusCount || 0;
  const missingPieces = data.missingPieces || 0;
  const surplusPieces = data.surplusPieces || 0;
  const newItems = data.newItems || 0;

  return (
    <div className="px-3.5 py-2 bg-slate-900 border-b border-slate-800">
      {/* Campo de búsqueda con accesos directos de Escáner y Ctrl+B */}
      <div className="flex items-center gap-1.5 mb-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por nombre, caja (#209) o fila..."
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

        {/* Botón Lector de Código de Barras */}
        {onOpenBarcodeScanner && (
          <button
            type="button"
            onClick={onOpenBarcodeScanner}
            className="p-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 active:scale-95 text-blue-400 border border-blue-500/30 transition shadow-sm shrink-0"
            title="Escanear código de barras de la caja"
          >
            <ScanBarcode className="w-4 h-4" />
          </button>
        )}

        {/* Botón Buscador Fila (Ctrl+B) */}
        {onOpenQuickFind && (
          <button
            type="button"
            onClick={onOpenQuickFind}
            className="px-2 py-2 rounded-xl bg-amber-950/70 hover:bg-amber-900/80 active:scale-95 text-amber-300 border border-amber-800/80 font-semibold text-xs flex items-center gap-1 transition shadow-sm shrink-0"
            title="Localizador manual de filas (Ctrl+B)"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">Ctrl+B</span>
            <span className="sm:hidden font-mono text-[11px]">Fila</span>
          </button>
        )}
      </div>

      {/* Filtros horizontales deslizables con badges claros */}
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

        {/* Filtro Faltantes */}
        <button
          type="button"
          onClick={() => onFilterChange('faltantes')}
          className={`px-2.5 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
            activeFilter === 'faltantes'
              ? 'bg-rose-600 text-white shadow-sm'
              : 'bg-rose-950/40 text-rose-300 border border-rose-900/50 hover:bg-rose-950/70'
          }`}
        >
          <TrendingDown className="w-3.5 h-3.5" />
          <span>Faltan ({missingCount})</span>
        </button>

        {/* Filtro Sobrantes */}
        <button
          type="button"
          onClick={() => onFilterChange('sobrantes')}
          className={`px-2.5 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
            activeFilter === 'sobrantes'
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-amber-950/40 text-amber-300 border border-amber-900/50 hover:bg-amber-950/70'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Sobran ({surplusCount})</span>
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

      {/* Banner resumen de auditoría si se filtra por Faltantes o Sobrantes */}
      {activeFilter === 'faltantes' && (
        <div className="mt-2 py-1 px-2.5 rounded-lg bg-rose-950/60 border border-rose-800/80 text-[11px] text-rose-300 flex items-center justify-between">
          <span className="flex items-center gap-1 font-semibold">
            <AlertTriangle className="w-3 h-3 text-rose-400" /> Mostrando {missingCount} artículos que faltan
          </span>
          <strong className="text-white">Déficit: -{missingPieces} piezas</strong>
        </div>
      )}

      {activeFilter === 'sobrantes' && (
        <div className="mt-2 py-1 px-2.5 rounded-lg bg-amber-950/60 border border-amber-800/80 text-[11px] text-amber-300 flex items-center justify-between">
          <span className="flex items-center gap-1 font-semibold">
            <AlertTriangle className="w-3 h-3 text-amber-400" /> Mostrando {surplusCount} artículos con excedente
          </span>
          <strong className="text-white">Superávit: +{surplusPieces} piezas</strong>
        </div>
      )}
    </div>
  );
}
