# 📦 Herramienta Móvil de Inventario para Bodega de Juguetes & Funkos

Aplicación web móvil (PWA) diseñada para realizar conteos rápidos de inventario físico en bodega, utilizando **Visión con IA (Gemini)** para fotos múltiples de repisas, **Reconocimiento y Síntesis de Voz Manos Libres**, **Modo Acumulativo**, **Historial con Deshacer**, y **Sincronización en Tiempo Real con Google Sheets** para múltiples operarios simultáneos.

---

## 🚀 1. Cómo probarla de inmediato en tu celular

La aplicación ya está configurada con `host: true` para que puedas abrirla en el navegador de cualquier teléfono conectado a tu misma red Wi-Fi.

1. En tu computadora, dentro de la carpeta `app`, ejecuta:
   ```bash
   npm run dev
   ```
2. Verás en la terminal dos direcciones:
   * **Local:** `http://localhost:5173/`
   * **Network:** `http://192.168.X.X:5173/` *(esta es la que usas en el celular)*
3. Abre esa dirección **Network** en Safari (iPhone) o Google Chrome (Android).
4. **Instalar en el celular:**
   * **iPhone:** Toca el botón *"Compartir"* (icono de cuadrado con flecha hacia arriba) > *"Agregar a pantalla de inicio"*.
   * **Android:** Toca los 3 puntos superiores > *"Instalar aplicación"* o *"Agregar a pantalla principal"*.

---

## 🌐 2. Cómo compartirla con tus ayudantes en cualquier lugar (Despliegue Gratis)

Si quieres que tus ayudantes la usen desde cualquier sitio sin depender del Wi-Fi de tu computadora, puedes subirla en 1 minuto a **Vercel** o **Netlify**:

* **Opción Vercel (Recomendada):**
  1. Entra a [vercel.com](https://vercel.com).
  2. Arrastra la carpeta `app` o sube el repositorio.
  3. Te generará un enlace como `https://tu-inventario-bodega.vercel.app`.
  4. Les pasas ese enlace por WhatsApp a tus ayudantes.

---

## 📊 3. Sincronización en Tiempo Real con Google Sheets (Paso a Paso)

Para que todos los teléfonos sincronicen en la misma hoja de cálculo central y veas los cambios en vivo en tu computadora:

1. **Abre tu Google Sheet** con la lista del inventario.
2. Ve al menú superior: **Extensiones > Apps Script**.
3. Borra el código existente y pega el contenido del archivo [`google_apps_script.js`](./google_apps_script.js) que te dejamos preparado.
4. Arriba a la derecha, haz clic en **Implementar > Nueva implementación**.
   * **Tipo:** Aplicación web.
   * **Descripción:** `Inventario Bodega Móvil`.
   * **Ejecutar como:** `Yo (tu correo)`.
   * **Quién tiene acceso:** `Cualquier persona` (permite que tus operarios sincronicen sin pedirles cuentas de Google).
5. Haz clic en **Implementar**, autoriza los permisos y **copia la URL generada** (termina en `/exec`).
6. En la aplicación del celular:
   * Toca el icono de **Configuración** ⚙️ (arriba a la derecha).
   * Pega la URL en **URL de Web App de Google Sheets**.
   * Presiona **"Probar Conexión"** y luego **"Guardar Ajustes"**.
   * *¡Listo! A partir de ese momento, cada conteo confirmado se actualizará al segundo en el Google Sheet.*

---

## 📸 4. Conteo por Foto Múltiple (IA Gemini)

1. Toca el botón azul **"Foto Múltiple"** en la parte inferior.
2. Apunta la cámara a una repisa con varios Funkos (5 a 15 cajas juntas) y toma la foto.
3. La IA identificará automáticamente:
   * El nombre del personaje.
   * El número de caja `#` (esquina superior derecha).
   * Ediciones especiales (*Flocked*, *Deluxe*, *Exclusive*, etc.).
   * Cantidad detectada de cada uno.
4. **Borrador de Revisión Editable:**
   * La app te muestra la lista de todo lo detectado.
   * Si en la foto había 4 figuras de Spider-Man pero la IA detectó 3, tocas el botón `[+]` para corregirlo a 4.
   * Si una figura fue emparejada incorrectamente, puedes buscar y reasignar el producto con un toque.
5. Presionas **"Confirmar y Sumar (+Total)"** para aplicar el cambio.
6. *(La fotografía se procesa en memoria y se desecha inmediatamente; no gasta espacio de almacenamiento).*

---

## 🎙️ 5. Conteo Manos Libres por Voz

1. Toca el botón rojo **"Contar por Voz"**.
2. Di con naturalidad lo que tienes enfrente, por ejemplo:
   * *"Funko Michael Jordan 209 son cuatro"*
   * *"Luffy 1771 anota 2"*
   * *"Harry Potter 14 hay 1"*
   * *"Cell 2222 suma 3"*
3. La app busca al instante el producto en la lista y te muestra la tarjeta de confirmación:
   * Te dice el stock actual y el nuevo total con la suma acumulativa.
   * El teléfono te habla por audio: *"¿Confirmas sumar 2 a Luffy 1771?"*.
4. Si coincide, tocas **"Confirmar y Sumar"** (o corriges la cantidad con `[+]` y `[-]`).

---

## ↩️ 6. Corrección de Errores y Deshacer (Undo)

* **Si te equivocaste en un conteo:**
  * Toca el icono de **Historial** (reloj) en la cabecera.
  * Verás la lista cronológica de conteos (ej. *"Hace 2 min: Yankarlo sumó +3 a Spider-Man #1586"*).
  * Toca el botón **Deshacer**, confirma la advertencia y las unidades se restarán automáticamente en el teléfono y en Google Sheets.
* **Si el Excel tenía un error en el número de Funko o el nombre:**
  * En la tarjeta del producto, toca el icono de **Lápiz** (Editar).
  * Corrige el número `#` o la descripción y guarda.
* **Si encuentras un Funko que NO estaba en el Excel:**
  * Toca el botón **`+`** (morado) en la cabecera.
  * Escribe el nombre, número de caja y cantidad física.
  * Se creará como **Nuevo Físico** con un nuevo número correlativo (ej. `#1032`) y se añadirá al Google Sheet.

---

## 💾 7. Descarga y Respaldo Offline

* La app funciona **completamente offline** si no hay señal en un rincón de la bodega. Los datos se guardan en el teléfono y se sincronizan al recuperar conexión.
* En el menú de **Configuración** ⚙️ tienes el botón **"Descargar Inventario Actualizado (.CSV)"** para bajar en cualquier momento el archivo con las cantidades contadas y diferencias.

