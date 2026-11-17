/**
 * Copia un texto al portapapeles. Devuelve false si el navegador no lo permite (por ejemplo sin
 * HTTPS o con el permiso denegado), para que la interfaz ofrezca otra salida.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
