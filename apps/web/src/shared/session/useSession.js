import { useSessionStore } from './store.js';

/**
 * Sesión del usuario actual:
 *   { user: null | { id, email, fullName, role: 'buyer' | 'seller' | 'admin' }, status, isLoading }
 * `isLoading` es verdadero hasta saber si hay una sesión que restaurar (refresco al cargar).
 */
export function useSession() {
  const user = useSessionStore((state) => state.user);
  const status = useSessionStore((state) => state.status);
  return { user, status, isLoading: status === 'loading' };
}
