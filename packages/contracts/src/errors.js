import { z } from 'zod';

/**
 * Códigos de error de negocio compartidos entre la API y el frontend.
 * Los diez primeros salen de la tabla 27 del Diseño Integral; los cuatro últimos son propuestos
 * (errores genéricos) y los fija Erick junto con Larry.
 */
export const errorCodes = {
  STORE_NOT_VERIFIED: {
    status: 403,
    message: 'Aún no puedes publicar productos hasta que tu negocio sea verificado.',
  },
  VERIFICATION_DOCS_INCOMPLETE: {
    status: 422,
    message: 'Faltan documentos o datos del negocio para enviar la solicitud.',
  },
  VERIFICATION_WINDOW_EXPIRED: { status: 409, message: 'El plazo venció.' },
  OFFER_DUPLICATE: { status: 409, message: 'Ya tienes publicado este producto en ese estado.' },
  COMPONENT_NOT_FOUND: { status: 404, message: 'El producto no está disponible en el catálogo.' },
  BUILD_INCOMPATIBLE: { status: 422, message: 'Tu configuración tiene incompatibilidades.' },
  FILE_REJECTED: { status: 422, message: 'El archivo debe ser PDF, JPG o PNG de hasta 5 MB.' },
  ROLE_FORBIDDEN: { status: 403, message: 'No tienes permiso para esta acción.' },
  TOKEN_EXPIRED: { status: 401, message: 'La sesión expiró; se renueva con el refresco.' },
  RATE_LIMITED: {
    status: 429,
    message: 'Demasiados intentos. Intenta de nuevo en unos minutos.',
  },
  // Propuestos
  VALIDATION_ERROR: { status: 422, message: 'Hay datos que no son válidos.' },
  UNAUTHENTICATED: { status: 401, message: 'Debes iniciar sesión para continuar.' },
  NOT_FOUND: { status: 404, message: 'No se encontró lo que buscas.' },
  INTERNAL_ERROR: { status: 500, message: 'Ocurrió un error inesperado. Intenta de nuevo.' },
};

export const errorCodeNames = Object.keys(errorCodes);

/** @param {unknown} value */
export function isErrorCode(value) {
  return typeof value === 'string' && Object.hasOwn(errorCodes, value);
}

/** Forma de toda respuesta de error de la API. */
export const errorResponseSchema = z.object({
  code: z.string(),
  message: z.string(),
  details: z.unknown().nullable(),
  requestId: z.string(),
});
