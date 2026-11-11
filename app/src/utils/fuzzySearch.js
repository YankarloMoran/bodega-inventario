/**
 * Algoritmo de búsqueda difusa y coincidencia para juguetes y Funkos
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
 * Busca productos en el catálogo dado un texto de búsqueda
 * Prioriza:
 * 1. Coincidencia exacta de número de Funko (#209, 1586, etc.)
 * 2. Coincidencia de código [FUNxxxx]
 * 3. Coincidencia de tokens del nombre (ej: "spider man", "goku", "jordan")
 */
export function searchProducts(catalog, query, limit = 50) {
  if (!query || !query.trim()) {
    return catalog.slice(0, limit);
  }

  const cleanQuery = normalizeText(query);
  const queryTokens = cleanQuery.split(' ').filter(t => t.length > 0);

  // Extraer número de caja si el usuario escribió un número
  const numMatch = cleanQuery.match(/(?:#|num|no|numero)?\s*([0-9]{1,5})/i);
  const queryNumber = numMatch ? numMatch[1] : null;

  const scored = catalog.map(item => {
    let score = 0;
    const cleanNombre = normalizeText(item.nombre);
    const itemNumber = item.numero ? String(item.numero).trim() : '';
    const itemCodigo = item.codigo ? normalizeText(item.codigo) : '';

    // Si coincide el número de caja exacto
    if (queryNumber && itemNumber === queryNumber) {
      score += 100;
    }

    // Coincidencia de código FUN
    if (itemCodigo && cleanQuery.includes(itemCodigo)) {
      score += 80;
    }

    // Coincidencia exacta del texto completo
    if (cleanNombre.includes(cleanQuery)) {
      score += 50;
    }

    // Coincidencia por palabras clave
    let matchedTokens = 0;
    for (const token of queryTokens) {
      if (token === queryNumber) continue; // ya evaluado
      if (cleanNombre.includes(token)) {
        matchedTokens++;
        score += 15 * token.length;
      }
    }

    // Penalización si casi no coinciden palabras
    if (queryTokens.length > 1 && matchedTokens === 0 && (!queryNumber || itemNumber !== queryNumber)) {
      score = 0;
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

  // 1. Si tenemos número de caja, buscar candidatos que tengan ese mismo número
  let candidates = catalog;
  if (targetNum) {
    const exactNum = catalog.filter(p => p.numero === targetNum);
    if (exactNum.length === 1) {
      return exactNum[0];
    }
    if (exactNum.length > 1) {
      candidates = exactNum;
    }
  }

  // 2. Puntuar candidatos restantes por similitud de nombre
  const charTokens = cleanChar.split(' ').filter(t => t.length > 2);
  let bestItem = null;
  let maxScore = -1;

  for (const item of candidates) {
    let score = 0;
    const norm = normalizeText(item.nombre);

    if (targetNum && item.numero === targetNum) {
      score += 50;
    }

    for (const token of charTokens) {
      if (norm.includes(token)) {
        score += 10;
      }
    }

    if (score > maxScore) {
      maxScore = score;
      bestItem = item;
    }
  }

  return maxScore > 0 ? bestItem : (candidates[0] || null);
}

