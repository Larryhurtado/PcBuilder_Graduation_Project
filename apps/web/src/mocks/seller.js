// Vendedor simulado: POST /seller/convert y PATCH /seller/store. Convertir exige una cuenta de
// comprador y deja la cuenta como vendedora; el comercio nace sin verificar, como en la API.
import { convertBodySchema, updateStoreBodySchema } from '@hw/contracts';
import { http, HttpResponse } from 'msw';
import { authResponseFor, updateMockUser, userFromRequest } from './auth.js';

const api = (path) => `*/api/v1${path}`;

const error = (status, code, message) =>
  HttpResponse.json({ code, message, details: null, requestId: 'mock-request' }, { status });

/** Comercios creados al convertirse, por id de usuario. */
let stores = {};

/** Quita los comercios creados durante la prueba. */
export function resetMockSeller() {
  stores = {};
}

const newStore = ({ legalName, tradeName }, userId) => ({
  id: `f0000000-0000-4000-8000-${String(Object.keys(stores).length + 1).padStart(12, '0')}`,
  ownerId: userId,
  legalName,
  tradeName,
  nit: null,
  description: null,
  logoUrl: null,
  whatsappE164: null,
  department: null,
  city: null,
  address: null,
  commercialCenter: null,
  latitude: null,
  longitude: null,
  openingHours: null,
  isVerified: false,
});

const publicStore = ({ ownerId: _owner, ...store }) => store;

export const sellerHandlers = [
  http.post(api('/seller/convert'), async ({ request }) => {
    const user = userFromRequest(request);
    if (!user) return error(401, 'UNAUTHENTICATED', 'Debes iniciar sesión para continuar.');
    if (user.role !== 'buyer') {
      return error(403, 'ROLE_FORBIDDEN', 'No tienes permiso para esta acción.');
    }
    const parsed = convertBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return error(422, 'VALIDATION_ERROR', 'Hay datos que no son válidos.');
    const store = newStore(parsed.data, user.id);
    stores = { ...stores, [user.id]: store };
    const seller = updateMockUser(user.id, { role: 'seller' });
    return HttpResponse.json(
      { ...authResponseFor(seller), store: publicStore(store) },
      { status: 201 },
    );
  }),

  http.patch(api('/seller/store'), async ({ request }) => {
    const user = userFromRequest(request);
    if (!user) return error(401, 'UNAUTHENTICATED', 'Debes iniciar sesión para continuar.');
    if (user.role !== 'seller') {
      return error(403, 'ROLE_FORBIDDEN', 'No tienes permiso para esta acción.');
    }
    const parsed = updateStoreBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return error(422, 'VALIDATION_ERROR', 'Hay datos que no son válidos.');
    const store = {
      ...(stores[user.id] ?? newStore({ legalName: '—', tradeName: '—' }, user.id)),
      ...parsed.data,
    };
    stores = { ...stores, [user.id]: store };
    return HttpResponse.json({ store: publicStore(store) });
  }),
];
