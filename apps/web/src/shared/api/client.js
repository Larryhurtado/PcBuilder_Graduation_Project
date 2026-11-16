import { errorCodes, errorResponseSchema, isErrorCode } from '@hw/contracts';
import { API_BASE } from '../config.js';

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
 * Lanza ApiError ante cualquier fallo, incluidos los de red.
 * @param {string} path
 * @param {{ method?: string, query?: Record<string, unknown>, body?: unknown, signal?: AbortSignal }} [options]
 */
export async function apiFetch(path, { method = 'GET', query, body, signal } = {}) {
  let response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      signal,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
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
