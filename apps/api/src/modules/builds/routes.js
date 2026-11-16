import {
  buildIdParamsSchema,
  saveBuildBodySchema,
  shareCodeParamsSchema,
  wishlistParamsSchema,
} from '@hw/contracts';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { validate } from '../../http/validate.js';
import { AppError } from '../../kernel/errors.js';

/**
 * Rutas de armados guardados y favoritos (cuelgan de /api/v1).
 * @param {{ service: ReturnType<import('./service.js').createBuildsService>,
 *   auth: { requireAuth: Function, optionalAuth: Function },
 *   rateLimitOptions?: { windowMs?: number, limit?: number } }} deps
 */
export function createBuildsRouter({ service, auth, rateLimitOptions = {} }) {
  const router = Router();
  const { requireAuth, optionalAuth } = auth;

  // Guardar sin cuenta crea armados anónimos: se limita por IP
  const saveLimiter = rateLimit({
    windowMs: 60 * 60_000,
    limit: 30,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new AppError('RATE_LIMITED')),
    ...rateLimitOptions,
  });

  // Guardar: con sesión queda en la cuenta; sin sesión queda anónimo y se abre con su enlace
  router.post(
    '/builds',
    saveLimiter,
    optionalAuth,
    validate({ body: saveBuildBodySchema }),
    async (req, res) => {
      res.status(201).json(await service.save(req.user?.userId ?? null, req.valid.body));
    },
  );

  // Enlace compartible: público; con sesión además dice si el armado es del lector
  router.get(
    '/builds/:shareCode',
    optionalAuth,
    validate({ params: shareCodeParamsSchema }),
    async (req, res) => {
      res.json(await service.getByShareCode(req.valid.params.shareCode, req.user?.userId));
    },
  );

  router.post(
    '/builds/:shareCode/clone',
    requireAuth,
    validate({ params: shareCodeParamsSchema }),
    async (req, res) => {
      res.status(201).json(await service.clone(req.user.userId, req.valid.params.shareCode));
    },
  );

  router.get('/me/builds', requireAuth, async (req, res) => {
    res.json({ items: await service.list(req.user.userId) });
  });

  router.put(
    '/me/builds/:id',
    requireAuth,
    validate({ params: buildIdParamsSchema, body: saveBuildBodySchema }),
    async (req, res) => {
      res.json(await service.update(req.user.userId, req.valid.params.id, req.valid.body));
    },
  );

  router.delete(
    '/me/builds/:id',
    requireAuth,
    validate({ params: buildIdParamsSchema }),
    async (req, res) => {
      await service.remove(req.user.userId, req.valid.params.id);
      res.status(204).end();
    },
  );

  router.get('/me/wishlist', requireAuth, async (req, res) => {
    res.json({ items: await service.listWishlist(req.user.userId) });
  });

  router.put(
    '/me/wishlist/:componentId',
    requireAuth,
    validate({ params: wishlistParamsSchema }),
    async (req, res) => {
      await service.addToWishlist(req.user.userId, req.valid.params.componentId);
      res.status(204).end();
    },
  );

  router.delete(
    '/me/wishlist/:componentId',
    requireAuth,
    validate({ params: wishlistParamsSchema }),
    async (req, res) => {
      await service.removeFromWishlist(req.user.userId, req.valid.params.componentId);
      res.status(204).end();
    },
  );

  return router;
}
