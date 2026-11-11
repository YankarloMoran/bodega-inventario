import React from 'react';
import { Plus, Edit2, Hash, Tag, Check, AlertTriangle, FileSpreadsheet } from 'lucide-react';

export default function ProductCard({
  product,
  onAddCount,
  onEdit,
  onEditProduct
}) {
  if (!product) return null;

  const teorico = product.stock_teorico || 0;
  const fisico = product.conteo_fisico || 0;
  const isCounted = fisico > 0;
  const diff = fisico - teorico;

  // Manejadores flexibles de eventos
  const handleEdit = () => {
    if (onEdit) onEdit(product);
    else if (onEditProduct) onEditProduct(product);
  };

  const handleAdd = (delta) => {
    if (onAddCount) onAddCount(delta);
  };

  // Determinar color de estado
  let statusBadge = null;
  let borderColor = 'border-slate-800';

  if (product.is_new) {
    borderColor = 'border-purple-600/80';
    statusBadge = (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-900/60 text-purple-300 border border-purple-700/60">
        Nuevo Físico
      </span>
    );
  } else if (!isCounted) {
    borderColor = 'border-slate-800';
    statusBadge = (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400">
        Pendiente
      </span>
    );
  } else if (diff === 0) {
    borderColor = 'border-emerald-600/80';
    statusBadge = (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-900/60 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
        <Check className="w-3 h-3" /> Coincide ({fisico})
      </span>
    );
  } else if (diff > 0) {
    borderColor = 'border-amber-500/80';
    statusBadge = (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-900/60 text-amber-300 border border-amber-700/60 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" /> Sobran +{diff}
      </span>
    );
  } else {
    borderColor = 'border-rose-600/80';
    statusBadge = (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-900/60 text-rose-300 border border-rose-700/60 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" /> Faltan {diff}
      </span>
    );
  }

  return (
    <div
      id={`product-row-${product.id}`}
      className={`bg-slate-800/90 rounded-2xl p-3.5 mb-2.5 border ${borderColor} shadow-sm transition-all hover:bg-slate-800`}
    >
      {/* Encabezado de la tarjeta: Número en Hoja Excel, Funko # y Estado */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Identificador de Fila en Hoja Excel destacado para cotejo manual */}
          <span
            className="text-xs font-bold text-amber-300 bg-amber-950/70 border border-amber-800/80 px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm"
            title="Número de fila / renglón en la hoja de Excel impresa"
          >
            <FileSpreadsheet className="w-3 h-3 text-amber-400" />
            <span>Fila #{product.id}</span>
          </span>

          {/* Número de caja Funko */}
          {product.numero && (
            <span
              className="px-2 py-0.5 rounded-md text-xs font-bold bg-blue-950/80 text-blue-300 border border-blue-800/80 flex items-center gap-0.5"
              title="Número de caja impreso en el Funko"
            >
              <Hash className="w-3 h-3 text-blue-400" /> Caja #{product.numero}
            </span>
          )}

          {/* Código de producto */}
          {product.codigo && (
            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono bg-slate-900 text-slate-300 border border-slate-700 flex items-center gap-0.5">
              <Tag className="w-2.5 h-2.5 text-slate-400" /> {product.codigo}
            </span>
          )}
        </div>

        <div>{statusBadge}</div>
      </div>

      {/* Nombre del producto */}
      <div className="text-sm font-semibold text-slate-100 mb-3 leading-snug line-clamp-2">
        {product.nombre}
      </div>

      {/* Fila de cantidades y botones de acción */}
      <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-700/50">
        {/* Comparativa Sistema vs Conteo Físico */}
        <div className="flex items-baseline gap-3">
          <div>
            <div className="text-[10px] uppercase font-bold text-slate-400">Sistema</div>
            <div className="text-base font-bold text-slate-300">{teorico}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-blue-400">Físico Actual</div>
            <div className="text-xl font-extrabold text-white">{fisico}</div>
          </div>
        </div>

        {/* Botones de suma rápida y edición */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => handleAdd(1)}
            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold text-sm shadow flex items-center gap-0.5 transition"
            title="Sumar 1 unidad"
          >
            <Plus className="w-3.5 h-3.5" /> 1
          </button>

          <button
            type="button"
            onClick={() => handleAdd(5)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 active:scale-95 text-slate-100 font-semibold text-xs border border-slate-600 transition"
            title="Sumar 5 unidades"
          >
            +5
          </button>

          <button
            type="button"
            onClick={handleEdit}
            className="p-1.5 rounded-xl bg-slate-700/80 hover:bg-slate-600 text-slate-300 border border-slate-600 transition"
            title="Corregir datos o ingresar cantidad manual"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
