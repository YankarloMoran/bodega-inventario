/**
 * Módulo de Reconocimiento y Síntesis de Voz
 * Funciona nativamente en el navegador del teléfono (100% Gratis, Sin límites)
 */

// Mapa de números hablados en español a dígitos
const SPANISH_NUMBERS = {
  'cero': 0, 'un': 1, 'uno': 1, 'una': 1,
  'dos': 2, 'tres': 3, 'cuatro': 4, 'cinco': 5,
  'seis': 6, 'siete': 7, 'ocho': 8, 'nueve': 9,
  'diez': 10, 'once': 11, 'doce': 12, 'trece': 13,
  'catorce': 14, 'quince': 15, 'dieciseis': 16, 'dieciséis': 16,
  'diecisiete': 17, 'dieciocho': 18, 'diecinueve': 19,
  'veinte': 20, 'veintiuno': 21, 'veintidos': 22, 'veintidós': 22,
  'veintitres': 23, 'veintitrés': 23, 'veinticuatro': 24, 'veinticinco': 25,
  'treinta': 30, 'cuarenta': 40, 'cincuenta': 50
};

/**
 * Convierte palabras numéricas comunes a números
 */
function parseSpanishQuantity(text) {
  const words = text.toLowerCase().split(/\s+/);
  for (const word of words) {
    if (SPANISH_NUMBERS[word] !== undefined) {
      return SPANISH_NUMBERS[word];
    }
  }
  return null;
}

/**
 * Parsea un comando hablado en español para extraer:
 * - Cantidad a sumar (ej: "anota 4", "son 2", "hay 1", "suma 3")
 * - Número de caja del Funko (ej: "número 209", "1586", "#14")
 * - Términos de búsqueda del personaje
 */
export function parseVoiceCommand(transcript) {
  if (!transcript) return null;

  const raw = transcript.trim();
  let clean = raw.toLowerCase();

  // 1. Extraer cantidad
  let quantity = 1; // por defecto si no dice número específico
  
  // Buscar patrones como "anota 3", "suma 4", "hay 5", "son 2", "conté 1", "cantidad 4"
  const qtyRegex = /(?:anota|anotar|suma|sumar|hay|son|conte|conté|poner|agrega|agregar|cantidad|total)\s+([0-9]+|[a-zñáéíóú]+)/i;
  const qtyMatch = clean.match(qtyRegex);

  if (qtyMatch) {
    const val = qtyMatch[1];
    if (/^\d+$/.test(val)) {
      quantity = parseInt(val, 10);
    } else {
      const parsedWord = parseSpanishQuantity(val);
      if (parsedWord !== null) quantity = parsedWord;
    }
    // Quitar la parte de la cantidad del texto para no confundir con el número de Funko
    clean = clean.replace(qtyMatch[0], ' ');
  } else {
    // Si la frase termina en un número aislado (ej: "Funko Spiderman 1586 cuatro")
    const endNumberMatch = clean.match(/\s+([0-9]{1,3}|un|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)$/i);
    if (endNumberMatch) {
      const val = endNumberMatch[1];
      if (/^\d+$/.test(val)) {
        quantity = parseInt(val, 10);
      } else {
        const parsedWord = parseSpanishQuantity(val);
        if (parsedWord !== null) quantity = parsedWord;
      }
      clean = clean.slice(0, endNumberMatch.index);
    }
  }

  // 2. Extraer número de caja (número de 1 a 4 dígitos precedido o no por # o número)
  let boxNumber = null;
  const boxNumMatch = clean.match(/(?:#|numero|número|num|caja)?\s*([0-9]{1,4})\b/i);
  if (boxNumMatch) {
    boxNumber = boxNumMatch[1];
    clean = clean.replace(boxNumMatch[0], ' ');
  }

  // 3. Lo que sobra es el nombre del personaje o producto
  const searchTerms = clean
    .replace(/\b(funko|pop|figura|de|del|la|el|los|las|por|favor)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return {
    rawTranscript: raw,
    quantity: Math.max(1, quantity),
    boxNumber: boxNumber,
    searchTerms: searchTerms
  };
}

/**
 * Hace que el teléfono hable (Text-to-Speech)
 */
export function speakText(text) {
  if (!('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel(); // Detener cualquier audio anterior
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-GT'; // Español Guatemala / Latino
    utterance.rate = 1.05;    // Ligeramente más rápido para no frenar al usuario
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('Error al hablar:', err);
  }
}

/**
 * Inicializa el reconocedor de voz del navegador
 */
export function createSpeechRecognizer(onResult, onEnd, onError) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    throw new Error('Tu navegador no soporta reconocimiento de voz nativo. Utiliza Google Chrome o Safari.');
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'es-419'; // Español latinoamericano
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    if (onResult) onResult(transcript);
  };

  recognition.onerror = (event) => {
    console.warn('SpeechRecognition error:', event.error);
    if (onError) onError(event.error);
  };

  recognition.onend = () => {
    if (onEnd) onEnd();
  };

  return recognition;
}

