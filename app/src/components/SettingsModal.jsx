import React, { useState } from 'react';
import { Settings, X, Save, Key, Sheet, User, Download, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';

export default function SettingsModal({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onExportCsv,
  onTestSheetsConnection
}) {
  const [operatorName, setOperatorName] = useState(settings.operatorName || '');
  const [sheetsUrl, setSheetsUrl] = useState(settings.sheetsUrl || '');
  const [geminiApiKey, setGeminiApiKey] = useState(settings.geminiApiKey || '');
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSaveSettings({
      operatorName: operatorName.trim() || 'Operador',
      sheetsUrl: sheetsUrl.trim(),
      geminiApiKey: geminiApiKey.trim()
    });
    onClose();
  };

  const handleTest = async () => {
    if (!sheetsUrl.trim()) {
      setTestResult({ success: false, message: 'Ingresa primero la URL de Google Sheets.' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await onTestSheetsConnection(sheetsUrl.trim());
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
              <p className="text-xs text-slate-400">Ajustes de sincronización y claves de IA</p>
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
              Este nombre aparecerá en la hoja de Google Sheets en el registro de auditoría.
            </p>
          </div>

          {/* URL de Google Sheets Apps Script */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Sheet className="w-3.5 h-3.5 text-emerald-400" /> URL de Web App de Google Sheets
            </label>
            <input
              type="url"
              value={sheetsUrl}
              onChange={(e) => setSheetsUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full p-2.5 bg-slate-800 text-xs font-mono text-white rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500"
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-slate-500">
                Pega la URL del Apps Script para sincronización multiusuario.
              </span>
              <button
                type="button"
                onClick={handleTest}
                disabled={isTesting}
                className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold underline"
              >
                {isTesting ? 'Probando...' : 'Probar Conexión'}
              </button>
            </div>

            {testResult && (
              <div className={`mt-2 p-2 rounded-lg text-[11px] flex items-center gap-1.5 ${
                testResult.success
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800'
                  : 'bg-rose-950/60 text-rose-300 border border-rose-800'
              }`}>
                {testResult.success ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>

          {/* API Key de Gemini */}
          <div>
            <label className="block font-semibold text-slate-300 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" /> Google Gemini API Key
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-blue-400 hover:underline flex items-center gap-0.5"
              >
                Obtener clave gratis <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </label>
            <input
              type="password"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              placeholder="AIzaSy..."
              className="w-full p-2.5 bg-slate-800 text-xs font-mono text-white rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Necesaria para que la cámara del celular reconozca múltiples Funkos en una foto. Es 100% gratuita hasta 1,500 fotos/día.
            </p>
          </div>

          {/* Descargar CSV de respaldo */}
          <div className="pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onExportCsv}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2 transition"
            >
              <Download className="w-4 h-4 text-emerald-400" /> Descargar Inventario Actualizado (.CSV)
            </button>
            <p className="text-[10px] text-slate-500 text-center mt-1">
              Descarga directa a tu teléfono con las cantidades físicas contadas hasta el momento.
            </p>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-lg flex items-center justify-center gap-1.5 active:scale-95 transition"
            >
              <Save className="w-3.5 h-3.5" /> Guardar Ajustes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

