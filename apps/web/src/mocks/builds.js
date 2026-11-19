// Armados guardados simulados (POST /builds, GET /builds/{codigo}, GET /me/builds y
// DELETE /me/builds/{id}). Evalúan con el motor real, igual que el servidor, y exigen sesión donde
// la API la exige. La cuenta de comprador de demostración trae tres armados de ejemplo.
import { slotForCategory, evaluate } from '@hw/compat-engine';
import { saveBuildBodySchema } from '@hw/contracts';
import { http, HttpResponse } from 'msw';
import { demoUsers, userFromRequest } from './auth.js';
import { components, findOffer, offers } from './data.js';

const api = (path) => `*/api/v1${path}`;
const [demoBuyer] = demoUsers;

const error = (status, code, message) =>
  HttpResponse.json({ code, message, details: null, requestId: 'mock-request' }, { status });

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const newShareCode = () =>
  Array.from({ length: 10 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join(
    '',
  );

/** Evalúa con el motor las piezas elegidas (cada una con sus especificaciones). */
function evaluateItems(items) {
  const byCategory = Object.fromEntries(
    items.map((item) => [
      slotForCategory(item.category),
      components.find((component) => component.id === item.componentId).specs,
    ]),
  );
  const { results, summary, estimatedWatts, recommendedPsuW } = evaluate(byCategory);
  return {
    // El motor devuelve `message: null` en las reglas que no aplican; el contrato lo omite
    results: results.map(({ code, status, message, severity }) => ({
      code,
      status,
      ...(message ? { message } : {}),
      ...(severity ? { severity } : {}),
    })),
    summary,
    estimatedWatts,
    recommendedPsuW,
  };
}

/** Pieza guardada a partir de una pieza y, si se eligió, la oferta con cuyo precio se arma. */
function savedItem({ category, componentId, offerId }) {
  const component = components.find((item) => item.id === componentId);
  const offer = offerId ? offers.find((item) => item.offerId === offerId) : null;
  return {
    category,
    componentId,
    brand: component.brand,
    model: component.model,
    displayName: component.displayName,
    offerId: offer?.offerId ?? null,
    unitPriceCop: offer?.priceCop ?? null,
  };
}

function makeBuild({ id, name, inputs, ownerId, updatedAt, shareCode = newShareCode() }) {
  const items = inputs.map(savedItem);
  const evaluation = evaluateItems(inputs);
  return {
    ownerId,
    evaluation,
    build: {
      id,
      name,
      shareCode,
      estimatedWatts: evaluation.estimatedWatts,
      totalPriceCop: items.reduce((sum, item) => sum + (item.unitPriceCop ?? 0), 0),
      createdAt: updatedAt,
      updatedAt,
      isOwner: Boolean(ownerId),
      items,
    },
  };
}

const pick = (name) => {
  const { offerId, component } = findOffer(name);
  return { category: component.category, componentId: component.id, offerId };
};

function seed() {
  const id = (n) => `e0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
  return [
    makeBuild({
      id: id(1),
      name: 'Setup Gaming AM5',
      shareCode: 'GAMEam5Set',
      ownerId: demoBuyer.id,
      updatedAt: '2026-11-14T16:45:00.000Z',
      inputs: [
        'AMD Ryzen 7 7800X3D',
        'B650 GAMING PLUS',
        'Trident Z5',
        'RTX 4070 SUPER',
        'RM750',
        'Corsair 4000D',
        'AK400',
        'Kingston NV3',
      ].map(pick),
    }),
    makeBuild({
      id: id(2),
      name: 'Estación de trabajo',
      shareCode: 'WORKstn002',
      ownerId: demoBuyer.id,
      updatedAt: '2026-11-12T11:20:00.000Z',
      inputs: [
        'AMD Ryzen 5 7600',
        'MSI PRO B650M-P',
        'Vengeance Black DDR5',
        'RTX 4060 Ti',
        'MWE Gold',
        // Caja con datos incompletos: la altura máxima del disipador es desconocida (no verificable)
        'H510',
        'AK400',
      ].map(pick),
    }),
    makeBuild({
      id: id(3),
      name: 'Económico para esports',
      shareCode: 'ESPORTS003',
      ownerId: demoBuyer.id,
      updatedAt: '2026-11-02T09:15:00.000Z',
      // Procesador AM4 con placa AM5: incompatible a propósito
      inputs: ['Ryzen 5 5600', 'MSI PRO B650M-P'].map(pick),
    }),
  ];
}

// Los armados creados se guardan en localStorage para que sobrevivan a una recarga o a un enlace
// abierto en otra pestaña (los datos simulados viven en memoria y, sin esto, se pierden al recargar).
// Solo sirve en desarrollo, con VITE_USE_MOCKS=true.
const STORAGE_KEY = 'pcbuilder-mock-builds';

function storage() {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null; // acceso bloqueado por el navegador
  }
}

/** Lo guardado en localStorage, o null si no hay nada válido. */
function loadSaved() {
  try {
    const raw = storage()?.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : null;
    return Array.isArray(list) && list.every((entry) => entry?.build?.shareCode) ? list : null;
  } catch {
    return null;
  }
}

/** Armados guardados de todas las cuentas y los anónimos (ownerId null). */
let saved = loadSaved() ?? seed();

function setSaved(next) {
  saved = next;
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(saved));
  } catch {
    // Sin espacio o bloqueado: los armados siguen en memoria durante la sesión
  }
}

/** Vuelve a los armados de ejemplo (para pruebas) y olvida los creados. */
export function resetMockBuilds() {
  try {
    storage()?.removeItem(STORAGE_KEY);
  } catch {
    // nada que borrar
  }
  saved = seed();
}

const summaryOf = ({ build }) => ({
  id: build.id,
  name: build.name,
  shareCode: build.shareCode,
  estimatedWatts: build.estimatedWatts,
  totalPriceCop: build.totalPriceCop,
  itemCount: build.items.length,
  createdAt: build.createdAt,
  updatedAt: build.updatedAt,
});

const unauthenticated = () => error(401, 'UNAUTHENTICATED', 'Debes iniciar sesión para continuar.');

export const buildsHandlers = [
  http.post(api('/builds'), async ({ request }) => {
    const parsed = saveBuildBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return error(422, 'VALIDATION_ERROR', 'Hay datos que no son válidos.');
    const { name, items, draft } = parsed.data;
    if (items.some((item) => !components.some((c) => c.id === item.componentId))) {
      return error(404, 'COMPONENT_NOT_FOUND', 'El producto no está disponible en el catálogo.');
    }
    const evaluation = evaluateItems(items);
    if (evaluation.summary.incompatible > 0 && !draft) {
      return error(422, 'BUILD_INCOMPATIBLE', 'Tu configuración tiene incompatibilidades.');
    }
    const user = userFromRequest(request);
    const entry = makeBuild({
      id: `e0000000-0000-4000-8000-${String(saved.length + 100).padStart(12, '0')}`,
      name,
      inputs: items.map((item) => ({ ...item, offerId: item.offerId ?? null })),
      ownerId: user?.id ?? null,
      updatedAt: new Date().toISOString(),
    });
    setSaved([...saved, entry]);
    return HttpResponse.json({ build: entry.build, evaluation: entry.evaluation }, { status: 201 });
  }),

  http.get(api('/builds/:shareCode'), ({ params, request }) => {
    const entry = saved.find(({ build }) => build.shareCode === params.shareCode);
    if (!entry) return error(404, 'NOT_FOUND', 'No se encontró lo que buscas.');
    const user = userFromRequest(request);
    return HttpResponse.json({
      build: { ...entry.build, isOwner: Boolean(user) && entry.ownerId === user.id },
      evaluation: entry.evaluation,
    });
  }),

  // "Editar copia": copia el armado de otra persona a la cuenta de quien lo abre
  http.post(api('/builds/:shareCode/clone'), ({ params, request }) => {
    const user = userFromRequest(request);
    if (!user) return unauthenticated();
    const source = saved.find(({ build }) => build.shareCode === params.shareCode);
    if (!source) return error(404, 'NOT_FOUND', 'No se encontró lo que buscas.');
    const entry = makeBuild({
      id: `e0000000-0000-4000-8000-${String(saved.length + 100).padStart(12, '0')}`,
      name: `${source.build.name} (copia)`,
      inputs: source.build.items.map(({ category, componentId, offerId }) => ({
        category,
        componentId,
        offerId,
      })),
      ownerId: user.id,
      updatedAt: new Date().toISOString(),
    });
    saved = [...saved, entry];
    return HttpResponse.json({ build: entry.build, evaluation: entry.evaluation }, { status: 201 });
  }),

  http.get(api('/me/builds'), ({ request }) => {
    const user = userFromRequest(request);
    if (!user) return unauthenticated();
    const items = saved
      .filter((entry) => entry.ownerId === user.id)
      .sort((a, b) => b.build.updatedAt.localeCompare(a.build.updatedAt))
      .map(summaryOf);
    return HttpResponse.json({ items });
  }),

  http.delete(api('/me/builds/:id'), ({ params, request }) => {
    const user = userFromRequest(request);
    if (!user) return unauthenticated();
    const entry = saved.find((item) => item.build.id === params.id && item.ownerId === user.id);
    if (!entry) return error(404, 'NOT_FOUND', 'No se encontró lo que buscas.');
    setSaved(saved.filter((item) => item !== entry));
    return new HttpResponse(null, { status: 204 });
  }),
];
