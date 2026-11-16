/**
 * Ruta interna segura a la que volver tras ingresar (`?next=`). Solo se aceptan rutas del propio
 * sitio: nada de otros dominios (`//otro.com`, `https://…`) ni de la propia pantalla de ingreso.
 * @param {string | null | undefined} next
 * @returns {string | null}
 */
export function safeNext(next) {
  if (typeof next !== 'string' || !next.startsWith('/') || next.startsWith('//')) return null;
  if (next.includes('\\') || [...next].some((char) => char.charCodeAt(0) < 32)) return null;
  if (next === '/ingresar' || next.startsWith('/ingresar?') || next.startsWith('/ingresar/')) {
    return null;
  }
  return next;
}

/** Adónde va cada rol al ingresar si no venía de una página concreta. */
export function homeForRole(role) {
  return role === 'seller' ? '/vendedor' : '/';
}
