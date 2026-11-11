import React, { useState, useEffect, useMemo, useCallback } from 'react';
import initialCatalog from './data/catalogo';
import Header from './components/Header';
import SearchBar from './components/SearchBar';
import ProductCard from './components/ProductCard';
import CameraModal from './components/CameraModal';
import VoiceModal from './components/VoiceModal';
import HistoryModal from './components/HistoryModal';
import EditProductModal from './components/EditProductModal';
import NewProductModal from './components/NewProductModal';
import SettingsModal from './components/SettingsModal';
import { Camera, Mic, Plus } from 'lucide-react';
import { searchProducts } from './utils/fuzzySearch';
import {
  fetchSupabaseInventory,
  fetchSupabaseHistory,
  pushBatchToSupabase,
  pushUndoToSupabase,
  pushNewProductToSupabase,
  subscribeToSupabaseRealtime
} from './utils/supabaseSync';

const STORAGE_CATALOG_KEY = 'bodega_inventario_catalog_v2';
const STORAGE_HISTORY_KEY = 'bodega_inventario_history_v2';
const STORAGE_SETTINGS_KEY = 'bodega_inventario_settings_v2';

export default function App() {
  // Configuración de usuario
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
      return saved ? JSON.parse(saved) : {
        operatorName: 'Yankarlo',
        geminiApiKey: ''
      };
    } catch (_) {
      return { operatorName: 'Yankarlo', geminiApiKey: '' };
    }
  });

  // Catálogo de productos (inicia con initialCatalog o lo guardado localmente)
  const [catalog, setCatalog] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_CATALOG_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (_) {}
    return initialCatalog;
  });

  // Historial de acciones / adiciones
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_HISTORY_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  // Estados de interfaz
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('todos');
  const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'syncing' | 'offline'
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modales
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Guardar en localStorage como respaldo offline
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_CATALOG_KEY, JSON.stringify(catalog));
    } catch (err) {
      console.warn('Error guardando catálogo local:', err);
    }
  }, [catalog]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
    } catch (err) {
      console.warn('Error guardando historial local:', err);
    }
  }, [history]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(settings));
    } catch (_) {}
  }, [settings]);

  // Sincronizar con Supabase al abrir la aplicación
  const loadSupabaseData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const remoteRows = await fetchSupabaseInventory();
      if (remoteRows && remoteRows.length > 0) {
        // Mapear los items remotos
        setCatalog(remoteRows);
        setSyncStatus('synced');
      }
      const remoteHistory = await fetchSupabaseHistory(100);
      if (remoteHistory && remoteHistory.length > 0) {
        setHistory(remoteHistory);
      }
    } catch (err) {
      console.warn('No se pudo conectar a Supabase en este momento, usando datos locales:', err);
      setSyncStatus('offline');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSupabaseData();
  }, [loadSupabaseData]);

  // Suscribirse a cambios en tiempo real (WebSockets de Supabase)
  useEffect(() => {
    const unsubscribe = subscribeToSupabaseRealtime(
      // Cambio en inventario (alguien contó o agregó un producto)
      (payload) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        if (eventType === 'UPDATE' && newRow) {
          setCatalog(prev => prev.map(p => (p.id === newRow.id ? { ...p, ...newRow } : p)));
        } else if (eventType === 'INSERT' && newRow) {
          setCatalog(prev => {
            if (prev.some(p => p.id === newRow.id)) return prev;
            return [...prev, newRow];
          });
        } else if (eventType === 'DELETE' && oldRow) {
          setCatalog(prev => prev.filter(p => p.id !== oldRow.id));
        }
      },
      // Nuevo registro en historial
      (newHist) => {
        if (!newHist) return;
        const entry = {
          history_id: newHist.id,
          timestamp: new Date(newHist.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          user: newHist.user_name || 'Operador',
          productId: newHist.product_id,
          productName: newHist.product_name,
          delta: newHist.delta,
          new_total: newHist.new_total,
          method: newHist.method || 'Manual',
          reverted: !!newHist.reverted
        };
        setHistory(prev => {
          if (prev.some(h => h.history_id === entry.history_id)) return prev;
          return [entry, ...prev];
        });
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  // Probar conexión desde el modal de ajustes
  const handleTestConnection = async () => {
    try {
      const rows = await fetchSupabaseInventory();
      return {
        success: true,
        message: `¡Conexión exitosa! Hay ${rows.length} productos sincronizados en tiempo real.`
      };
    } catch (err) {
      return {
        success: false,
        message: err.message || 'No se pudo conectar con Supabase.'
      };
    }
  };

  // Añadir conteo a un producto individual (+1 o +5 desde la tarjeta)
  const handleAddCountToProduct = (product, delta, method = 'Manual') => {
    const newTotal = (product.conteo_fisico || 0) + delta;
    handleApplyBatchUpdates([{
      id: product.id,
      nombre: product.nombre,
      delta: delta,
      new_total: newTotal,
      method: method
    }]);
  };

  // Aplicar un lote de actualizaciones (Foto, Voz o Tarjeta)
  const handleApplyBatchUpdates = async (updates) => {
    if (!updates || updates.length === 0) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Actualización optimista inmediata en memoria
    const updateMap = {};
    for (const u of updates) {
      updateMap[u.id] = u.new_total;
    }

    setCatalog(prev => prev.map(p => {
      if (updateMap[p.id] !== undefined) {
        return {
          ...p,
          conteo_fisico: updateMap[p.id]
        };
      }
      return p;
    }));

    // 2. Registrar en historial local
    const newHistoryEntries = updates.map((u, i) => ({
      history_id: `hist_${Date.now()}_${i}`,
      timestamp: timeStr,
      user: settings.operatorName || 'Operador',
      productId: u.id,
      productName: u.nombre,
      delta: u.delta,
      new_total: u.new_total,
      method: u.method || 'Manual',
      reverted: false
    }));

    setHistory(prev => [...newHistoryEntries, ...prev]);

    // 3. Persistir en Supabase
    setSyncStatus('syncing');
    try {
      const res = await pushBatchToSupabase(updates, settings.operatorName);
      if (res.success) {
        setSyncStatus('synced');
      } else {
        setSyncStatus('offline');
      }
    } catch (_) {
      setSyncStatus('offline');
    }
  };

  // Deshacer una acción previa (Undo)
  const handleUndo = async (historyEntry) => {
    const targetProduct = catalog.find(p => p.id === historyEntry.productId);
    if (!targetProduct) return;

    const revertAmount = historyEntry.delta;
    const newTotal = Math.max(0, (targetProduct.conteo_fisico || 0) - revertAmount);

    // Actualizar catálogo local
    setCatalog(prev => prev.map(p => {
      if (p.id === targetProduct.id) {
        return { ...p, conteo_fisico: newTotal };
      }
      return p;
    }));

    // Marcar entrada de historial como revertida
    setHistory(prev => prev.map(h => {
      if (h.history_id === historyEntry.history_id) {
        return { ...h, reverted: true };
      }
      return h;
    }));

    // Enviar reversión a Supabase
    setSyncStatus('syncing');
    try {
      await pushUndoToSupabase(historyEntry, newTotal, settings.operatorName);
      setSyncStatus('synced');
    } catch (_) {
      setSyncStatus('offline');
    }
  };

  // Guardar corrección de producto existente
  const handleSaveProductEdit = async (updatedProduct) => {
    const original = catalog.find(p => p.id === updatedProduct.id);
    setCatalog(prev => prev.map(p => (p.id === updatedProduct.id ? updatedProduct : p)));

    if (original && original.conteo_fisico !== updatedProduct.conteo_fisico) {
      await handleApplyBatchUpdates([{
        id: updatedProduct.id,
        nombre: updatedProduct.nombre,
        delta: updatedProduct.conteo_fisico - (original.conteo_fisico || 0),
        new_total: updatedProduct.conteo_fisico,
        method: 'Corrección Manual'
      }]);
    } else {
      // Solo cambio de nombre o número
      setSyncStatus('syncing');
      try {
        await pushBatchToSupabase([{
          id: updatedProduct.id,
          nombre: updatedProduct.nombre,
          delta: 0,
          new_total: updatedProduct.conteo_fisico,
          method: 'Edición de Datos'
        }], settings.operatorName);
        setSyncStatus('synced');
      } catch (_) {
        setSyncStatus('offline');
      }
    }
  };

  // Agregar nuevo producto físico que no estaba en el catálogo inicial
  const handleAddNewProduct = async (newProduct) => {
    setCatalog(prev => [...prev, newProduct]);

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setHistory(prev => [{
      history_id: `hist_new_${Date.now()}`,
      timestamp: timeStr,
      user: settings.operatorName || 'Operador',
      productId: newProduct.id,
      productName: newProduct.nombre,
      delta: newProduct.conteo_fisico,
      new_total: newProduct.conteo_fisico,
      method: 'Nuevo Físico Creado',
      reverted: false
    }, ...prev]);

    // Guardar en Supabase
    setSyncStatus('syncing');
    try {
      await pushNewProductToSupabase(newProduct, settings.operatorName);
      setSyncStatus('synced');
    } catch (_) {
      setSyncStatus('offline');
    }
  };

  // Exportar inventario consolidado a archivo CSV descargable en el celular
  const handleExportCsv = () => {
    let csv = '\uFEFF'; // BOM para compatibilidad con caracteres en Excel UTF-8
    csv += 'No.,Nombre para mostrar,Numero_Funko,Codigo_FUN,Stock_Mayo,Stock_Junio,Stock_Octubre,Stock_Teorico,Conteo_Fisico_Actual,Diferencia,Estado\n';

    for (const p of catalog) {
      const teorico = p.stock_teorico || 0;
      const fisico = p.conteo_fisico || 0;
      const diff = fisico - teorico;
      const estado = p.is_new ? 'Nuevo Físico' : (fisico === 0 ? 'Pendiente' : (diff === 0 ? 'Coincide' : (diff > 0 ? 'Sobrante' : 'Faltante')));

      const cleanNombre = `"${(p.nombre || '').replace(/"/g, '""')}"`;
      csv += `${p.id},${cleanNombre},${p.numero || ''},${p.codigo || ''},${p.stock_mayo || 0},${p.stock_junio || 0},${p.stock_octubre || 0},${teorico},${fisico},${diff},${estado}\n`;
    }

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Inventario_Bodega_Fisico_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cálculos estadísticos en tiempo real para la barra superior
  const stats = useMemo(() => {
    let counted = 0;
    let pending = 0;
    let totalPieces = 0;
    let differences = 0;

    for (const p of catalog) {
      const fisico = p.conteo_fisico || 0;
      const teorico = p.stock_teorico || 0;
      if (fisico > 0) {
        counted++;
        totalPieces += fisico;
      } else {
        pending++;
      }
      if (fisico !== teorico && (fisico > 0 || teorico > 0)) {
        differences++;
      }
    }

    return {
      total: catalog.length,
      counted,
      pending,
      totalPieces,
      differences
    };
  }, [catalog]);

  // Filtrado y búsqueda rápida
  const filteredProducts = useMemo(() => {
    let list = catalog;

    // Filtros por pestaña
    if (activeFilter === 'pendientes') {
      list = list.filter(p => (p.conteo_fisico || 0) === 0);
    } else if (activeFilter === 'contados') {
      list = list.filter(p => (p.conteo_fisico || 0) > 0);
    } else if (activeFilter === 'diferencias') {
      list = list.filter(p => (p.conteo_fisico || 0) !== (p.stock_teorico || 0));
    } else if (activeFilter === 'nuevos') {
      list = list.filter(p => p.is_new);
    }

    // Búsqueda inteligente por nombre, número de caja o código [FUN...]
    if (searchQuery.trim()) {
      list = searchProducts(list, searchQuery);
    }

    return list;
  }, [catalog, activeFilter, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* Cabecera Móvil */}
      <Header
        operatorName={settings.operatorName}
        syncStatus={syncStatus}
        stats={stats}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenNewProduct={() => setIsNewProductOpen(true)}
        onRefreshSync={loadSupabaseData}
        isRefreshing={isRefreshing}
      />

      {/* Barra de Búsqueda y Filtros */}
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        stats={stats}
      />

      {/* Listado Virtualizado de Productos */}
      <main className="flex-1 overflow-y-auto px-4 py-2 space-y-2 pb-28">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-12 h-12 rounded-full bg-slate-900 border border-slate-800 text-slate-500 mx-auto flex items-center justify-center mb-3 text-lg font-bold">
              ?
            </div>
            <p className="text-sm font-semibold text-slate-300">No se encontraron productos</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Intenta buscar por el número de caja (ej: 209), nombre de personaje o código [FUN...].
            </p>
            <button
              onClick={() => setIsNewProductOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Registrar como nuevo en bodega
            </button>
          </div>
        ) : (
          filteredProducts.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              onAddCount={(delta) => handleAddCountToProduct(product, delta, 'Botón Rápido')}
              onEdit={() => setEditingProduct(product)}
            />
          ))
        )}
      </main>

      {/* Botonera Flotante Inferior para el Celular (Cámara IA y Micrófono de Voz) */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent pt-6 pb-[calc(var(--safe-bottom)+0.75rem)] px-4 pointer-events-none">
        <div className="max-w-md mx-auto flex items-center justify-center gap-4 pointer-events-auto">
          {/* Botón de Voz */}
          <button
            onClick={() => setIsVoiceOpen(true)}
            className="flex-1 max-w-[160px] h-14 rounded-2xl bg-slate-800/95 hover:bg-slate-700 active:scale-95 text-indigo-400 border border-indigo-500/30 flex items-center justify-center gap-2 shadow-xl shadow-black/50 backdrop-blur-md transition-all"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 flex items-center justify-center">
              <Mic className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-left">
              <div className="text-[10px] uppercase font-bold text-indigo-300">Dictado</div>
              <div className="text-xs font-semibold text-white">Comando Voz</div>
            </div>
          </button>

          {/* Botón Principal: Escaneo con Cámara IA */}
          <button
            onClick={() => setIsCameraOpen(true)}
            className="flex-1 max-w-[190px] h-14 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 hover:brightness-110 active:scale-95 text-white flex items-center justify-center gap-2.5 shadow-xl shadow-blue-900/40 backdrop-blur-md transition-all font-semibold"
          >
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
              <Camera className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <div className="text-[10px] uppercase tracking-wider text-blue-200">Reconocer</div>
              <div className="text-xs font-bold text-white">Foto con IA</div>
            </div>
          </button>
        </div>
      </div>

      {/* Modales del Sistema */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        apiKey={settings.geminiApiKey}
        catalog={catalog}
        onApplyUpdates={handleApplyBatchUpdates}
      />

      <VoiceModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        catalog={catalog}
        onApplyUpdates={handleApplyBatchUpdates}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onUndo={handleUndo}
      />

      {editingProduct && (
        <EditProductModal
          isOpen={!!editingProduct}
          onClose={() => setEditingProduct(null)}
          product={editingProduct}
          onSave={handleSaveProductEdit}
        />
      )}

      <NewProductModal
        isOpen={isNewProductOpen}
        onClose={() => setIsNewProductOpen(false)}
        onAddProduct={handleAddNewProduct}
        catalogLength={catalog.length}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
        onExportCsv={handleExportCsv}
        onTestConnection={handleTestConnection}
      />
    </div>
  );
}
