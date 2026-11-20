import { offersQuerySchema } from '@hw/contracts';
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../http/validate.js';

const idParams = z.object({ id: z.guid() });
const featuredQuery = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(8),
  /** Igual que en GET /offers: `true` agrega `component.specs` a cada oferta. */
  includeSpecs: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .default(false),
});

/** Rutas públicas de ofertas (cuelgan de /api/v1). */
export function createOffersRouter({ service }) {
  const router = Router();

  router.get('/offers', validate({ query: offersQuerySchema }), async (req, res) => {
    res.json(await service.search(req.valid.query));
  });

  // Va antes de /offers/:id para que "featured" no se interprete como un id
  router.get('/offers/featured', validate({ query: featuredQuery }), async (req, res) => {
    const { limit, includeSpecs } = req.valid.query;
    res.json(await service.featured(limit, { includeSpecs }));
  });

  router.get('/offers/:id', validate({ params: idParams }), async (req, res) => {
    res.json(await service.getOffer(req.valid.params.id));
  });

  return router;
}
