import { errorCodes } from '@hw/contracts';

/**
 * Error de negocio. El manejador HTTP lo convierte en { code, message, details, requestId }.
 */
export class AppError extends Error {
  /**
   * @param {keyof typeof errorCodes} code
   * @param {{ message?: string, details?: unknown, status?: number }} [options]
   */
  constructor(code, { message, details, status } = {}) {
    const definition = errorCodes[code];
    super(message ?? definition?.message ?? code);
    this.name = 'AppError';
    this.code = code;
    this.status = status ?? definition?.status ?? 500;
    this.details = details ?? null;
  }
}
