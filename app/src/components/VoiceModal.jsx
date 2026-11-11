import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, X, Check, AlertCircle, Volume2, Plus, Minus, Search } from 'lucide-react';
import { createSpeechRecognizer, parseVoiceCommand, speakText } from '../utils/voiceParser';
import { findBestMatch, searchProducts } from '../utils/fuzzySearch';

export default function VoiceModal({
  isOpen,
  onClose,
  catalog,
  onConfirmVoiceCount,
  onApplyUpdates
}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [detectedAction, setDetectedAction] = useState(null); // { product, quantity, raw }
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingManually, setIsSearchingManually] = useState(false);
  const recognizerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      startListening();
    } else {
      stopListening();
      resetState();
    }
    return () => {
      stopListening();
    };
  }, [isOpen]);

  const resetState = () => {
    setTranscript('');
    setErrorMsg('');
    setDetectedAction(null);
    setIsSearchingManually(false);
  };

  const startListening = () => {
    setErrorMsg('');
    setDetectedAction(null);
    setTranscript('');
    setIsListening(true);

    try {
      const recognizer = createSpeechRecognizer(
        (recognizedText) => {
          handleTranscript(recognizedText);
        },
        () => {
          setIsListening(false);
        },
        (err) => {
          setIsListening(false);
          if (err === 'not-allowed') {
            setErrorMsg('Permiso de micrófono denegado. Permite el acceso al micrófono en el navegador.');
          } else if (err !== 'no-speech') {
            setErrorMsg(`Error de reconocimiento: ${err}`);
          }
        }
      );

      recognizerRef.current = recognizer;
      recognizer.start();
    } catch (err) {
      setIsListening(false);
      setErrorMsg(err.message || 'El reconocimiento de voz no está soportado en este navegador.');
    }
  };

  const stopListening = () => {
    if (recognizerRef.current) {
      try {
        recognizerRef.current.abort();
      } catch (_) {}
      recognizerRef.current = null;
    }
    setIsListening(false);
  };

  const handleTranscript = (text) => {
    setTranscript(text);
    const parsed = parseVoiceCommand(text);

    if (!parsed) {
      setErrorMsg('No se entendió la orden. Intenta diciendo: "Funko Jordan 209 son 4"');
      return;
    }

    // Buscar el producto en el catálogo
    const matched = findBestMatch(catalog, parsed.searchTerms, parsed.boxNumber);

    if (matched) {
      setDetectedAction({
        product: matched,
        quantity: parsed.quantity,
        raw: text
      });

      // Confirmación por voz (Text-to-Speech)
      const spokenName = matched.numero ? `Funko ${matched.numero}` : matched.nombre.slice(0, 25);
      speakText(`Detectado ${spokenName}. ¿Confirmas sumar ${parsed.quantity}?`);
    } else {
      setErrorMsg(`No se encontró ningún producto con "${parsed.searchTerms || parsed.boxNumber}".`);
    }
  };

  const handleConfirm = () => {
    if (!detectedAction || !detectedAction.product) return;

    const { product, quantity } = detectedAction;
    const newTotal = (product.conteo_fisico || 0) + quantity;

    const updatePayload = {
      id: product.id,
      nombre: product.nombre,
      delta: quantity,
      new_total: newTotal,
      method: 'Voz'
    };

    if (onApplyUpdates) {
      onApplyUpdates([updatePayload]);
    } else if (onConfirmVoiceCount) {
      onConfirmVoiceCount(updatePayload);
    }

    // Anuncio de éxito por voz
    speakText(`Guardado. Total: ${newTotal}`);
    onClose();
  };

  const adjustQuantity = (delta) => {
    if (!detectedAction) return;
    setDetectedAction(prev => ({
      ...prev,
      quantity: Math.max(1, prev.quantity + delta)
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end sm:justify-center p-0 sm:p-4">
      <div className="bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col w-full max-w-lg mx-auto shadow-2xl overflow-hidden animate-in slide-in-from-bottom-6">
        
        {/* Cabecera */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-600/20 text-rose-400 flex items-center justify-center">
              <Mic className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Comando por Voz</h3>
              <p className="text-xs text-slate-400">Di el nombre del Funko, su número y la cantidad</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Contenido */}
        <div className="p-5 flex-1 overflow-y-auto space-y-4">
          
          {/* Botón de Micrófono Animado */}
          <div className="text-center py-4">
            <button
              onClick={isListening ? stopListening : startListening}
              className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto transition-all shadow-xl active:scale-95 ${
                isListening
                  ? 'bg-rose-600 text-white listening-pulse ring-4 ring-rose-500/40'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700'
              }`}
            >
              {isListening ? <Mic className="w-10 h-10 animate-bounce" /> : <MicOff className="w-10 h-10" />}
            </button>
            <div className="text-sm font-semibold text-white mt-3">
              {isListening ? 'Escuchando en vivo...' : 'Toca el micrófono para hablar'}
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Ejemplo: <span className="text-blue-400 italic font-mono">"Jordan 209 anota 4"</span> o <span className="text-blue-400 italic font-mono">"Luffy 1771 son dos"</span>
            </div>
          </div>

          {/* Transcripción escuchada */}
          {transcript && (
            <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400 mb-0.5">Escuché:</div>
              <div className="text-sm font-medium text-white italic">"{transcript}"</div>
            </div>
          )}

          {/* Mensaje de error si hubo fallo */}
          {errorMsg && (
            <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {/* Tarjeta de Confirmación de Acción Detectada */}
          {detectedAction && detectedAction.product && (
            <div className="p-4 rounded-2xl bg-slate-800 border-2 border-emerald-500/80 shadow-lg space-y-3 animate-in zoom-in-95">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Coincidencia Detectada
                </span>
                {detectedAction.product.numero && (
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-950 text-blue-300 border border-blue-800">
                    #{detectedAction.product.numero}
                  </span>
                )}
              </div>

              <div className="text-sm font-bold text-white leading-snug">
                #{detectedAction.product.id} {detectedAction.product.nombre}
              </div>

              {/* Comparativa de conteo acumulativo */}
              <div className="p-2.5 bg-slate-900 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">Actual: </span>
                  <strong className="text-slate-200">{detectedAction.product.conteo_fisico || 0}</strong>
                </div>
                <div className="text-emerald-400 font-bold">
                  + {detectedAction.quantity} a sumar
                </div>
                <div>
                  <span className="text-slate-400">Nuevo Total: </span>
                  <strong className="text-white text-sm font-extrabold">
                    {(detectedAction.product.conteo_fisico || 0) + detectedAction.quantity}
                  </strong>
                </div>
              </div>

              {/* Ajustar cantidad si la voz entendió otro número */}
              <div className="flex items-center justify-between pt-1 text-xs">
                <span className="text-slate-400">Corregir cantidad:</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => adjustQuantity(-1)}
                    className="w-8 h-8 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold flex items-center justify-center"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-6 text-center font-bold text-sm text-white">
                    {detectedAction.quantity}
                  </span>
                  <button
                    onClick={() => adjustQuantity(1)}
                    className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center justify-center"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Botón de confirmación */}
              <button
                onClick={handleConfirm}
                className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg flex items-center justify-center gap-2 active:scale-95 transition"
              >
                <Check className="w-4 h-4" /> Confirmar y Sumar (+{detectedAction.quantity})
              </button>
            </div>
          )}
        </div>

        {/* Pie con botón de cerrar */}
        <div className="p-3 border-t border-slate-800 bg-slate-900/90 text-center">
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white font-medium"
          >
            Cerrar ventana de voz
          </button>
        </div>
      </div>
    </div>
  );
}

