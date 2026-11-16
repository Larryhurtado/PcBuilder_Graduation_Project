import { componentCategorySchema } from '@hw/contracts';
import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../../http/validate.js';

const idParams = z.object({ id: z.guid() });
const searchQuery = z.object({
  q: z.string().trim().min(2).max(80),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});

const brandsQuery = z.object({ category: componentCategorySchema });
const modelsQuery = z.object({
  category: componentCategorySchema,
  brandId: z.coerce.number().int().positive(),
});

/**
 * Rutas del catálogo (cuelgan de /api/v1). La ficha y el buscador son públicos; la cascada de
 * marcas y modelos es del vendedor (HU-20).
 * @param {{ service: object, auth?: { requireAuth: Function, requireRole: Function } }} deps
 *   sin `auth` solo se montan las rutas públicas
 */
export function createCatalogRouter({ service, auth }) {
  const router = Router();

  if (auth) {
    const sellerOnly = [auth.requireAuth, auth.requireRole('seller', 'admin')];

    router.get(
      '/catalog/brands',
      ...sellerOnly,
      validate({ query: brandsQuery }),
      async (req, res) => {
        res.json({ items: await service.listBrands(req.valid.query.category) });
      },
    );

    router.get(
      '/catalog/models',
      ...sellerOnly,
      validate({ query: modelsQuery }),
      async (req, res) => {
        const { category, brandId } = req.valid.query;
        res.json({ items: await service.listModels(category, brandId) });
      },
    );
  }

  router.get('/components/:id', validate({ params: idParams }), async (req, res) => {
    res.json(await service.getComponent(req.valid.params.id));
  });

  router.get('/catalog/search', validate({ query: searchQuery }), async (req, res) => {
    const { q, limit } = req.valid.query;
    res.json({ items: await service.search(q, limit) });
  });

  return router;
}
