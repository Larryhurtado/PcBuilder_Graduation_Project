import { authResponseSchema } from '@hw/contracts';
import { API_BASE } from '../config.js';
import { setAuthenticated, setGuest } from './store.js';

let inflight = null;

async function requestRefresh() {
  try {
    // fetch directo (no apiFetch): el refresco no puede depender de sí mismo
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) {
      setGuest();
      return false;
    }
    const parsed = authResponseSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) {
      setGuest();
      return false;
    }
    setAuthenticated(parsed.data);
    return true;
  } catch {
    // Sin conexión no sabemos si hay sesión: se trata como visitante
    setGuest();
    return false;
  }
}

/**
 * Pide un token nuevo con la cookie de refresco. Si varias peticiones lo piden a la vez, comparten
 * una sola llamada (el refresco rota la cookie: dos llamadas simultáneas cerrarían la sesión).
 * @returns {Promise<boolean>} true si hay sesión renovada
 */
export function refreshSession() {
  inflight ??= requestRefresh().finally(() => {
    inflight = null;
  });
  return inflight;
}
