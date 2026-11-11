import React, { useState, useEffect } from 'react';
import { X, Check, Hash, Edit3, Plus, Minus } from 'lucide-react';

export default function EditProductModal({
  isOpen,
  onClose,
  product,
  onSaveProduct,
  onSave
}) {
  const [nombre, setNombre] = useState('');
  const [numero, setNumero] = useState('');
  const [conteoFisico, setConteoFisico] = useState(0);

  useEffect(() => {
    if (product) {
      setNombre(product.nombre || '');
      setNumero(product.numero || '');
      setConteoFisico(product.conteo_fisico || 0);
    }
  }, [product]);

  if (!isOpen || !product) return null;

  const handleSave = (e) => {
    e.preventDefault();
    const updated = {
      ...product,
      nombre: nombre.trim(),
      numero: numero.trim(),
      conteo_fisico: Math.max(0, parseInt(conteoFisico, 10) || 0)
    };
    if (onSave) onSave(updated);
    else if (onSaveProduct) onSaveProduct(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-md w-full shadow-2xl animate-in zoom-in-95 space-y-4">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-white text-base">Corregir Producto #{product.id}</h3>
            <p className="text-xs text-slate-400">Corrige el nombre, número de caja o conteo</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSave} className="space-y-4">
          {/* Nombre / Descripción */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nombre o Descripción del Producto
            </label>
            <textarea
              rows={2}
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full p-2.5 bg-slate-800 text-sm text-white rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          {/* Número de Funko # */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-blue-400" /> Número de Caja del Funko (#)
            </label>
            <input
              type="text"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Ej: 209, 1586, 14..."
              className="w-full p-2.5 bg-slate-800 text-sm text-white rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Si el Excel no tenía el número de caja, anótalo aquí para que la IA y la voz lo encuentren fácil.
            </p>
          </div>

          {/* Ajuste manual de conteo físico */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Conteo Físico Actual
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setConteoFisico(prev => Math.max(0, prev - 1))}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center border border-slate-700"
              >
                <Minus className="w-4 h-4" />
              </button>
              <input
                type="number"
                min="0"
                value={conteoFisico}
                onChange={(e) => setConteoFisico(parseInt(e.target.value, 10) || 0)}
                className="w-24 text-center p-2 bg-slate-800 text-lg font-extrabold text-white rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => setConteoFisico(prev => prev + 1)}
                className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">
              Stock Teórico del sistema: <strong>{product.stock_teorico || 0}</strong>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <Check className="w-4 h-4" /> Guardar Corrección
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

