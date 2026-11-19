// Ofertas del vendedor simuladas (GET, PATCH y DELETE /seller/offers y su visibilidad). Cada
// vendedor ve solo las suyas; editar y pausar exigen un comercio verificado (STORE_NOT_VERIFIED),
// mientras que ver y eliminar funcionan siempre, como en la API.
import {
  createOfferBodySchema,
  errorCodes,
  imageMimeTypes,
  MAX_IMAGE_BYTES,
  presignBodySchema,
  updateOfferBodySchema,
  visibilityBodySchema,
} from '@hw/contracts';
import { http, HttpResponse } from 'msw';
import { demoUsers } from './auth.js';
import { components, offers as dataOffers, stores as dataStores } from './data.js';

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
/** Claves de las fotos que ya se subieron (paso 2 de la subida). */
let uploaded = new Set();

/** Vuelve a las ofertas de ejemplo (para pruebas). */
export function resetMockSellerOffers() {
  offers = seed();
  uploaded = new Set();
}

/** Cantidad de ofertas activas y pausadas de un vendedor (para el resumen del dashboard). */
export function countOffers(userId) {
  const own = offers.filter((offer) => offer.ownerId === userId);
  return {
    activeOffers: own.filter((offer) => offer.status === 'active').length,
    pausedOffers: own.filter((offer) => offer.status === 'paused').length,
  };
}

/** Marcas con componentes en la categoría; el id es la posición alfabética (el backend usa su id). */
const brandsOf = (category) =>
  [...new Set(components.filter((item) => item.category === category).map((item) => item.brand))]
    .sort((a, b) => a.localeCompare(b))
    .map((name, index) => ({ id: index + 1, name }));

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
    // Cascada de publicación: marcas y modelos activos del catálogo maestro
    http.get(api('/catalog/brands'), ({ request }) => {
      const ctx = guard(request);
      if (ctx.response) return ctx.response;
      const category = new URL(request.url).searchParams.get('category');
      return HttpResponse.json({ items: brandsOf(category) });
    }),

    http.get(api('/catalog/models'), ({ request }) => {
      const ctx = guard(request);
      if (ctx.response) return ctx.response;
      const params = new URL(request.url).searchParams;
      const brand = brandsOf(params.get('category')).find(
        (item) => item.id === Number(params.get('brandId')),
      );
      const items = components
        .filter((item) => item.category === params.get('category') && item.brand === brand?.name)
        .sort((a, b) => a.model.localeCompare(b.model))
        .map((item) => ({
          componentId: item.id,
          model: item.model,
          displayName: item.displayName,
        }));
      return HttpResponse.json({ items });
    }),

    // Subida de fotos: primero se pide dónde enviarlas y luego se envía el archivo crudo
    http.post(api('/seller/offers/images/presign'), async ({ request }) => {
      const ctx = guard(request);
      if (ctx.response) return ctx.response;
      if (!ctx.store.isVerified) return notVerified();
      const parsed = presignBodySchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return error(422, 'FILE_REJECTED', errorCodes.FILE_REJECTED.message);
      const name = `${crypto.randomUUID()}.${parsed.data.mimeType === 'image/png' ? 'png' : 'jpg'}`;
      return HttpResponse.json({
        uploadUrl: `/api/v1/seller/offers/images/${name}`,
        storageKey: `offers/${ctx.store.id}/${name}`,
      });
    }),

    http.put(api('/seller/offers/images/:name'), async ({ params, request }) => {
      const ctx = guard(request);
      if (ctx.response) return ctx.response;
      if (!ctx.store.isVerified) return notVerified();
      const type = request.headers.get('content-type')?.split(';')[0].trim();
      const bytes = await request.arrayBuffer();
      if (
        !imageMimeTypes.includes(type) ||
        bytes.byteLength === 0 ||
        bytes.byteLength > MAX_IMAGE_BYTES
      ) {
        return error(422, 'FILE_REJECTED', errorCodes.FILE_REJECTED.message);
      }
      uploaded.add(`offers/${ctx.store.id}/${params.name}`);
      return new HttpResponse(null, { status: 204 });
    }),

    http.post(api('/seller/offers'), async ({ request }) => {
      const ctx = guard(request);
      if (ctx.response) return ctx.response;
      if (!ctx.store.isVerified) return notVerified();
      const parsed = createOfferBodySchema.safeParse(await request.json().catch(() => null));
      if (!parsed.success) return error(422, 'VALIDATION_ERROR', 'Hay datos que no son válidos.');
      const body = parsed.data;
      const component = components.find((item) => item.id === body.componentId);
      if (!component) {
        return error(404, 'COMPONENT_NOT_FOUND', errorCodes.COMPONENT_NOT_FOUND.message);
      }
      const duplicate = offers.some(
        (offer) =>
          offer.ownerId === ctx.user.id &&
          offer.component.id === component.id &&
          offer.condition === body.condition,
      );
      if (duplicate) return error(409, 'OFFER_DUPLICATE', errorCodes.OFFER_DUPLICATE.message);
      const ownPrefix = `offers/${ctx.store.id}/`;
      const badKey = body.imageKeys.find((key) => !key.startsWith(ownPrefix) || !uploaded.has(key));
      if (badKey || new Set(body.imageKeys).size !== body.imageKeys.length) {
        return error(422, 'VALIDATION_ERROR', 'Una de las fotos no existe o no es tuya.');
      }
      const now = new Date().toISOString();
      const offer = {
        ownerId: ctx.user.id,
        offerId: crypto.randomUUID(),
        status: 'active',
        priceCop: body.priceCop,
        condition: body.condition,
        warrantyMonths: body.warrantyMonths,
        description: body.description,
        publishedAt: now,
        updatedAt: now,
        component: {
          id: component.id,
          category: component.category,
          brand: component.brand,
          model: component.model,
          displayName: component.displayName,
        },
        images: body.imageKeys.map((key, position) => ({ key, url: `/storage/${key}`, position })),
      };
      offers = [offer, ...offers];
      return HttpResponse.json({ offer: publicOffer(offer) }, { status: 201 });
    }),

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
      const { imageKeys, ...fields } = parsed.data;
      if (imageKeys) {
        const known = new Set(offer.images.map((image) => image.key));
        const ownPrefix = `offers/${ctx.store.id}/`;
        const bad = imageKeys.find(
          (key) => !known.has(key) && !(key.startsWith(ownPrefix) && uploaded.has(key)),
        );
        if (bad || new Set(imageKeys).size !== imageKeys.length) {
          return error(422, 'VALIDATION_ERROR', 'Una de las fotos no existe o no es tuya.');
        }
        fields.images = imageKeys.map((key, position) => ({
          key,
          url: `/storage/${key}`,
          position,
        }));
      }
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
