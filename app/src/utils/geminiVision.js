/**
 * Módulo de Visión Multimodal con Gemini API
 * Identifica múltiples Funkos y figuras en una sola foto
 * Las fotos NO se guardan en ninguna base de datos (se destruyen en memoria tras procesarse).
 */

/**
 * Redimensiona la imagen en el cliente para que el envío sea ultrarrápido y consuma mínimo ancho de banda
 */
export async function resizeImageToDataUrl(file, maxWidth = 1600, maxHeight = 1600) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a base64 JPEG con 85% de calidad (excelente para OCR sin ser pesado)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Envía la foto a Gemini Flash para identificar todas las figuras visibles
 */
export async function analyzeShelfPhoto(base64DataUrl, apiKey) {
  if (!apiKey || !apiKey.trim()) {
    throw new Error('Debes configurar tu API Key de Gemini en el menú de Configuración para analizar fotos.');
  }

  // Extraer el base64 puro
  const base64Content = base64DataUrl.split(',')[1];
  const mimeType = 'image/jpeg';

  const systemPrompt = `Eres un experto auditor de inventario especializado en figuras Funko Pop y juguetes coleccionables.
Tu tarea es examinar la fotografía de una repisa, mesa o lote de figuras e identificar TODOS los Funkos y juguetes visibles en la foto.

Por cada figura distinta observada en la imagen, extrae:
1. "character": Nombre del personaje o franquicia (ej. "Spider-Man", "Michael Jordan", "Goku", "Harry Potter", "Luffy").
2. "box_number": El número de la caja que aparece en la esquina superior derecha del empaque (ej. "209", "1586", "615", "14"). Si no es un Funko o no tiene número visible, déjalo vacío "".
3. "edition": Variantes o stickers visibles si los hay (ej. "Exclusive", "Deluxe", "Flocked", "Specialty Series", "Glow in the Dark").
4. "count": Cantidad exacta de unidades visibles de esa misma figura/caja en la foto (mínimo 1).

IMPORTANTE: Responde ÚNICAMENTE con un arreglo JSON válido sin texto adicional ni bloques markdown extraños.
Ejemplo de formato esperado:
[
  {
    "character": "Spider-Man",
    "box_number": "1586",
    "edition": "Swinging",
    "count": 3
  },
  {
    "character": "Michael Jordan",
    "box_number": "209",
    "edition": "Moment Deluxe",
    "count": 1
  }
]`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: systemPrompt },
          {
            inline_data: {
              mime_type: mimeType,
              data: base64Content
            }
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.1, // Baja temperatura para máxima precisión
      response_mime_type: 'application/json'
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    let msg = `Error ${response.status} en Gemini API`;
    try {
      const errJson = JSON.parse(errorText);
      if (errJson.error && errJson.error.message) {
        msg = errJson.error.message;
      }
    } catch (_) {}
    throw new Error(msg);
  }

  const result = await response.json();
  const textOutput = result.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!textOutput) {
    throw new Error('La IA no devolvió ninguna respuesta estructurada.');
  }

  try {
    const parsed = JSON.parse(textOutput);
    if (Array.isArray(parsed)) {
      return parsed;
    } else if (parsed.items && Array.isArray(parsed.items)) {
      return parsed.items;
    }
    return [];
  } catch (err) {
    console.error('Error parseando JSON de Gemini:', textOutput);
    throw new Error('No se pudo interpretar el resultado de la imagen.');
  }
}

