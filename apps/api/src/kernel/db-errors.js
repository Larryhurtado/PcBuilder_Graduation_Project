import { AppError } from './errors.js';

/**
 * Traduce un error de PostgreSQL a un AppError de negocio (códigos SQLSTATE).
 * Los errores que no se reconocen (por ejemplo, conexión rechazada) se devuelven sin cambios.
 * @param {any} error
 */
export function translateDbError(error) {
  if (error instanceof AppError || !error?.code) return error;
  const { code, constraint, message } = error;

  // Disparador offers.fn_require_verified_store (defensa en profundidad de HU-27)
  if (code === '23514' && message?.includes('STORE_NOT_VERIFIED')) {
    return new AppError('STORE_NOT_VERIFIED');
  }
  if (code === '23505' && constraint === 'uq_offer_live') {
    return new AppError('OFFER_DUPLICATE');
  }
  if (code === '23505') {
    return new AppError('VALIDATION_ERROR', {
      status: 409,
      message: 'Ya existe un registro con esos datos.',
      details: { constraint: constraint ?? null },
    });
  }
  if (code === '23503' && constraint?.includes('component')) {
    return new AppError('COMPONENT_NOT_FOUND');
  }
  // 23503 clave foránea, 23502 NOT NULL, 23514 CHECK, 22P02 formato inválido,
  // 22003 número fuera de rango, 22001 texto demasiado largo
  if (['23503', '23502', '23514', '22P02', '22003', '22001'].includes(code)) {
    return new AppError('VALIDATION_ERROR', { details: { constraint: constraint ?? null } });
  }
  return error;
}
