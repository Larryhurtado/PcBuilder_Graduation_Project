import {
  MAX_IMAGE_BYTES,
  createOfferBodySchema,
  imageMimeTypes,
  offerIdParamsSchema,
  presignBodySchema,
  updateOfferBodySchema,
  visibilityBodySchema,
} from '@hw/contracts';
import express, { Router } from 'express';
import { validate } from '../../http/validate.js';
import { AppError } from '../../kernel/errors.js';

/** Convierte los errores del lector de cuerpo (archivo demasiado grande) en FILE_REJECTED. */
function rejectBadUpload(error, _req, _res, next) {
  if (error?.type === 'entity.too.large') return next(new AppError('FILE_REJECTED'));
  next(error);
}

/**
 * Rutas del vendedor sobre sus ofertas (cuelgan de /api/v1/seller/offers).
 * @param {{ service: ReturnType<import('./seller-service.js').createSellerOffersService>,
 *   auth: { requireAuth: Function, requireRole: Function } }} deps
 */
export function createSellerOffersRouter({ service, auth }) {
  const router = Router();
  const seller = [auth.requireAuth, auth.requireRole('seller')];
  const idParams = validate({ params: offerIdParamsSchema });

  // Subida de fotos en dos pasos (mismo flujo que tendrá producción con almacenamiento de objetos)
  router.post(
    '/seller/offers/images/presign',
    ...seller,
    validate({ body: presignBodySchema }),
    async (req, res) => {
      res.json(await service.presignImage(req.user.userId, req.valid.body));
    },
  );

  router.put(
    '/seller/offers/images/:name',
    ...seller,
    express.raw({ type: imageMimeTypes, limit: MAX_IMAGE_BYTES }),
    rejectBadUpload,
    async (req, res) => {
      await service.storeImage(req.user.userId, {
        name: req.params.name,
        mimeType: req.get('content-type')?.split(';')[0].trim(),
        bytes: req.body,
      });
      res.status(204).end();
    },
  );

  router.post(
    '/seller/offers',
    ...seller,
    validate({ body: createOfferBodySchema }),
    async (req, res) => {
      res.status(201).json({ offer: await service.create(req.user.userId, req.valid.body) });
    },
  );

  router.get('/seller/offers', ...seller, async (req, res) => {
    res.json({ items: await service.list(req.user.userId) });
  });

  router.patch(
    '/seller/offers/:id/visibility',
    ...seller,
    validate({ params: offerIdParamsSchema, body: visibilityBodySchema }),
    async (req, res) => {
      const offer = await service.setVisibility(
        req.user.userId,
        req.valid.params.id,
        req.valid.body.status,
      );
      res.json({ offer });
    },
  );

  router.patch(
    '/seller/offers/:id',
    ...seller,
    validate({ params: offerIdParamsSchema, body: updateOfferBodySchema }),
    async (req, res) => {
      res.json({
        offer: await service.update(req.user.userId, req.valid.params.id, req.valid.body),
      });
    },
  );

  router.delete('/seller/offers/:id', ...seller, idParams, async (req, res) => {
    await service.remove(req.user.userId, req.valid.params.id);
    res.status(204).end();
  });

  return router;
}
