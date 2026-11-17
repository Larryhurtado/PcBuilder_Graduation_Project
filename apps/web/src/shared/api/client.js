import { errorCodes, errorResponseSchema, isErrorCode } from '@hw/contracts';
import { API_BASE } from '../config.js';
import { refreshSession } from '../session/refresh.js';
import { getAccessToken } from '../session/store.js';

/** Error de la API con la forma `{ code, message, details, requestId }` del Diseño Integral. */
export class ApiError extends Error {
  /**
   * @param {{ status: number, code: string, message?: string, details?: unknown, requestId?: string | null }} data
   */
  constructor({ status, code, message, details = null, requestId = null }) {
    super(message ?? code);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }

  /** Mensaje para el usuario: se decide por `code`, nunca por el texto que envíe el servidor. */
  get userMessage() {
    if (isErrorCode(this.code)) return errorCodes[this.code].message;
    return this.code === 'NETWORK_ERROR'
      ? 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.'
      : errorCodes.INTERNAL_ERROR.message;
  }
}

/** Mensaje seguro para mostrar cualquier error al usuario. */
export function getErrorMessage(error) {
  return error instanceof ApiError ? error.userMessage : errorCodes.INTERNAL_ERROR.message;
}

function buildUrl(path, query) {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === '') continue;
    for (const item of Array.isArray(value) ? value : [value])
      url.searchParams.append(key, String(item));
  }
  return url;
}

/**
 * Llamada a la API (rutas relativas a /api/v1). Devuelve el JSON de la respuesta, o null si es 204.
 * Lanza ApiError ante cualquier fallo, incluidos los de red. Si hay sesión envía el token de
 * acceso; ante `401 TOKEN_EXPIRED` renueva la sesión UNA vez y repite la petición.
 * @param {string} path
 * @param {{ method?: string, query?: Record<string, unknown>, body?: unknown, rawBody?: Blob, signal?: AbortSignal }} [options]
 * `rawBody` envía el archivo tal cual (con su propio Content-Type) en lugar de JSON.
 */
export async function apiFetch(path, options = {}) {
  try {
    return await send(path, options);
  } catch (error) {
    const expired = error instanceof ApiError && error.code === 'TOKEN_EXPIRED';
    if (!expired || path.startsWith('/auth/')) throw error;
    // Si el refresco falla, la sesión queda cerrada y las guardas llevan a /ingresar
    if (!(await refreshSession())) throw error;
    return send(path, options);
  }
}

async function send(path, { method = 'GET', query, body, rawBody, signal } = {}) {
  const token = getAccessToken();
  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      signal,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(rawBody ? { 'Content-Type': rawBody.type } : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: rawBody ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch (cause) {
    if (cause?.name === 'AbortError') throw cause;
    throw new ApiError({ status: 0, code: 'NETWORK_ERROR' });
  }

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const parsed = errorResponseSchema.safeParse(payload);
    throw new ApiError(
      parsed.success
        ? { status: response.status, ...parsed.data }
        : { status: response.status, code: 'INTERNAL_ERROR' },
    );
  }
  return payload;
}
