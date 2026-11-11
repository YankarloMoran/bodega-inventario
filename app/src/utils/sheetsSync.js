/**
 * Módulo de Sincronización en Tiempo Real con Google Sheets
 * Soporta múltiples operarios simultáneos y cola sin conexión (offline)
 */

const QUEUE_KEY = 'bodega_sync_queue';

export function getOfflineQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_) {
    return [];
  }
}

export function saveOfflineQueue(queue) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Error guardando cola offline:', err);
  }
}

/**
 * Obtiene los datos remotos de Google Sheets
 */
export async function fetchRemoteInventory(sheetsUrl) {
  if (!sheetsUrl || !sheetsUrl.trim()) {
    return null;
  }

  const cleanUrl = sheetsUrl.trim();
  const resp = await fetch(cleanUrl, {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  });

  if (!resp.ok) {
    throw new Error(`Error ${resp.status} al conectar con Google Sheets`);
  }

  const data = await resp.json();
  if (!data.success) {
    throw new Error(data.error || 'Error desconocido al leer Google Sheets');
  }

  return data.items || [];
}

/**
 * Envía un lote de conteos acumulativos a Google Sheets
 */
export async function pushBatchUpdates(sheetsUrl, updates, user) {
  if (!sheetsUrl || !sheetsUrl.trim()) {
    console.log('Sin URL de Google Sheets, guardando solo localmente');
    return { success: true, localOnly: true };
  }

  const payload = {
    action: 'batch_update',
    user: user || 'Operador',
    updates: updates
  };

  try {
    const resp = await fetch(sheetsUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // text/plain evita preflight CORS en Apps Script
      body: JSON.stringify(payload)
    });

    const data = await resp.json();
    return data;
  } catch (err) {
    console.warn('Fallo de red al enviar a Google Sheets. Encolando offline:', err);
    // Guardar en cola para reintentar
    const queue = getOfflineQueue();
    queue.push(payload);
    saveOfflineQueue(queue);
    return { success: false, queued: true, error: err.message };
  }
}

/**
 * Envía la reversión (deshacer) de un conteo a Google Sheets
 */
export async function pushUndoUpdate(sheetsUrl, item, user) {
  if (!sheetsUrl || !sheetsUrl.trim()) {
    return { success: true, localOnly: true };
  }

  const payload = {
    action: 'undo',
    user: user || 'Operador',
    item: item
  };

  try {
    const resp = await fetch(sheetsUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    return await resp.json();
  } catch (err) {
    console.warn('Error en reversión remota, encolando offline:', err);
    const queue = getOfflineQueue();
    queue.push(payload);
    saveOfflineQueue(queue);
    return { success: false, queued: true, error: err.message };
  }
}

/**
 * Agrega un nuevo producto no catalogado a Google Sheets
 */
export async function pushNewProduct(sheetsUrl, newItem, user) {
  if (!sheetsUrl || !sheetsUrl.trim()) {
    return { success: true, localOnly: true, new_id: Date.now() };
  }

  const payload = {
    action: 'add_new',
    user: user || 'Operador',
    item: newItem
  };

  try {
    const resp = await fetch(sheetsUrl.trim(), {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });

    return await resp.json();
  } catch (err) {
    console.warn('Error agregando nuevo producto remoto:', err);
    const queue = getOfflineQueue();
    queue.push(payload);
    saveOfflineQueue(queue);
    return { success: false, queued: true, error: err.message };
  }
}

/**
 * Procesa la cola de operaciones pendientes cuando regresa el internet
 */
export async function flushOfflineQueue(sheetsUrl) {
  if (!sheetsUrl || !sheetsUrl.trim()) return 0;

  const queue = getOfflineQueue();
  if (queue.length === 0) return 0;

  let processed = 0;
  const remaining = [];

  for (const item of queue) {
    try {
      const resp = await fetch(sheetsUrl.trim(), {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(item)
      });
      if (resp.ok) {
        processed++;
      } else {
        remaining.push(item);
      }
    } catch (_) {
      remaining.push(item);
    }
  }

  saveOfflineQueue(remaining);
  return processed;
}

