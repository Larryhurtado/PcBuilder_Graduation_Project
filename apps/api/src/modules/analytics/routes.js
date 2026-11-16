import { eventBodySchema } from '@hw/contracts';
import express, { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { validate } from '../../http/validate.js';
import { AppError } from '../../kernel/errors.js';

/**
 * `navigator.sendBeacon(url, JSON.stringify(x))` envía el cuerpo como text/plain. Se acepta y se
 * interpreta como JSON; con un Blob `application/json` ya lo procesa express.json.
 */
function parseTextBody(req, _res, next) {
  if (typeof req.body === 'string') {
    try {
      req.body = JSON.parse(req.body);
    } catch {
      return next(
        new AppError('VALIDATION_ERROR', {
          status: 400,
          message: 'El cuerpo de la petición no es un JSON válido.',
        }),
      );
    }
  }
  next();
}

/**
 * Ruta pública de registro de eventos (cuelga de /api/v1). Límite de tasa moderado por IP.
 * @param {{ service: { record: Function }, rateLimitOptions?: { windowMs?: number, limit?: number } }} deps
 */
export function createAnalyticsRouter({ service, rateLimitOptions = {} }) {
  const router = Router();

  const limiter = rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new AppError('RATE_LIMITED')),
    ...rateLimitOptions,
  });

  router.post(
    '/events',
    limiter,
    express.text({ type: 'text/plain', limit: '2kb' }),
    parseTextBody,
    validate({ body: eventBodySchema }),
    async (req, res) => {
      await service.record(req.valid.body, { ip: req.ip, userAgent: req.get('user-agent') });
      // Siempre 204: no se revela si el evento se descartó por repetido
      res.status(204).end();
    },
  );

  return router;
}
