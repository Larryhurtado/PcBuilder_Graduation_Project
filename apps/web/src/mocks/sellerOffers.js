// Ofertas del vendedor simuladas (GET, PATCH y DELETE /seller/offers y su visibilidad). Cada
// vendedor ve solo las suyas; editar y pausar exigen un comercio verificado (STORE_NOT_VERIFIED),
// mientras que ver y eliminar funcionan siempre, como en la API.
import { errorCodes, updateOfferBodySchema, visibilityBodySchema } from '@hw/contracts';
import { http, HttpResponse } from 'msw';
import { demoUsers } from './auth.js';
import { offers as dataOffers, stores as dataStores } from './data.js';

const api = (path) => `*/api/v1${path}`;

const error = (status, code, message) =>
  HttpResponse.json({ code, message, details: null, requestId: 'mock-request' }, { status });

const [, demoSeller] = demoUsers;

/** Las ofertas de TecnoPasarela Cali: la cuarta está pausada y el resto activas. */
function seed() {
  const [tecnoPasarela] = dataStores;
  return dataOffers
    .filter((offer) => offer.store.id === tecnoPasarela.id)
    .map((offer, index) => ({
      ownerId: demoSeller.id,
      offerId: offer.offerId,
      status: index === 3 ? 'paused' : 'active',
      priceCop: offer.priceCop,
      condition: offer.condition,
      warrantyMonths: offer.warrantyMonths,
      description: null,
      publishedAt: offer.publishedAt,
      updatedAt: offer.publishedAt,
      component: {
        id: offer.component.id,
        category: offer.component.category,
        brand: offer.component.brand,
        model: offer.component.model,
        displayName: offer.component.displayName,
      },
      images: [],
    }));
}

let offers = seed();

/** Vuelve a las ofertas de ejemplo (para pruebas). */
export function resetMockSellerOffers() {
  offers = seed();
}

/** Cantidad de ofertas activas y pausadas de un vendedor (para el resumen del dashboard). */
export function countOffers(userId) {
  const own = offers.filter((offer) => offer.ownerId === userId);
  return {
    activeOffers: own.filter((offer) => offer.status === 'active').length,
    pausedOffers: own.filter((offer) => offer.status === 'paused').length,
  };
}

const publicOffer = ({ ownerId: _owner, ...offer }) => offer;

/**
 * @param {(request: Request) => { response?: Response, user?: any, store?: any }} guard exige sesión de
 *   vendedor y devuelve su comercio (lo aporta seller.js)
 */
export function createSellerOffersHandlers(guard) {
  /** Busca una oferta del vendedor o responde 404 (también cuando es de otro comercio). */
  const ownOffer = (user, id) =>
    offers.find((offer) => offer.offerId === id && offer.ownerId === user.id);
  const notFound = () => error(404, 'NOT_FOUND', 'No se encontró lo que buscas.');
  const notVerified = () => error(403, 'STORE_NOT_VERIFIED', errorCodes.STORE_NOT_VERIFIED.message);

  const replace = (offer, patch) => {
    const next = { ...offer, ...patch, updatedAt: new Date().toISOString() };
    offers = offers.map((item) => (item === offer ? next : item));
    return next;
  };

  return [
    http.get(api('/seller/offers'), ({ request }) => {
      const ctx = guard(request);
      if (ctx.response) return ctx.response;
      const items = offers
        .filter((offer) => offer.ownerId === ctx.user.id)
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
        .map(publicOffer);
      return HttpResponse.json({ items });
    }),

    http.patch(api('/seller/offers/:id/visibility'), async ({ params, request }) => {
      const ctx = guard(request);
      if (ctx.response) return ctx.response;
      if (!ctx.store.isVerified) return notVerified();
      const offer = ownOffer(ctx.user, params.id);
      if (!offer) return notFound();
      const parsed = visibilityBodySchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return error(422, 'VALIDATION_ERROR', 'Hay datos que no son válidos.');
      return HttpResponse.json({
        offer: publicOffer(replace(offer, { status: parsed.data.status })),
      });
    }),

    http.patch(api('/seller/offers/:id'), async ({ params, request }) => {
      const ctx = guard(request);
      if (ctx.response) return ctx.response;
      if (!ctx.store.isVerified) return notVerified();
      const offer = ownOffer(ctx.user, params.id);
      if (!offer) return notFound();
      const parsed = updateOfferBodySchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return error(422, 'VALIDATION_ERROR', 'Hay datos que no son válidos.');
      const { imageKeys: _keys, ...fields } = parsed.data;
      return HttpResponse.json({ offer: publicOffer(replace(offer, fields)) });
    }),

    http.delete(api('/seller/offers/:id'), ({ params, request }) => {
      const ctx = guard(request);
      if (ctx.response) return ctx.response;
      const offer = ownOffer(ctx.user, params.id);
      if (!offer) return notFound();
      offers = offers.filter((item) => item !== offer);
      return new HttpResponse(null, { status: 204 });
    }),
  ];
}
