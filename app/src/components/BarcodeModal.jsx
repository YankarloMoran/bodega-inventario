import React, { useState, useEffect, useRef } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { ScanBarcode, X, Plus, Check, Search, AlertCircle, Volume2, Sparkles, Link as LinkIcon, RefreshCw } from 'lucide-react';

// Generar beep de confirmación usando la Web Audio API (funciona offline)
function playBeep(freq = 880, duration = 0.12) {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch (_) {}
}

export default function BarcodeModal({
  isOpen,
  onClose,
  catalog = [],
  onApplyUpdates,
  onLinkBarcode
}) {
  const [matchedProduct, setMatchedProduct] = useState(null);
  const [scannedCode, setScannedCode] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [autoAddMode, setAutoAddMode] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [linkSearchQuery, setLinkSearchQuery] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const html5QrCodeRef = useRef(null);
  const lastScannedTimeRef = useRef(0);
  const lastScannedCodeRef = useRef('');

  // Iniciar el lector de código de barras cuando se abre el modal
  useEffect(() => {
    if (!isOpen) {
      stopScanner();
      resetState();
      return;
    }

    let isMounted = true;

    const startScanner = async () => {
      try {
        setIsScanning(true);
        setStatusMessage('Iniciando cámara...');

        // Asegurar que el contenedor esté renderizado
        await new Promise((r) => setTimeout(r, 150));
        if (!isMounted) return;

        const scannerId = 'barcode-scanner-reader';
        const scannerElement = document.getElementById(scannerId);
        if (!scannerElement) return;

        const formatsToSupport = [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE
        ];

        const qrCodeInstance = new Html5Qrcode(scannerId, {
          formatsToSupport,
          verbose: false
        });
        html5QrCodeRef.current = qrCodeInstance;

        const config = {
          fps: 15,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.0
        };

        await qrCodeInstance.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (!isMounted) return;
            handleBarcodeDetected(decodedText);
          },
          () => {} // Ignorar errores de frames sin código
        );

        setStatusMessage('');
      } catch (err) {
        console.warn('Error iniciando escáner de código de barras:', err);
        setStatusMessage('No se pudo acceder a la cámara trasera. Verifica los permisos.');
        setIsScanning(false);
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen]);

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (_) {}
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  };

  const resetState = () => {
    setMatchedProduct(null);
    setScannedCode('');
    setQuantity(1);
    setIsLinking(false);
    setLinkSearchQuery('');
    setStatusMessage('');
    lastScannedCodeRef.current = '';
    lastScannedTimeRef.current = 0;
  };

  // Buscar coincidencia en el catálogo local
  const findProductByBarcode = (code) => {
    if (!code) return null;
    const clean = code.trim().toLowerCase();

    // 1. Por código de barras asignado
    let found = catalog.find((p) => p.barcode && String(p.barcode).trim().toLowerCase() === clean);
    if (found) return found;

    // 2. Por código FUN (ej: FUN805803 o 805803)
    found = catalog.find((p) => {
      if (!p.codigo) return false;
      const cleanCod = p.codigo.replace(/[^a-z0-9]/gi, '').toLowerCase();
      const cleanScanned = clean.replace(/[^a-z0-9]/gi, '');
      return cleanCod === cleanScanned || (cleanScanned.length > 4 && cleanCod.includes(cleanScanned));
    });
    if (found) return found;

    // 3. Por número de caja si es igual
    found = catalog.find((p) => p.numero && String(p.numero).trim() === clean);
    if (found) return found;

    // 4. Por ID de fila
    const numId = parseInt(clean, 10);
    if (!isNaN(numId) && numId > 0 && numId <= catalog.length) {
      found = catalog.find((p) => p.id === numId);
      if (found) return found;
    }

    return null;
  };

  // Cuando la cámara detecta un código
  const handleBarcodeDetected = (code) => {
    const now = Date.now();
    // Prevenir detección repetida en menos de 1.8 segundos del mismo código
    if (code === lastScannedCodeRef.current && now - lastScannedTimeRef.current < 1800) {
      return;
    }

    lastScannedCodeRef.current = code;
    lastScannedTimeRef.current = now;

    // Vibración corta y sonido de confirmación
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    playBeep(920, 0.1);

    setScannedCode(code);
    const product = findProductByBarcode(code);

    if (product) {
      setMatchedProduct(product);
      setQuantity(1);
      setIsLinking(false);

      // Si está en modo auto-suma continua (+1 por escaneo)
      if (autoAddMode) {
        onApplyUpdates([
          {
            id: product.id,
            nombre: product.nombre,
            delta: 1,
            new_total: (product.conteo_fisico || 0) + 1,
            method: 'Código de Barras Rápido'
          }
        ]);
        playBeep(1200, 0.15);
      }
    } else {
      setMatchedProduct(null);
      setIsLinking(true);
      playBeep(350, 0.2); // Tono bajo para advertir que es nuevo/desconocido
    }
  };

  // Confirmar suma manual para el producto escaneado
  const handleConfirmCount = () => {
    if (!matchedProduct) return;
    const delta = Math.max(1, quantity);
    const newTotal = (matchedProduct.conteo_fisico || 0) + delta;

    onApplyUpdates([
      {
        id: matchedProduct.id,
        nombre: matchedProduct.nombre,
        delta: delta,
        new_total: newTotal,
        method: 'Código de Barras'
      }
    ]);

    if (navigator.vibrate) {
      navigator.vibrate([40, 30, 40]);
    }
    playBeep(1050, 0.15);

    // Limpiar para el siguiente escaneo
    setMatchedProduct(null);
    setScannedCode('');
    setQuantity(1);
  };

  // Vincular este código de barras a un producto del catálogo
  const handleLinkProduct = (product) => {
    if (!product || !scannedCode) return;
    if (onLinkBarcode) {
      onLinkBarcode(product.id, scannedCode);
    }
    setMatchedProduct(product);
    setIsLinking(false);
    playBeep(980, 0.15);
  };

  // Candidatos para vincular cuando no se encuentra el código
  const linkCandidates = linkSearchQuery.trim()
    ? catalog
        .filter((p) => {
          const q = linkSearchQuery.toLowerCase();
          return (
            (p.nombre && p.nombre.toLowerCase().includes(q)) ||
            (p.numero && String(p.numero).includes(q)) ||
            String(p.id) === q
          );
        })
        .slice(0, 10)
    : [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between p-4 max-w-lg mx-auto animate-in fade-in">
      
      {/* Cabecera */}
      <div className="flex items-center justify-between z-10 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
            <ScanBarcode className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              Lector de Códigos de Barras
            </h3>
            <p className="text-[11px] text-slate-400">Apunta al código UPC o EAN de la caja</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-full text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Visor de Cámara y Retícula de Escaneo */}
      <div className="relative flex-1 flex flex-col items-center justify-center my-3 overflow-hidden rounded-3xl bg-slate-950 border border-slate-800">
        
        {/* Contenedor del scanner de html5-qrcode */}
        <div id="barcode-scanner-reader" className="w-full h-full object-cover"></div>

        {/* Guía visual láser sobrepuesta */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-64 h-36 border-2 border-dashed border-blue-400/70 rounded-2xl relative shadow-2xl shadow-blue-500/20 flex items-center justify-center">
            {/* Línea láser animada */}
            <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent animate-pulse shadow-lg shadow-red-500"></div>
            <div className="absolute top-2 left-2 text-[10px] text-blue-300 font-mono uppercase bg-slate-900/80 px-1.5 py-0.5 rounded">
              Escanear código
            </div>
          </div>
        </div>

        {statusMessage && (
          <div className="absolute bottom-4 inset-x-4 bg-black/80 backdrop-blur-md p-2 rounded-xl text-center text-xs text-amber-300 border border-amber-900/60">
            {statusMessage}
          </div>
        )}

        {/* Interruptor de Modo Auto-Suma (+1 continuo) */}
        <div className="absolute top-3 right-3 z-20">
          <button
            type="button"
            onClick={() => setAutoAddMode(!autoAddMode)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 shadow-lg border backdrop-blur-md transition-all ${
              autoAddMode
                ? 'bg-emerald-600/90 text-white border-emerald-400 shadow-emerald-900/40'
                : 'bg-slate-900/80 text-slate-300 border-slate-700'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto +1: {autoAddMode ? 'ACTIVADO' : 'MANUAL'}</span>
          </button>
        </div>
      </div>

      {/* Panel Inferior: Resultado del Escaneo */}
      <div className="z-10 bg-slate-900/95 border border-slate-800 rounded-3xl p-4 space-y-3 shadow-2xl">
        
        {matchedProduct ? (
          /* Producto Encontrado */
          <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <span className="text-xs font-bold text-amber-300 bg-amber-950/80 border border-amber-800 px-2 py-0.5 rounded">
                    Fila #{matchedProduct.id}
                  </span>
                  {matchedProduct.numero && (
                    <span className="text-xs font-bold text-blue-300 bg-blue-950/80 border border-blue-800 px-2 py-0.5 rounded">
                      Caja #{matchedProduct.numero}
                    </span>
                  )}
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    Código: {scannedCode}
                  </span>
                </div>
                <h4 className="font-semibold text-white text-sm leading-snug line-clamp-2">
                  {matchedProduct.nombre}
                </h4>
              </div>
            </div>

            {/* Selector de cantidad y botón confirmar */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 mr-1">Cantidad:</span>
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm"
                >
                  -
                </button>
                <span className="w-8 text-center font-extrabold text-base text-white">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm"
                >
                  +
                </button>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 5)}
                  className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300"
                >
                  +5
                </button>
              </div>

              <button
                type="button"
                onClick={handleConfirmCount}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-sm shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 transition"
              >
                <Check className="w-4 h-4" /> Guardar Conteo
              </button>
            </div>
          </div>
        ) : isLinking && scannedCode ? (
          /* Código no reconocido: opción de vincularlo */
          <div className="space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Código {scannedCode} no está vinculado aún</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Escribe el nombre o número de fila para enlazar permanentemente este código de barras al producto:
            </p>
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar producto a vincular (ej: Michael Jordan, 209, Fila 36)..."
                value={linkSearchQuery}
                onChange={(e) => setLinkSearchQuery(e.target.value)}
                className="w-full p-2 pl-8 bg-slate-800 text-xs text-white rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            </div>

            {linkCandidates.length > 0 && (
              <div className="max-h-36 overflow-y-auto space-y-1 pt-1 divide-y divide-slate-800">
                {linkCandidates.map((cand) => (
                  <div
                    key={cand.id}
                    onClick={() => handleLinkProduct(cand)}
                    className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 cursor-pointer flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="truncate">
                      <span className="font-bold text-amber-300 mr-1.5">Fila #{cand.id}</span>
                      <span className="text-white">{cand.nombre}</span>
                    </div>
                    <button
                      type="button"
                      className="px-2 py-1 rounded bg-blue-600 text-[10px] font-bold text-white shrink-0 flex items-center gap-1"
                    >
                      <LinkIcon className="w-3 h-3" /> Vincular
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Esperando escaneo */
          <div className="text-center py-2 text-xs text-slate-400">
            <p className="font-semibold text-slate-300">Cámara activa lista para escanear</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Coloca la caja frente al visor; detectará códigos automáticamente al instante.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
