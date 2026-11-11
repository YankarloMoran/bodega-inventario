import { supabase } from './supabaseClient';

/**
 * Carga todo el inventario desde Supabase (1031+ registros)
 */
export async function fetchSupabaseInventory() {
  // Supabase por defecto pagina a 1000 items si no se especifica rango
  let allRows = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await supabase
      .from('inventario')
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) {
      console.error('Error fetching Supabase inventory:', error);
      throw error;
    }

    if (data && data.length > 0) {
      allRows = allRows.concat(data);
      if (data.length < pageSize) {
        hasMore = false;
      } else {
        from += pageSize;
      }
    } else {
      hasMore = false;
    }
  }

  return allRows;
}

/**
 * Carga los últimos registros de historial desde Supabase
 */
export async function fetchSupabaseHistory(limit = 100) {
  const { data, error } = await supabase
    .from('historial_conteo')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching Supabase history:', error);
    return [];
  }

  return (data || []).map(row => ({
    history_id: row.id,
    timestamp: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    user: row.user_name || 'Operador',
    productId: row.product_id,
    productName: row.product_name,
    delta: row.delta,
    new_total: row.new_total,
    method: row.method || 'Manual',
    reverted: !!row.reverted
  }));
}

/**
 * Guarda un lote de actualizaciones en Supabase (atómico por fila)
 */
export async function pushBatchToSupabase(updates, operatorName = 'Operador') {
  if (!updates || updates.length === 0) return { success: true };

  try {
    for (const u of updates) {
      // 1. Actualizar conteo físico en inventario
      const { error: updateError } = await supabase
        .from('inventario')
        .update({
          conteo_fisico: u.new_total,
          updated_at: new Date().toISOString()
        })
        .eq('id', u.id);

      if (updateError) {
        console.error('Error updating inventario:', updateError);
        throw updateError;
      }

      // 2. Registrar en historial
      const { error: histError } = await supabase
        .from('historial_conteo')
        .insert({
          product_id: u.id,
          product_name: u.nombre,
          delta: u.delta,
          new_total: u.new_total,
          user_name: operatorName,
          method: u.method || 'Manual',
          reverted: false
        });

      if (histError) {
        console.warn('Error logging to historial_conteo:', histError);
      }
    }

    return { success: true };
  } catch (err) {
    console.error('pushBatchToSupabase error:', err);
    return { success: false, error: err };
  }
}

/**
 * Revertir un conteo en Supabase
 */
export async function pushUndoToSupabase(historyEntry, newTotal, operatorName = 'Operador') {
  try {
    // 1. Actualizar conteo físico en inventario
    const { error: updateError } = await supabase
      .from('inventario')
      .update({
        conteo_fisico: newTotal,
        updated_at: new Date().toISOString()
      })
      .eq('id', historyEntry.productId);

    if (updateError) throw updateError;

    // 2. Marcar registro como revertido si tiene ID de base de datos
    if (historyEntry.history_id && !String(historyEntry.history_id).startsWith('hist_')) {
      await supabase
        .from('historial_conteo')
        .update({ reverted: true })
        .eq('id', historyEntry.history_id);
    }

    // 3. Agregar entrada de reversión al historial
    await supabase
      .from('historial_conteo')
      .insert({
        product_id: historyEntry.productId,
        product_name: historyEntry.productName,
        delta: -Math.abs(historyEntry.delta),
        new_total: newTotal,
        user_name: operatorName,
        method: 'Deshacer (Undo)',
        reverted: true
      });

    return { success: true };
  } catch (err) {
    console.error('pushUndoToSupabase error:', err);
    return { success: false, error: err };
  }
}

/**
 * Registrar un nuevo producto físico no catalogado
 */
export async function pushNewProductToSupabase(newProduct, operatorName = 'Operador') {
  try {
    const { error: insertError } = await supabase
      .from('inventario')
      .insert({
        id: newProduct.id,
        nombre: newProduct.nombre,
        numero: newProduct.numero || '',
        codigo: newProduct.codigo || '',
        stock_mayo: 0,
        stock_junio: 0,
        stock_octubre: 0,
        stock_teorico: 0,
        conteo_fisico: newProduct.conteo_fisico || 0,
        is_new: true,
        updated_at: new Date().toISOString()
      });

    if (insertError) throw insertError;

    await supabase
      .from('historial_conteo')
      .insert({
        product_id: newProduct.id,
        product_name: newProduct.nombre,
        delta: newProduct.conteo_fisico || 0,
        new_total: newProduct.conteo_fisico || 0,
        user_name: operatorName,
        method: 'Nuevo Físico Creado',
        reverted: false
      });

    return { success: true };
  } catch (err) {
    console.error('pushNewProductToSupabase error:', err);
    return { success: false, error: err };
  }
}

/**
 * Suscribirse a cambios en tiempo real de Supabase (WebSockets)
 */
export function subscribeToSupabaseRealtime(onProductChange, onHistoryChange) {
  const channel = supabase
    .channel('inventario_realtime_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'inventario' },
      payload => {
        if (onProductChange) {
          onProductChange(payload);
        }
      }
    )
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'historial_conteo' },
      payload => {
        if (onHistoryChange) {
          onHistoryChange(payload.new);
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
