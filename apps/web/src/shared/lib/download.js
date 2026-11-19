/**
 * Descarga un texto como archivo desde el navegador (sin pasar por el servidor). Devuelve false si
 * el navegador no puede crear el archivo.
 * @param {string} filename
 * @param {string} text
 * @param {string} [type]
 */
export function downloadTextFile(filename, text, type = 'text/csv;charset=utf-8') {
  if (typeof URL.createObjectURL !== 'function') return false;
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  return true;
}
