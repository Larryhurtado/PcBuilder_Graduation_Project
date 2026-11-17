/** Enlace público de un armado guardado, el que abre la pantalla "Armado compartido". */
export function buildShareUrl(shareCode) {
  return `${window.location.origin}/armado/${shareCode}`;
}
