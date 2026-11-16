import { constraintsBodySchema, validateBodySchema } from '@hw/contracts';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { validate } from '../../http/validate.js';
import { AppError } from '../../kernel/errors.js';

/**
 * Rutas públicas de compatibilidad (cuelgan de /api/v1). Limitadas por IP porque cada llamada
 * consulta el catálogo.
 * @param {{ service: ReturnType<import('./service.js').createCompatService>,
 *   rateLimitOptions?: { windowMs?: number, limit?: number } }} deps
 */
export function createCompatRouter({ service, rateLimitOptions = {} }) {
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
    '/compat/validate',
    limiter,
    validate({ body: validateBodySchema }),
    async (req, res) => {
      res.json(await service.validate(req.valid.body.items));
    },
  );

  router.post(
    '/compat/constraints',
    limiter,
    validate({ body: constraintsBodySchema }),
    async (req, res) => {
      const { category, items } = req.valid.body;
      res.json(await service.constraints(category, items));
    },
  );

  return router;
}
