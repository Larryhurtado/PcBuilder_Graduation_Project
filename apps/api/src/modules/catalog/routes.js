import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../http/validate.js';

const idParams = z.object({ id: z.guid() });
const searchQuery = z.object({
  q: z.string().trim().min(2).max(80),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

/** Rutas públicas del catálogo (cuelgan de /api/v1). */
export function createCatalogRouter({ service }) {
  const router = Router();

  router.get('/components/:id', validate({ params: idParams }), async (req, res) => {
    res.json(await service.getComponent(req.valid.params.id));
  });

  router.get('/catalog/search', validate({ query: searchQuery }), async (req, res) => {
    const { q, limit } = req.valid.query;
    res.json({ items: await service.search(q, limit) });
  });

  return router;
}
