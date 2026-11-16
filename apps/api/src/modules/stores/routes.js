import {
  convertBodySchema,
  publicStoreParamsSchema,
  publicStoresQuerySchema,
  updateStoreBodySchema,
} from '@hw/contracts';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { validate } from '../../http/validate.js';
import { AppError } from '../../kernel/errors.js';

/**
 * Rutas del vendedor sobre su negocio (cuelgan de /api/v1/seller).
 * @param {{ service: ReturnType<import('./service.js').createStoresService>,
 *   auth: { requireAuth: Function, requireRole: Function } }} deps
 */
export function createStoresRouter({ service, auth, rateLimitOptions = {} }) {
  const router = Router();
  const { requireAuth, requireRole } = auth;

  // El directorio es público: se limita por IP (un solo contador para el listado y el detalle)
  const publicLimiter = rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new AppError('RATE_LIMITED')),
    ...rateLimitOptions,
  });

  // Directorio público de comercios verificados ("Comercios verificados" del inicio)
  router.get(
    '/stores',
    publicLimiter,
    validate({ query: publicStoresQuerySchema }),
    async (req, res) => {
      res.json({ items: await service.listPublic(req.valid.query) });
    },
  );

  router.get(
    '/stores/:id',
    publicLimiter,
    validate({ params: publicStoreParamsSchema }),
    async (req, res) => {
      res.json(await service.getPublic(req.valid.params.id));
    },
  );

  router.post(
    '/seller/convert',
    requireAuth,
    requireRole('buyer'),
    validate({ body: convertBodySchema }),
    async (req, res) => {
      res.status(201).json(await service.convert(req.user.userId, req.valid.body));
    },
  );

  router.get('/seller/store', requireAuth, requireRole('seller'), async (req, res) => {
    res.json({ store: await service.getStore(req.user.userId) });
  });

  router.patch(
    '/seller/store',
    requireAuth,
    requireRole('seller'),
    validate({ body: updateStoreBodySchema }),
    async (req, res) => {
      res.json({ store: await service.updateStore(req.user.userId, req.valid.body) });
    },
  );

  router.get(
    '/seller/verification/status',
    requireAuth,
    requireRole('seller'),
    async (req, res) => {
      res.json(await service.getVerificationStatus(req.user.userId));
    },
  );

  return router;
}
