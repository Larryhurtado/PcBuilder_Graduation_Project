import { convertBodySchema, updateStoreBodySchema } from '@hw/contracts';
import { Router } from 'express';
import { validate } from '../../http/validate.js';

/**
 * Rutas del vendedor sobre su negocio (cuelgan de /api/v1/seller).
 * @param {{ service: ReturnType<import('./service.js').createStoresService>,
 *   auth: { requireAuth: Function, requireRole: Function } }} deps
 */
export function createStoresRouter({ service, auth }) {
  const router = Router();
  const { requireAuth, requireRole } = auth;

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
