// Favoritos simulados (GET, PUT y DELETE /me/wishlist). Piden sesión, como la API; guardar y quitar
// son idempotentes. El precio mínimo y la cantidad de ofertas salen de las ofertas simuladas. La
// cuenta de comprador de demostración trae tres favoritos.
import { http, HttpResponse } from 'msw';
import { demoUsers, userFromRequest } from './auth.js';
import { components, offers } from './data.js';

const api = (path) => `*/api/v1${path}`;
const [demoBuyer] = demoUsers;

const error = (status, code, message) =>
  HttpResponse.json({ code, message, details: null, requestId: 'mock-request' }, { status });

const unauthenticated = () => error(401, 'UNAUTHENTICATED', 'Debes iniciar sesión para continuar.');

const itemFor = (component, addedAt) => {
  const prices = offers
    .filter((offer) => offer.component.id === component.id)
    .map((offer) => offer.priceCop);
  return {
    componentId: component.id,
    category: component.category,
    brand: component.brand,
    model: component.model,
    displayName: component.displayName,
    minPriceCop: prices.length ? Math.min(...prices) : null,
    offersCount: prices.length,
    addedAt,
  };
};

const byName = (name) => components.find((component) => component.displayName.includes(name));

function seed() {
  return {
    [demoBuyer.id]: [
      itemFor(byName('AMD Ryzen 7 7800X3D'), '2026-11-14T10:00:00.000Z'),
      itemFor(byName('RTX 4070 SUPER'), '2026-11-12T10:00:00.000Z'),
      itemFor(byName('Corsair 4000D'), '2026-11-10T10:00:00.000Z'),
    ],
  };
}

/** Favoritos por usuario; el resto de cuentas empieza vacío. */
let wishlist = seed();

/** Vuelve a los favoritos de ejemplo (para pruebas). */
export function resetMockWishlist() {
  wishlist = seed();
}

const listFor = (userId) =>
  [...(wishlist[userId] ?? [])].sort((a, b) => b.addedAt.localeCompare(a.addedAt));

export const wishlistHandlers = [
  http.get(api('/me/wishlist'), ({ request }) => {
    const user = userFromRequest(request);
    return user ? HttpResponse.json({ items: listFor(user.id) }) : unauthenticated();
  }),

  http.put(api('/me/wishlist/:componentId'), ({ params, request }) => {
    const user = userFromRequest(request);
    if (!user) return unauthenticated();
    const component = components.find((item) => item.id === params.componentId);
    if (!component) {
      return error(404, 'COMPONENT_NOT_FOUND', 'El producto no está disponible en el catálogo.');
    }
    const current = wishlist[user.id] ?? [];
    if (!current.some((item) => item.componentId === component.id)) {
      wishlist = {
        ...wishlist,
        [user.id]: [...current, itemFor(component, new Date().toISOString())],
      };
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.delete(api('/me/wishlist/:componentId'), ({ params, request }) => {
    const user = userFromRequest(request);
    if (!user) return unauthenticated();
    wishlist = {
      ...wishlist,
      [user.id]: (wishlist[user.id] ?? []).filter(
        (item) => item.componentId !== params.componentId,
      ),
    };
    return new HttpResponse(null, { status: 204 });
  }),
];
