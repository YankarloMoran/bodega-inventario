import React, { useState } from 'react';
import { PlusCircle, X, Check, Hash } from 'lucide-react';

export default function NewProductModal({
  isOpen,
  onClose,
  nextId,
  onAddNewProduct
}) {
  const [nombre, setNombre] = useState('');
  const [numero, setNumero] = useState('');
  const [conteo, setConteo] = useState(1);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    onAddNewProduct({
      id: nextId,
      nombre: nombre.trim(),
      numero: numero.trim(),
      codigo: '',
      stock_mayo: 0,
      stock_junio: 0,
      stock_octubre: 0,
      stock_teorico: 0,
      conteo_fisico: Math.max(1, parseInt(conteo, 10) || 1),
      is_new: true,
      estado: 'nuevo'
    });

    setNombre('');
    setNumero('');
    setConteo(1);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-md w-full shadow-2xl animate-in zoom-in-95 space-y-4">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-purple-600/30 text-purple-400 flex items-center justify-center">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Registrar Nuevo Físico</h3>
              <p className="text-xs text-slate-400">Producto hallado que no estaba en el Excel</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nombre o Personaje del Funko / Juguete *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Funko Pop! Marvel Iron Man Mark 85"
              className="w-full p-2.5 bg-slate-800 text-sm text-white rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
              <Hash className="w-3.5 h-3.5 text-purple-400" /> Número de Caja (#)
            </label>
            <input
              type="text"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Ej: 529"
              className="w-full p-2.5 bg-slate-800 text-sm text-white rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Cantidad Física Encontrada
            </label>
            <input
              type="number"
              min="1"
              value={conteo}
              onChange={(e) => setConteo(parseInt(e.target.value, 10) || 1)}
              className="w-full p-2.5 bg-slate-800 text-base font-bold text-white rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500"
              required
            />
          </div>

          <div className="p-3 bg-purple-950/40 border border-purple-900/60 rounded-xl text-xs text-purple-300">
            Se asignará el identificador correlativo <strong>#{nextId}</strong> y se sincronizará automáticamente con Google Sheets como fila nueva.
          </div>

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
              className="flex-1 py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <Check className="w-4 h-4" /> Agregar al Inventario
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

