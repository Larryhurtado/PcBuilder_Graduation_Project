/**
 * Sesión del usuario actual. PROVISIONAL: devuelve siempre un visitante.
 * Se reemplaza con la autenticación real (token en memoria, refresco por cookie y GET /me).
 * La barra superior y las guardas por rol ya consumen esta forma:
 *   { user: null | { id, email, fullName, role: 'buyer' | 'seller' | 'admin' } }
 */
export function useSession() {
  return { user: null };
}
