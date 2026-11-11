import React from 'react';
import { RefreshCw, Settings, History, PlusCircle, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

export default function Header({
  operatorName,
  syncStatus,
  stats,
  onOpenSettings,
  onOpenHistory,
  onOpenNewProduct,
  onRefreshSync,
  isRefreshing
}) {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 pt-[calc(var(--safe-top)+0.5rem)] px-4 pb-3">
      {/* Barra superior de operador y acciones */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white text-sm shadow-md">
            {operatorName ? operatorName[0].toUpperCase() : 'O'}
          </div>
          <div>
            <div className="text-xs text-slate-400 font-medium">Operador en Bodega</div>
            <div className="text-sm font-semibold text-white leading-tight truncate max-w-[140px]">
              {operatorName || 'Sin asignar'}
            </div>
          </div>
        </div>

        {/* Botones de acción rápida en cabecera */}
        <div className="flex items-center gap-1.5">
          {/* Estado de sincronización */}
          <button
            onClick={onRefreshSync}
            disabled={isRefreshing}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 border transition-all ${
              syncStatus === 'synced'
                ? 'bg-emerald-950/60 border-emerald-800/80 text-emerald-400'
                : syncStatus === 'syncing'
                ? 'bg-amber-950/60 border-amber-800/80 text-amber-300'
                : syncStatus === 'offline'
                ? 'bg-rose-950/60 border-rose-800/80 text-rose-300'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
            title="Toca para sincronizar con Google Sheets"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {syncStatus === 'synced' ? 'Online' : syncStatus === 'syncing' ? 'Guardando...' : syncStatus === 'offline' ? 'Sin red' : 'Local'}
            </span>
          </button>

          {/* Historial / Deshacer */}
          <button
            onClick={onOpenHistory}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Historial y Deshacer conteos"
          >
            <History className="w-4 h-4" />
          </button>

          {/* Agregar producto nuevo no catalogado */}
          <button
            onClick={onOpenNewProduct}
            className="p-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow transition"
            title="Agregar producto físico no listado"
          >
            <PlusCircle className="w-4 h-4" />
          </button>

          {/* Configuración */}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
            title="Ajustes de Google Sheets y Gemini"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Métricas clave en chips */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="bg-slate-800/80 rounded-lg p-1.5 border border-slate-700/60">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Total Catálogo</div>
          <div className="text-base font-bold text-white">{stats.total}</div>
        </div>
        <div className="bg-emerald-950/40 rounded-lg p-1.5 border border-emerald-900/50">
          <div className="text-[10px] uppercase font-semibold text-emerald-400 flex items-center justify-center gap-0.5">
            <CheckCircle2 className="w-2.5 h-2.5" /> Contados
          </div>
          <div className="text-base font-bold text-emerald-300">{stats.counted}</div>
        </div>
        <div className="bg-amber-950/40 rounded-lg p-1.5 border border-amber-900/50">
          <div className="text-[10px] uppercase font-semibold text-amber-400 flex items-center justify-center gap-0.5">
            <Clock className="w-2.5 h-2.5" /> Pendientes
          </div>
          <div className="text-base font-bold text-amber-300">{stats.pending}</div>
        </div>
        <div className="bg-blue-950/40 rounded-lg p-1.5 border border-blue-900/50">
          <div className="text-[10px] uppercase font-semibold text-blue-400">Piezas Físicas</div>
          <div className="text-base font-bold text-blue-300">{stats.totalPieces}</div>
        </div>
      </div>
    </header>
  );
}

