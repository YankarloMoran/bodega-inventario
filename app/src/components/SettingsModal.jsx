import React, { useState } from 'react';
import { Settings, X, Save, Key, Database, User, Download, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { SUPABASE_URL } from '../utils/supabaseClient';

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onExportCsv,
  onTestConnection
}) {
  const [operatorName, setOperatorName] = useState(settings.operatorName || 'Yankarlo');
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey || '');
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveSettings({
      operatorName: operatorName.trim() || 'Operador',
      geminiApiKey: geminiApiKey.trim()
    });
    onClose();
  };

  const handleTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onTestConnection();
      setTestResult(res);
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-md w-full shadow-2xl animate-in zoom-in-95 space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Cabecera */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Configuración del Sistema</h3>
              <p className="text-xs text-slate-400">Base de datos en tiempo real y Gemini AI</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Nombre del Operador */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-400" /> Nombre del Operador (Tú o tu ayudante)
            </label>
            <input
              type="text"
              value={operatorName}
              onChange={(e) => setOperatorName(e.target.value)}
              placeholder="Ej: Yankarlo, Carlos, Luis..."
              className="w-full p-2.5 bg-slate-800 text-sm text-white rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500"
              required
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Cada conteo y acción de voz/cámara se registrará con este nombre para auditoría.
            </p>
          </div>

          {/* Estado de Supabase */}
          <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-slate-200">Supabase Cloud (Tiempo Real)</span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-emerald-950 text-emerald-300 border border-emerald-800">
                Conectado
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono break-all">
              {SUPABASE_URL}
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-slate-400">Multi-usuario instantáneo (WebSockets)</span>
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting}
                className="text-[11px] text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1"
              >
                <RefreshCw className={`w-3 h-3 ${isTesting ? 'animate-spin' : ''}`} />
                {isTesting ? 'Probando...' : 'Probar conexión'}
              </button>
            </div>

            {testResult && (
              <div className={`p-2 rounded-xl text-[11px] flex items-start gap-1.5 mt-2 ${
                testResult.success ? 'bg-emerald-950/80 border border-emerald-800 text-emerald-300' : 'bg-rose-950/80 border border-rose-800 text-rose-300'
              }`}>
                {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* Gemini API Key */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-purple-400" /> Gemini API Key (Para fotos con IA)
            </label>
            <input
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full p-2.5 bg-slate-800 text-xs font-mono text-white rounded-xl border border-slate-700 focus:outline-none focus:border-purple-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Se guarda en tu celular. Es gratuita en Google AI Studio (permite hasta 15 fotos/min).
            </p>
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center justify-center gap-1.5 shadow-lg shadow-blue-600/30"
            >
              <Save className="w-4 h-4" /> Guardar Ajustes
            </button>
          </div>
        </form>

        {/* Sección de exportación a Excel / CSV */}
        <div className="border-t border-slate-800 pt-3">
          <div className="text-xs font-semibold text-slate-300 mb-1">Descarga de Reporte Final</div>
          <p className="text-[10px] text-slate-500 mb-2">
            Descarga en tu celular el archivo Excel / CSV con todos los 1,031 productos, conteos físicos y diferencias (faltantes o sobrantes).
          </p>
          <button
            type="button"
            onClick={onExportCsv}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-900/60 font-semibold flex items-center justify-center gap-2 transition"
          >
            <Download className="w-4 h-4" /> Exportar Inventario a Excel (.CSV)
          </button>
        </div>

      </div>
    </div>
  );
}
