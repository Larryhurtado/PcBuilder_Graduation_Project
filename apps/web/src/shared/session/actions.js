import { authResponseSchema } from '@hw/contracts';
import { apiFetch } from '../api/client.js';
import { refreshSession } from './refresh.js';
import { resetSessionStore, setAuthenticated, setGuest } from './store.js';

let bootstrapPromise = null;

/** Al cargar la app: intenta restaurar la sesión con la cookie de refresco (una sola vez). */
export function bootstrapSession() {
  bootstrapPromise ??= refreshSession();
  return bootstrapPromise;
}

/**
 * Inicia sesión (POST /auth/login) y guarda el token en memoria. Lanza ApiError si falla
 * (INVALID_CREDENTIALS, ROLE_FORBIDDEN, RATE_LIMITED o NETWORK_ERROR).
 * @param {{ email: string, password: string }} credentials
 */
export async function login(credentials) {
  const data = authResponseSchema.parse(
    await apiFetch('/auth/login', { method: 'POST', body: credentials }),
  );
  bootstrapPromise = Promise.resolve(true);
  setAuthenticated(data);
  return data.user;
}

/** Cierra la sesión: pide al servidor borrar la cookie y olvida el token. Nunca falla hacia afuera. */
export async function logout() {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch {
    // Aunque el servidor no responda, la sesión local se cierra
  } finally {
    bootstrapPromise = Promise.resolve(false);
    setGuest();
  }
}

/** Vuelve al estado inicial (solo para pruebas). */
export function resetSession() {
  bootstrapPromise = null;
  resetSessionStore();
}
