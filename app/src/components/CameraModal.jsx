import React, { useState, useRef } from 'react';
import { Camera, X, Plus, Minus, Check, AlertCircle, RefreshCw, Trash2, Search, Edit3 } from 'lucide-react';
import { resizeImageToDataUrl, analyzeShelfPhoto } from '../utils/geminiVision';
import { findBestMatch, searchProducts } from '../utils/fuzzySearch';

export default function CameraModal({
  isOpen,
  onClose,
  catalog,
  apiKey,
  onConfirmBatch
}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [detectedItems, setDetectedItems] = useState([]);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [searchCatalogQuery, setSearchCatalogQuery] = useState('');
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Manejar captura de imagen desde la cámara o galería
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg('');
    setIsProcessing(true);
    setDetectedItems([]);

    try {
      // 1. Redimensionar en memoria
      const dataUrl = await resizeImageToDataUrl(file);

      // 2. Analizar con Gemini Vision
      const rawDetections = await analyzeShelfPhoto(dataUrl, apiKey);

      if (!rawDetections || rawDetections.length === 0) {
        throw new Error('No se detectaron figuras Funko reconocibles en la foto. Intenta con mejor iluminación.');
      }

      // 3. Cruzar con el catálogo local para encontrar los mejores matches
      const matched = rawDetections.map((det, idx) => {
        const best = findBestMatch(catalog, det.character, det.box_number);
        return {
          id: `det_${idx}_${Date.now()}`,
          raw_character: det.character || 'Figura desconocida',
          raw_box: det.box_number || '',
          raw_edition: det.edition || '',
          count: Math.max(1, parseInt(det.count, 10) || 1),
          matchedProduct: best // Producto del catálogo asociado
        };
      });

      setDetectedItems(matched);
    } catch (err) {
      console.error(err);
      setErrorMsg(err.message || 'Error al procesar la fotografía.');
    } finally {
      setIsProcessing(false);
      // Limpiar input de archivo para liberar memoria inmediatamente
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Ajustar cantidad de un elemento detectado
  const updateCount = (index, delta) => {
    setDetectedItems(prev => {
      const copy = [...prev];
      const newCount = Math.max(1, copy[index].count + delta);
      copy[index] = { ...copy[index], count: newCount };
      return copy;
    });
  };

  // Eliminar un elemento falso positivo
  const removeItem = (index) => {
    setDetectedItems(prev => prev.filter((_, i) => i !== index));
  };

  // Cambiar manualmente el producto asignado
  const selectProductForDetection = (index, newProduct) => {
    setDetectedItems(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], matchedProduct: newProduct };
      return copy;
    });
    setEditingItemIndex(null);
    setSearchCatalogQuery('');
  };

  // Confirmar y subir cambios
  const handleConfirmAll = () => {
    const updates = detectedItems
      .filter(item => item.matchedProduct)
      .map(item => ({
        id: item.matchedProduct.id,
        nombre: item.matchedProduct.nombre,
        delta: item.count,
        new_total: (item.matchedProduct.conteo_fisico || 0) + item.count,
        method: 'Foto Grupal IA'
      }));

    if (updates.length === 0) {
      alert('No hay productos válidos vinculados para sumar.');
      return;
    }

    onConfirmBatch(updates);
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setDetectedItems([]);
    setErrorMsg('');
    setIsProcessing(false);
    setEditingItemIndex(null);
    onClose();
  };

  const totalPiecesInBatch = detectedItems.reduce((sum, item) => sum + (item.count || 0), 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end sm:justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl max-h-[92vh] flex flex-col w-full max-w-lg mx-auto shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6">
        
        {/* Cabecera del modal */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600/30 text-blue-400 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Escaneo por Foto (Multi-Funko)</h3>
              <p className="text-xs text-slate-400">Toma una foto a varios Funkos juntos en la repisa</p>
            </div>
          </div>
          <button
            onClick={handleCloseModal}
            className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input oculto para cámara */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          capture="environment"
          className="hidden"
        />

        {/* Contenido principal */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* Alerta de API Key faltante si no está configurada */}
          {!apiKey && (
            <div className="p-3 bg-amber-950/60 border border-amber-800/80 rounded-xl text-xs text-amber-200 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong>Falta clave de Gemini:</strong> Ingresa tu API Key de Gemini en Configuración (icono de engranaje) para activar la visión con IA.
              </div>
            </div>
          )}

          {/* Estado Inicial: Botón grande para tomar foto */}
          {detectedItems.length === 0 && !isProcessing && (
            <div className="text-center py-8 px-4">
              <div className="w-20 h-20 mx-auto rounded-3xl bg-blue-600/10 border-2 border-dashed border-blue-500/40 flex items-center justify-center text-blue-400 mb-4">
                <Camera className="w-10 h-10" />
              </div>
              <h4 className="text-sm font-semibold text-white mb-1">Apunta a un estante o grupo de figuras</h4>
              <p className="text-xs text-slate-400 mb-6 max-w-xs mx-auto">
                La IA detectará automáticamente los personajes, números de caja (#) y cantidades en una sola imagen.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!apiKey}
                className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm shadow-lg flex items-center justify-center gap-2 transition ${
                  apiKey
                    ? 'bg-blue-600 hover:bg-blue-500 text-white active:scale-95'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Camera className="w-4 h-4" /> Tomar Foto o Subir
              </button>
            </div>
          )}

          {/* Estado de Carga / Procesando */}
          {isProcessing && (
            <div className="text-center py-12 px-4 space-y-3">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 border-4 border-blue-600/30 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-blue-400">
                  <Camera className="w-6 h-6 animate-pulse" />
                </div>
              </div>
              <h4 className="text-sm font-bold text-white">Analizando figuras con IA Gemini...</h4>
              <p className="text-xs text-slate-400">Identificando cajas, números y variantes</p>
            </div>
          )}

          {/* Mensaje de error si hubo fallo */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {/* Pantalla de Confirmación y Ajustes (Borrador de Detección) */}
          {detectedItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Detectados: <strong>{detectedItems.length} tipos ({totalPiecesInBatch} figuras)</strong></span>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Tomar otra foto
                </button>
              </div>

              {/* Lista de figuras detectadas con controles [+] y [-] */}
              <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
                {detectedItems.map((item, idx) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-2xl bg-slate-800/90 border border-slate-700/80 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap mb-1">
                          {item.raw_box && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                              #{item.raw_box}
                            </span>
                          )}
                          {item.raw_edition && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950 text-purple-300 border border-purple-800">
                              {item.raw_edition}
                            </span>
                          )}
                          <span className="text-xs font-bold text-white">
                            {item.raw_character}
                          </span>
                        </div>

                        {/* Producto emparejado en el catálogo */}
                        {item.matchedProduct ? (
                          <div className="text-[11px] text-slate-400 bg-slate-900/60 p-1.5 rounded-lg border border-slate-700/50 flex items-center justify-between">
                            <span className="truncate pr-2">
                              Enlazado a: <strong className="text-emerald-400">#{item.matchedProduct.id} {item.matchedProduct.nombre}</strong>
                            </span>
                            <button
                              onClick={() => setEditingItemIndex(idx)}
                              className="text-blue-400 hover:text-blue-300 p-1 shrink-0"
                              title="Cambiar producto asignado"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="text-[11px] text-amber-300 bg-amber-950/40 p-1.5 rounded-lg border border-amber-900/50 flex items-center justify-between">
                            <span>No se encontró en catálogo</span>
                            <button
                              onClick={() => setEditingItemIndex(idx)}
                              className="text-amber-400 underline font-semibold ml-2"
                            >
                              Vincular manualmente
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Botón descartar figura */}
                      <button
                        onClick={() => removeItem(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1"
                        title="Quitar de la lista"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Controles de ajuste de cantidad [+] [-] */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-700/40 text-xs">
                      <span className="text-slate-400 font-medium">Cantidad en foto:</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateCount(idx, -1)}
                          className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 active:scale-95 flex items-center justify-center text-white font-bold"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-7 text-center font-extrabold text-base text-white">
                          {item.count}
                        </span>
                        <button
                          onClick={() => updateCount(idx, 1)}
                          className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 active:scale-95 flex items-center justify-center text-white font-bold"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-modal: Cambiar producto vinculado manualmente */}
          {editingItemIndex !== null && (
            <div className="fixed inset-0 z-60 bg-black/90 p-4 flex flex-col justify-center max-w-md mx-auto">
              <div className="bg-slate-900 rounded-2xl p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-white">Vincular a producto del catálogo</h4>
                  <button onClick={() => setEditingItemIndex(null)} className="text-slate-400">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={searchCatalogQuery}
                  onChange={(e) => setSearchCatalogQuery(e.target.value)}
                  placeholder="Buscar nombre o # número en catálogo..."
                  className="w-full p-2.5 bg-slate-800 text-xs text-white rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500"
                />
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {searchProducts(catalog, searchCatalogQuery, 10).map(p => (
                    <button
                      key={p.id}
                      onClick={() => selectProductForDetection(editingItemIndex, p)}
                      className="w-full text-left p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700/50 flex items-center justify-between"
                    >
                      <span className="truncate pr-2">#{p.id} {p.nombre}</span>
                      {p.numero && <span className="text-[10px] font-bold text-blue-400">#{p.numero}</span>}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Pie del modal: Botones de confirmación */}
        {detectedItems.length > 0 && (
          <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex gap-2">
            <button
              onClick={handleCloseModal}
              className="flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition"
            >
              Descartar
            </button>
            <button
              onClick={handleConfirmAll}
              className="flex-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-1.5 transition active:scale-95"
            >
              <Check className="w-4 h-4" /> Confirmar y Sumar (+{totalPiecesInBatch})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

