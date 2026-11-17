import { authResponseSchema, convertResponseSchema } from '@hw/contracts';
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

/**
 * Crea la cuenta (POST /auth/register). El servidor abre la sesión al registrar, así que el
 * usuario queda ingresado. Lanza ApiError si falla (EMAIL_TAKEN, VALIDATION_ERROR, RATE_LIMITED o
 * NETWORK_ERROR).
 * @param {{ email: string, password: string, fullName: string, acceptTerms: true }} data
 */
export async function register(data) {
  const auth = authResponseSchema.parse(
    await apiFetch('/auth/register', { method: 'POST', body: data }),
  );
  bootstrapPromise = Promise.resolve(true);
  setAuthenticated(auth);
  return auth.user;
}

/**
 * Convierte la cuenta de comprador en vendedor (POST /seller/convert). El servidor responde con un
 * token nuevo, con rol de vendedor, que reemplaza al de memoria. Lanza ApiError si falla
 * (ROLE_FORBIDDEN si ya es vendedora, VALIDATION_ERROR, UNAUTHENTICATED…).
 * @param {{ legalName: string, tradeName: string }} data
 * @returns {Promise<{ user: object, store: object }>}
 */
export async function convertToSeller(data) {
  const { store, ...auth } = convertResponseSchema.parse(
    await apiFetch('/seller/convert', { method: 'POST', body: data }),
  );
  setAuthenticated(auth);
  return { user: auth.user, store };
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
