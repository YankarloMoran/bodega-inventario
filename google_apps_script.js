/**
 * SCRIPT DE SINCRONIZACIÓN EN TIEMPO REAL CON GOOGLE SHEETS
 * Inventario Bodega de Juguetes & Funkos
 * 
 * INSTRUCCIONES DE INSTALACIÓN EN 3 PASOS:
 * 1. En tu Google Sheet con el inventario, ve al menú superior: Extensiones > Apps Script.
 * 2. Borra todo el código que aparezca y pega este código completo.
 * 3. Haz clic en "Implementar" (arriba a la derecha) > "Nueva implementación".
 *    - Tipo: "Aplicación web"
 *    - Descripción: "API Inventario Móvil"
 *    - Ejecutar como: "Yo" (tu cuenta)
 *    - Quién tiene acceso: "Cualquier persona" (Anyone)
 *    - Clic en "Implementar" y copia la URL generada (termina en /exec).
 *    - Pega esa URL en la configuración de la App en tu celular. ¡Listo!
 */

function doGet(e) {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var data = sheet.getDataRange().getValues();
    
    if (data.length < 2) {
      return jsonResponse({ success: true, items: [] });
    }
    
    // Asume que la fila 1 son encabezados
    // Col 0: No., Col 1: Nombre, Col 2: Mayo, Col 3: Junio, Col 4: Inventario Actual Físico
    var items = [];
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      if (!row[0] && !row[1]) continue;
      
      items.push({
        id: row[0],
        nombre: row[1],
        stock_mayo: row[2] || 0,
        stock_junio: row[3] || 0,
        conteo_fisico: Number(row[4]) || 0
      });
    }
    
    return jsonResponse({ success: true, items: items });
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  // Espera hasta 10 segundos para evitar colisiones entre varios operarios
  try {
    lock.waitLock(10000);
  } catch (e) {
    return jsonResponse({ success: false, error: "Servidor ocupado, reintentando..." });
  }
  
  try {
    var payload = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var data = sheet.getDataRange().getValues();
    
    // Obtener o crear hoja de Auditoría / Historial
    var historySheet = ss.getSheetByName("Historial_Auditoria");
    if (!historySheet) {
      historySheet = ss.insertSheet("Historial_Auditoria");
      historySheet.appendRow(["Fecha y Hora", "Operador", "ID Producto", "Producto", "Cantidad Modificada", "Total Resultante", "Método", "Tipo Acción"]);
      historySheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#e2e8f0");
    }
    
    var now = new Date();
    var timestamp = Utilities.formatDate(now, Session.getScriptTimeZone() || "GMT-6", "yyyy-MM-dd HH:mm:ss");
    var user = payload.user || "Operador";
    var action = payload.action; // "batch_update", "undo", "add_new"
    
    if (action === "batch_update") {
      var updates = payload.updates || []; // [{ id, delta, new_total, nombre, method }]
      
      // Mapear IDs a número de fila (base 1)
      var idToRow = {};
      for (var r = 1; r < data.length; r++) {
        var rowId = String(data[r][0]).trim();
        if (rowId) {
          idToRow[rowId] = r + 1; // +1 porque getRange es 1-indexed
        }
      }
      
      for (var u = 0; u < updates.length; u++) {
        var upd = updates[u];
        var targetRow = idToRow[String(upd.id).trim()];
        
        if (targetRow) {
          // Columna E (columna 5) es el Conteo Físico
          sheet.getRange(targetRow, 5).setValue(upd.new_total);
          
          // Registrar en historial
          historySheet.appendRow([
            timestamp,
            user,
            upd.id,
            upd.nombre || sheet.getRange(targetRow, 2).getValue(),
            upd.delta > 0 ? "+" + upd.delta : upd.delta,
            upd.new_total,
            upd.method || "Manual",
            "Suma Conteo"
          ]);
        }
      }
      
      return jsonResponse({ success: true, message: "Actualizados " + updates.length + " productos" });
    }
    
    if (action === "undo") {
      var undoItem = payload.item; // { id, delta, new_total, nombre }
      var targetRow = null;
      for (var r = 1; r < data.length; r++) {
        if (String(data[r][0]).trim() === String(undoItem.id).trim()) {
          targetRow = r + 1;
          break;
        }
      }
      
      if (targetRow) {
        sheet.getRange(targetRow, 5).setValue(undoItem.new_total);
        historySheet.appendRow([
          timestamp,
          user,
          undoItem.id,
          undoItem.nombre,
          undoItem.delta > 0 ? "+" + undoItem.delta : undoItem.delta,
          undoItem.new_total,
          "Deshacer",
          "Reversión Conteo"
        ]);
        return jsonResponse({ success: true, message: "Conteo revertido con éxito" });
      }
      return jsonResponse({ success: false, error: "Producto no encontrado para revertir" });
    }
    
    if (action === "add_new") {
      var newItem = payload.item; // { nombre, numero, codigo, conteo }
      var nextId = data.length; // nuevo ID secuencial
      
      sheet.appendRow([
        nextId,
        newItem.nombre,
        0, // Mayo
        0, // Junio
        newItem.conteo || 1 // Conteo Físico
      ]);
      
      historySheet.appendRow([
        timestamp,
        user,
        nextId,
        newItem.nombre,
        "+" + (newItem.conteo || 1),
        newItem.conteo || 1,
        newItem.method || "Físico Nuevo",
        "Nuevo Producto No Catalogado"
      ]);
      
      return jsonResponse({ success: true, new_id: nextId, message: "Nuevo producto creado con ID " + nextId });
    }
    
    return jsonResponse({ success: false, error: "Acción no reconocida" });
    
  } catch (err) {
    return jsonResponse({ success: false, error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

