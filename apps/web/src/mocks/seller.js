// Vendedor simulado: POST /seller/convert y PATCH /seller/store. Convertir exige una cuenta de
// comprador y deja la cuenta como vendedora; el comercio nace sin verificar, como en la API.
import {
  analyticsSummaryQuerySchema,
  convertBodySchema,
  updateStoreBodySchema,
} from '@hw/contracts';
import { http, HttpResponse } from 'msw';
import { authResponseFor, demoUsers, updateMockUser, userFromRequest } from './auth.js';
import { stores as dataStores } from './data.js';

const api = (path) => `*/api/v1${path}`;

const error = (status, code, message) =>
  HttpResponse.json({ code, message, details: null, requestId: 'mock-request' }, { status });

const [, demoSeller] = demoUsers;

/** El comercio de la cuenta de vendedor de demostración: TecnoPasarela Cali, ya verificado. */
function seed() {
  const [tecnoPasarela] = dataStores;
  return {
    [demoSeller.id]: {
      id: tecnoPasarela.id,
      ownerId: demoSeller.id,
      legalName: 'TecnoPasarela Cali SAS',
      tradeName: tecnoPasarela.name,
      nit: '900542189-1',
      description: tecnoPasarela.description,
      logoUrl: null,
      whatsappE164: tecnoPasarela.whatsappE164,
      department: tecnoPasarela.department,
      city: tecnoPasarela.city,
      address: tecnoPasarela.address,
      commercialCenter: tecnoPasarela.commercialCenter,
      latitude: null,
      longitude: null,
      openingHours: null,
      isVerified: true,
    },
  };
}

/** Comercios por id de usuario: el de demostración y los que se crean al convertirse. */
let stores = seed();

/** Vuelve al comercio de demostración y quita los creados durante la prueba. */
export function resetMockSeller() {
  stores = seed();
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

/** Exige sesión de vendedor y devuelve su comercio, o la respuesta de error que corresponde. */
function sellerGuard(request) {
  const user = userFromRequest(request);
  if (!user) {
    return { response: error(401, 'UNAUTHENTICATED', 'Debes iniciar sesión para continuar.') };
  }
  if (user.role !== 'seller') {
    return { response: error(403, 'ROLE_FORBIDDEN', 'No tienes permiso para esta acción.') };
  }
  return { user, store: stores[user.id] };
}

const DAY_MS = 86_400_000;
const bogotaToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
const addDays = (day, count) =>
  new Date(Date.parse(`${day}T00:00:00Z`) + count * DAY_MS).toISOString().slice(0, 10);
const daysBetween = (from, to) => (Date.parse(to) - Date.parse(from)) / DAY_MS + 1;

/** Visitas y clics de un día; algunos días no tienen eventos (null), como en la API real. */
function statsFor(day) {
  const n = Math.floor(Date.parse(`${day}T00:00:00Z`) / DAY_MS);
  if (n % 9 === 0) return null;
  const views = 120 + ((n * 37) % 90);
  return { views, whatsappClicks: Math.round(views * (0.07 + ((n * 13) % 5) / 100)) };
}

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

  http.get(api('/seller/store'), ({ request }) => {
    const guard = sellerGuard(request);
    return guard.response ?? HttpResponse.json({ store: publicStore(guard.store) });
  }),

  http.get(api('/seller/verification/status'), ({ request }) => {
    const guard = sellerGuard(request);
    if (guard.response) return guard.response;
    return HttpResponse.json({
      status: guard.store.isVerified ? 'approved' : 'not_submitted',
      submittedAt: guard.store.isVerified ? '2026-10-20T15:00:00.000Z' : null,
      reviewerNote: null,
      deadlineAt: null,
      canReapplyAt: null,
    });
  }),

  // Visitas y clics a WhatsApp por día (en hora de Colombia), más las ofertas activas y pausadas
  http.get(api('/seller/analytics/summary'), ({ request }) => {
    const guard = sellerGuard(request);
    if (guard.response) return guard.response;
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const parsed = analyticsSummaryQuerySchema.safeParse(params);
    if (!parsed.success) return error(422, 'VALIDATION_ERROR', 'Hay datos que no son válidos.');
    const to = parsed.data.to ?? bogotaToday();
    const from = parsed.data.from ?? addDays(to, -6);
    if (daysBetween(from, to) > 90) {
      return error(422, 'VALIDATION_ERROR', 'Hay datos que no son válidos.');
    }
    const daily = [];
    for (let day = from; day <= to; day = addDays(day, 1)) {
      const stats = statsFor(day);
      if (stats) daily.push({ day, ...stats });
    }
    const isDemo = guard.user.id === demoSeller.id;
    return HttpResponse.json({
      totals: {
        views: daily.reduce((sum, item) => sum + item.views, 0),
        whatsappClicks: daily.reduce((sum, item) => sum + item.whatsappClicks, 0),
        activeOffers: isDemo ? 10 : 0,
        pausedOffers: isDemo ? 1 : 0,
      },
      daily,
    });
  }),
];
