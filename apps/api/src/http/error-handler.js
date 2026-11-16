import { ZodError } from 'zod';
import { AppError } from '../kernel/errors.js';

export function notFoundHandler(req, _res, next) {
  next(new AppError('NOT_FOUND', { details: { method: req.method, path: req.originalUrl } }));
}

/** Convierte errores conocidos en AppError. Devuelve null si el error no se reconoce. */
function normalize(error) {
  if (error instanceof AppError) return error;
  if (error instanceof ZodError) {
    return new AppError('VALIDATION_ERROR', {
      details: {
        issues: error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      },
    });
  }
  if (error?.type === 'entity.parse.failed') {
    return new AppError('VALIDATION_ERROR', {
      status: 400,
      message: 'El cuerpo de la petición no es un JSON válido.',
    });
  }
  if (error?.type === 'entity.too.large') {
    return new AppError('VALIDATION_ERROR', {
      status: 413,
      message: 'El cuerpo de la petición es demasiado grande.',
    });
  }
  return null;
}

/** Manejador final: toda respuesta de error sale como { code, message, details, requestId }. */
export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);

  const known = normalize(error);
  const appError = known ?? new AppError('INTERNAL_ERROR');
  if (!known) req.log?.error({ err: error }, 'Error no controlado');

  res.status(appError.status).json({
    code: appError.code,
    message: appError.message,
    details: appError.details,
    requestId: req.id,
  });
}
