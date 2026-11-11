/**
 * Algoritmo de búsqueda avanzada para cotejo con Excel/hojas físicas
 */

// Normalizar texto (elimina acentos, mayúsculas y caracteres especiales)
export function normalizeText(text) {
  if (!text) return '';
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar tildes
    .replace(/[^a-z0-9\s#]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Busca productos en el catálogo dado un texto de búsqueda tipo Excel Ctrl+B.
 * Soporta:
 * - Búsqueda por Fila / No. de Hoja Excel (ej: "36", "fila 36", "f 36", "no 36", "#36")
 * - Búsqueda por Número de caja Funko (ej: "#209", "box 209", "209")
 * - Búsqueda por Código [FUN...] (ej: "FUN905930", "905930")
 * - Búsqueda por múltiples palabras en cualquier orden (ej: "jordan bulls", "spider man iron", "harry poster")
 */
export function searchProducts(catalog, query, limit = 200) {
  if (!catalog || !Array.isArray(catalog)) return [];
  if (!query || !query.trim()) {
    return catalog;
  }

  const rawQuery = query.trim();
  const cleanQuery = normalizeText(rawQuery);
  if (!cleanQuery) return catalog;

  const queryTokens = cleanQuery.split(' ').filter(t => t.length > 0);

  // 1. Detectar si el usuario está buscando explícitamente una fila de la hoja/Excel
  // Ejemplos: "fila 15", "f15", "f 15", "no 15", "renglon 15", "hoja 15"
  const rowMatch = cleanQuery.match(/(?:fila|renglon|hoja|item|posicion|f)\s*([0-9]{1,5})/i);
  const explicitRowNumber = rowMatch ? parseInt(rowMatch[1], 10) : null;

  // 2. Detectar si hay un número genérico en la consulta (puede ser ID de fila o número de Funko)
  const genericNumMatch = cleanQuery.match(/(?:#|no|num|numero)?\s*([0-9]{1,5})/i);
  const genericNumber = genericNumMatch ? genericNumMatch[1] : null;
  const genericNumberInt = genericNumber ? parseInt(genericNumber, 10) : null;

  const scored = catalog.map(item => {
    let score = 0;
    const cleanNombre = normalizeText(item.nombre);
    const itemNumber = item.numero ? String(item.numero).trim() : '';
    const itemCodigo = item.codigo ? normalizeText(item.codigo) : '';
    const itemId = item.id ? parseInt(item.id, 10) : null;

    // Prioridad Máxima: Coincidencia explícita con fila de la hoja Excel
    if (explicitRowNumber && itemId === explicitRowNumber) {
      return { item, score: 1000 };
    }

    // Coincidencia con número de fila exacto (cuando escribe solo un número, ej: "36")
    if (genericNumberInt && itemId === genericNumberInt) {
      score += 250;
    }

    // Coincidencia con número de caja de Funko (ej: "#209")
    if (genericNumber && itemNumber === genericNumber) {
      score += 200;
    }

    // Coincidencia exacta con código FUN
    if (itemCodigo && (cleanQuery.includes(itemCodigo) || itemCodigo.includes(cleanQuery))) {
      score += 180;
    }

    // Coincidencia exacta de la frase completa en el nombre
    if (cleanNombre.includes(cleanQuery)) {
      score += 150;
    }

    // Coincidencia por tokens / palabras múltiples en cualquier orden
    let matchedTokens = 0;
    for (const token of queryTokens) {
      if (token === genericNumber) continue; // ya evaluado en número
      if (cleanNombre.includes(token)) {
        matchedTokens++;
        score += 25 * token.length;
      }
    }

    // Si todas las palabras buscadas están en el título, dar bono grande
    const nonNumberTokens = queryTokens.filter(t => t !== genericNumber);
    if (nonNumberTokens.length > 0 && matchedTokens === nonNumberTokens.length) {
      score += 100;
    } else if (nonNumberTokens.length > 1 && matchedTokens === 0 && !genericNumber) {
      score = 0; // Si escribió varias palabras y ninguna coincide, descartar
    }

    return { item, score };
  });

  return scored
    .filter(res => res.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(res => res.item);
}

/**
 * Encuentra el mejor producto para un resultado detectado por IA o Voz
 */
export function findBestMatch(catalog, characterName, boxNumber) {
  if (!catalog || catalog.length === 0) return null;

  const targetNum = boxNumber ? String(boxNumber).replace(/[^0-9]/g, '') : null;
  const cleanChar = normalizeText(characterName || '');

  // 1. Si tenemos número de caja, filtrar candidatos con ese mismo número
  let candidates = catalog;
  if (targetNum) {
    const exactNum = catalog.filter(p => String(p.numero).trim() === targetNum);
    if (exactNum.length === 1) {
      return exactNum[0];
    }
    if (exactNum.length > 1) {
      candidates = exactNum;
    }
  }

  // 2. Si no hay candidatos o el nombre es muy específico, buscar el de mayor similitud
  let best = null;
  let maxScore = -1;
  const tokens = cleanChar.split(' ').filter(t => t.length > 2);

  for (const item of candidates) {
    let score = 0;
    const cleanNombre = normalizeText(item.nombre);

    if (cleanNombre.includes(cleanChar)) {
      score += 100;
    }

    for (const token of tokens) {
      if (cleanNombre.includes(token)) {
        score += 20;
      }
    }

    if (score > maxScore) {
      maxScore = score;
      best = item;
    }
  }

  return best || candidates[0] || null;
}
