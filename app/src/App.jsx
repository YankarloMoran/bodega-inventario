import React, { useState, useEffect, useMemo } from 'react';
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
  fetchRemoteInventory,
  pushBatchUpdates,
  pushUndoUpdate,
  pushNewProduct,
  flushOfflineQueue
} from './utils/sheetsSync';

const STORAGE_CATALOG_KEY = 'bodega_inventario_catalog_v1';
const STORAGE_HISTORY_KEY = 'bodega_inventario_history_v1';
const STORAGE_SETTINGS_KEY = 'bodega_inventario_settings_v1';

export default function App() {
  // Configuración de usuario
  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
      return saved ? JSON.parse(saved) : {
        operatorName: 'Yankarlo',
        sheetsUrl: '',
        geminiApiKey: ''
      };
    } catch (_) {
      return { operatorName: 'Yankarlo', sheetsUrl: '', geminiApiKey: '' };
    }
  });

  // Catálogo de productos (con persistencia local en el navegador)
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
  const [syncStatus, setSyncStatus] = useState('local'); // 'synced' | 'syncing' | 'offline' | 'local'
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modales
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isNewProductOpen, setIsNewProductOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Guardar en localStorage cada vez que cambien datos clave
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

  // Sincronización inicial al cargar la app
  useEffect(() => {
    if (settings.sheetsUrl) {
      handleSyncWithSheets();
    } else {
      setSyncStatus('local');
    }
  }, [settings.sheetsUrl]);

  // Sincronizar con Google Sheets
  const handleSyncWithSheets = async () => {
    if (!settings.sheetsUrl) {
      setSyncStatus('local');
      return;
    }

    setIsRefreshing(true);
    setSyncStatus('syncing');

    try {
      // Vaciar cola offline si había pendientes
      await flushOfflineQueue(settings.sheetsUrl);

      // Traer datos frescos de la hoja
      const remoteItems = await fetchRemoteInventory(settings.sheetsUrl);
      if (remoteItems && remoteItems.length > 0) {
        // Mapear los conteos físicos remotos
        const remoteCountMap = {};
        for (const item of remoteItems) {
          remoteCountMap[String(item.id).trim()] = Number(item.conteo_fisico) || 0;
        }

        // Fusionar con catálogo local
        setCatalog(prev => prev.map(p => {
          const strId = String(p.id).trim();
          if (remoteCountMap[strId] !== undefined) {
            return {
              ...p,
              conteo_fisico: remoteCountMap[strId]
            };
          }
          return p;
        }));
      }

      setSyncStatus('synced');
    } catch (err) {
      console.error('Error sincronizando con Google Sheets:', err);
      setSyncStatus('offline');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Probar conexión desde el modal de ajustes
  const handleTestSheetsConnection = async (testUrl) => {
    try {
      const items = await fetchRemoteInventory(testUrl);
      return {
        success: true,
        message: `¡Conexión exitosa! Se leyeron ${items.length} filas desde Google Sheets.`
      };
    } catch (err) {
      return {
        success: false,
        message: err.message || 'No se pudo conectar a Google Sheets. Revisa los permisos del Apps Script.'
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

  // Aplicar un lote de actualizaciones (provenientes de Foto, Voz o Tarjeta)
  const handleApplyBatchUpdates = async (updates) => {
    if (!updates || updates.length === 0) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Actualizar catálogo en memoria
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

    // 3. Enviar a Google Sheets
    if (settings.sheetsUrl) {
      setSyncStatus('syncing');
      try {
        const res = await pushBatchUpdates(settings.sheetsUrl, updates, settings.operatorName);
        if (res.success) {
          setSyncStatus('synced');
        } else {
          setSyncStatus(res.queued ? 'offline' : 'offline');
        }
      } catch (_) {
        setSyncStatus('offline');
      }
    }
  };

  // Deshacer una acción previa
  const handleUndo = async (historyEntry) => {
    const targetProduct = catalog.find(p => p.id === historyEntry.productId);
    if (!targetProduct) return;

    const revertAmount = historyEntry.delta;
    const newTotal = Math.max(0, (targetProduct.conteo_fisico || 0) - revertAmount);

    // Actualizar catálogo
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

    // Enviar reversión a Google Sheets
    if (settings.sheetsUrl) {
      setSyncStatus('syncing');
      try {
        await pushUndoUpdate(settings.sheetsUrl, {
          id: targetProduct.id,
          nombre: targetProduct.nombre,
          delta: -revertAmount,
          new_total: newTotal
        }, settings.operatorName);
        setSyncStatus('synced');
      } catch (_) {
        setSyncStatus('offline');
      }
    }
  };

  // Guardar corrección de producto existente
  const handleSaveProductEdit = (updatedProduct) => {
    setCatalog(prev => prev.map(p => (p.id === updatedProduct.id ? updatedProduct : p)));
    // Si cambió el conteo físico, enviarlo a Google Sheets
    const original = catalog.find(p => p.id === updatedProduct.id);
    if (original && original.conteo_fisico !== updatedProduct.conteo_fisico) {
      handleApplyBatchUpdates([{
        id: updatedProduct.id,
        nombre: updatedProduct.nombre,
        delta: updatedProduct.conteo_fisico - (original.conteo_fisico || 0),
        new_total: updatedProduct.conteo_fisico,
        method: 'Corrección Manual'
      }]);
    }
  };

  // Agregar nuevo producto físico que no estaba en el Excel
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

    // Enviar creación a Google Sheets
    if (settings.sheetsUrl) {
      setSyncStatus('syncing');
      try {
        await pushNewProduct(settings.sheetsUrl, {
          nombre: newProduct.nombre,
          numero: newProduct.numero,
          codigo: newProduct.codigo,
          conteo: newProduct.conteo_fisico,
          method: 'Nuevo Físico'
        }, settings.operatorName);
        setSyncStatus('synced');
      } catch (_) {
        setSyncStatus('offline');
      }
    }
  };

  // Exportar inventario actualizado a archivo CSV para descargar en el celular
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
    link.setAttribute('download', `Inventario_Bodega_Conteo_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtrado y búsqueda
  const filteredProducts = useMemo(() => {
    let list = catalog;

    // Filtros de pestañas
    if (activeFilter === 'pendientes') {
      list = list.filter(p => (p.conteo_fisico || 0) === 0);
    } else if (activeFilter === 'contados') {
      list = list.filter(p => (p.conteo_fisico || 0) > 0);
    } else if (activeFilter === 'discrepancias') {
      list = list.filter(p => (p.conteo_fisico || 0) > 0 && (p.conteo_fisico || 0) !== (p.stock_teorico || 0));
    } else if (activeFilter === 'nuevos') {
      list = list.filter(p => p.is_new);
    }

    // Búsqueda inteligente
    if (searchQuery.trim()) {
      list = searchProducts(list, searchQuery, 150);
    }

    return list;
  }, [catalog, activeFilter, searchQuery]);

  // Estadísticas globales
  const stats = useMemo(() => {
    let counted = 0;
    let totalPieces = 0;
    let discrepancies = 0;
    let newItems = 0;

    for (const p of catalog) {
      const fisico = p.conteo_fisico || 0;
      const teorico = p.stock_teorico || 0;

      if (fisico > 0) {
        counted++;
        totalPieces += fisico;
        if (fisico !== teorico) discrepancies++;
      }
      if (p.is_new) newItems++;
    }

    return {
      total: catalog.length,
      counted: counted,
      pending: catalog.length - counted,
      totalPieces: totalPieces,
      discrepancies: discrepancies,
      newItems: newItems
    };
  }, [catalog]);

  const nextAvailableId = useMemo(() => {
    if (catalog.length === 0) return 1;
    return Math.max(...catalog.map(p => Number(p.id) || 0)) + 1;
  }, [catalog]);

  return (
    <div className="flex flex-col min-h-screen bg-slate-900 text-slate-100 max-w-lg mx-auto shadow-2xl relative pb-28">
      {/* Barra Superior y Métricas */}
      <Header
        operatorName={settings.operatorName}
        syncStatus={syncStatus}
        stats={stats}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenNewProduct={() => setIsNewProductOpen(true)}
        onRefreshSync={handleSyncWithSheets}
        isRefreshing={isRefreshing}
      />

      {/* Buscador predictivo y Filtros */}
      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        counts={stats}
      />

      {/* Lista de Productos */}
      <main className="flex-1 p-3 overflow-y-auto">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="text-slate-500 text-sm font-medium mb-1">
              No se encontraron figuras con esos criterios.
            </div>
            <div className="text-xs text-slate-400">
              Prueba buscando por número de Funko (ej. <strong>209</strong>) o limpia la búsqueda.
            </div>
          </div>
        ) : (
          <div>
            <div className="text-[11px] text-slate-400 font-semibold px-1 mb-2 flex items-center justify-between">
              <span>Mostrando {filteredProducts.length} productos</span>
              {activeFilter !== 'todos' && (
                <span className="capitalize text-blue-400">Filtro: {activeFilter}</span>
              )}
            </div>

            {filteredProducts.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onAddCount={handleAddCountToProduct}
                onEditProduct={(p) => setEditingProduct(p)}
              />
            ))}
          </div>
        )}
      </main>

      {/* BARRA FLOTANTE INFERIOR: BOTONES MAESTROS DE CÁMARA Y VOZ */}
      <div className="fixed bottom-0 left-0 right-0 z-40 p-3 bg-gradient-to-t from-slate-950 via-slate-900/90 to-transparent pb-[calc(var(--safe-bottom)+0.75rem)]">
        <div className="max-w-lg mx-auto flex items-center justify-center gap-3 px-2">
          {/* Botón de Cámara (Reconocimiento Grupal con IA) */}
          <button
            onClick={() => setIsCameraOpen(true)}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <Camera className="w-5 h-5" />
            <span>Foto Múltiple</span>
          </button>

          {/* Botón de Voz (Comandos Hablados) */}
          <button
            onClick={() => setIsVoiceOpen(true)}
            className="flex-1 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white font-bold text-sm shadow-xl flex items-center justify-center gap-2 active:scale-95 transition"
          >
            <Mic className="w-5 h-5" />
            <span>Contar por Voz</span>
          </button>
        </div>
      </div>

      {/* MODALES DEL SISTEMA */}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        catalog={catalog}
        apiKey={settings.geminiApiKey}
        onConfirmBatch={handleApplyBatchUpdates}
      />

      <VoiceModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        catalog={catalog}
        onConfirmVoiceCount={(upd) => handleApplyBatchUpdates([upd])}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        onUndo={handleUndo}
      />

      <EditProductModal
        isOpen={!!editingProduct}
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onSaveProduct={handleSaveProductEdit}
      />

      <NewProductModal
        isOpen={isNewProductOpen}
        onClose={() => setIsNewProductOpen(false)}
        nextId={nextAvailableId}
        onAddNewProduct={handleAddNewProduct}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={setSettings}
        onExportCsv={handleExportCsv}
        onTestSheetsConnection={handleTestSheetsConnection}
      />
    </div>
  );
}
