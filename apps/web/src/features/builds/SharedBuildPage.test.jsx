import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { demoUsers, signInMock } from '../../mocks/auth.js';
import { findOffer, offers as dataOffers } from '../../mocks/data.js';
import { server } from '../../mocks/node.js';
import { formatCOP } from '../../shared/lib/format.js';
import { renderApp } from '../../test/utils.jsx';
import { useBuildStore } from '../builder/store.js';

const [buyer, seller] = demoUsers;
const route = (path) => `*/api/v1${path}`;
const location = (router) => router.state.location.pathname + router.state.location.search;

beforeEach(() => useBuildStore.setState({ parts: {} }));

/** Abrir un armado pide las piezas y ofertas de cada componente: con cobertura tarda más. */
const open = async (code = 'GAMEam5Set', account = null) => {
  if (account) signInMock(account);
  const utils = renderApp(`/armado/${code}`);
  await screen.findByRole('heading', { level: 1 });
  return { ...utils, user: userEvent.setup() };
};
const pieces = () => within(screen.getByRole('region', { name: 'Piezas del armado' }));
const loaded = async () => {
  await waitFor(() => expect(pieces().getAllByRole('listitem').length).toBeGreaterThan(0), {
    timeout: 8000,
  });
};
/** El armado de ejemplo, pero guardado con otro total (como si los precios hubieran cambiado). */
const buildWithTotal = (shareCode, totalPriceCop) => {
  const names = [
    'AMD Ryzen 7 7800X3D',
    'B650 GAMING PLUS',
    'Trident Z5',
    'RTX 4070 SUPER',
    'RM750',
    'Corsair 4000D',
    'AK400',
    'Kingston NV3',
  ];
  return {
    build: {
      id: 'e0000000-0000-4000-8000-000000000999',
      name: 'Setup Gaming AM5',
      shareCode,
      estimatedWatts: 500,
      totalPriceCop,
      createdAt: '2026-11-14T16:45:00.000Z',
      updatedAt: '2026-11-14T16:45:00.000Z',
      isOwner: false,
      items: names.map((name) => {
        const offer = findOffer(name);
        return {
          category: offer.component.category,
          componentId: offer.component.id,
          brand: offer.component.brand,
          model: offer.component.model,
          displayName: offer.component.displayName,
          offerId: offer.offerId,
          unitPriceCop: offer.priceCop,
        };
      }),
    },
    evaluation: {
      results: [],
      summary: { incompatible: 0, unknown: 0, ok: 0 },
      estimatedWatts: 500,
      recommendedPsuW: 650,
    },
  };
};
const summary = () => within(screen.getByRole('complementary', { name: 'Resumen del armado' }));

describe('Armado compartido: lectura pública', () => {
  it('muestra el armado de solo lectura con su código y sus 8 piezas', async () => {
    await open();
    expect(screen.getByRole('heading', { level: 1, name: 'Setup Gaming AM5' })).toBeInTheDocument();
    expect(document.title).toBe('Setup Gaming AM5 · Armado compartido · PcBuilder');
    expect(
      screen.getByText(/Estás viendo un armado compartido de solo lectura/),
    ).toBeInTheDocument();
    expect(screen.getByText('#GAMEam5Set')).toBeInTheDocument();
    expect(screen.getByText(/Guardado el 14 de noviembre de 2026/)).toBeInTheDocument();
    await loaded();
    expect(pieces().getAllByRole('listitem')).toHaveLength(8);
    expect(pieces().getByText('AMD Ryzen 7 7800X3D')).toBeInTheDocument();
  });

  it('las piezas van en el orden del asistente y cada una trae tienda, precio y WhatsApp', async () => {
    await open();
    await loaded();
    const items = pieces().getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Procesador / CPU');
    expect(items[1]).toHaveTextContent('Placa Base / MB');
    const cpu = within(items[0]);
    const offer = findOffer('AMD Ryzen 7 7800X3D');
    expect(cpu.getByText(formatCOP(offer.priceCop))).toBeInTheDocument();
    expect(cpu.getByText(new RegExp(offer.store.name))).toBeInTheDocument();
    expect(cpu.getByRole('link', { name: /Contactar por WhatsApp/ })).toHaveAttribute(
      'href',
      expect.stringContaining('wa.me/'),
    );
    expect(cpu.getByText('Compatible')).toBeInTheDocument();
  });

  it('muestra el costo actual, las métricas reales y la carga de la fuente', async () => {
    await open();
    await loaded();
    expect(screen.getByText('Ofertas vigentes: 8 de 8')).toBeInTheDocument();
    expect(screen.getByText(/reglas OK/)).toBeInTheDocument();
    expect(screen.getByText('Fuente sugerida')).toBeInTheDocument();
    expect(
      summary().getByRole('progressbar', { name: 'Carga estimada de la fuente' }),
    ).toBeInTheDocument();
    expect(summary().getAllByRole('listitem')).toHaveLength(8);
  });

  it('no inventa datos del prototipo', async () => {
    await open();
    await loaded();
    expect(document.body).not.toHaveTextContent(
      /Camilo|Preset Entusiasta|Curva de Ventiladores|Stock inmediato|Despacho hoy|IVA incluido|HTTP 404|COT según/i,
    );
  });

  it('un armado con datos faltantes marca la pieza como no verificable', async () => {
    await open('WORKstn002');
    await loaded();
    expect(pieces().getAllByText('No verificable').length).toBeGreaterThan(0);
  });

  it('un armado con una incompatibilidad la marca', async () => {
    await open('ESPORTS003');
    await loaded();
    expect(pieces().getAllByText('Incompatible').length).toBeGreaterThan(0);
  });
});

describe('Armado compartido: acciones', () => {
  it('"Compartir enlace" copia la dirección y avisa', async () => {
    const { user } = await open();
    await user.click(screen.getByRole('button', { name: /Compartir enlace/ }));
    expect(await screen.findByText('Enlace del armado copiado.')).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe(
      `${window.location.origin}/armado/GAMEam5Set`,
    );
  });

  it('"Descargar PDF" está deshabilitado como "Próximamente"', async () => {
    await open();
    const buttons = screen.getAllByRole('button', { name: /PDF/ });
    expect(buttons.length).toBeGreaterThan(0);
    for (const button of buttons) {
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent('Próximamente');
    }
  });

  it('"Copiar en mi armado" carga las piezas en el asistente sin pedir sesión', async () => {
    const { user, router } = await open();
    await loaded();
    await user.click(screen.getAllByRole('button', { name: /Copiar en mi armado/ })[0]);
    await waitFor(() => expect(location(router)).toBe('/armador'), { timeout: 8000 });
    expect(Object.keys(useBuildStore.getState().parts)).toHaveLength(8);
    expect(
      await screen.findByText(/Abrimos «Setup Gaming AM5» en el asistente/),
    ).toBeInTheDocument();
  });

  it('si ya hay un armado en curso pide confirmar antes de reemplazarlo', async () => {
    useBuildStore.getState().setPart(findOffer('Intel Core i5 12400F'));
    const { user, router } = await open();
    await loaded();
    await user.click(screen.getAllByRole('button', { name: /Copiar en mi armado/ })[0]);
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText('¿Reemplazar tu armado actual?')).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Cancelar' }));
    expect(location(router)).toBe('/armado/GAMEam5Set');
    expect(Object.keys(useBuildStore.getState().parts)).toEqual(['cpu']);
    await user.click(screen.getAllByRole('button', { name: /Copiar en mi armado/ })[0]);
    await user.click(
      within(await screen.findByRole('dialog')).getByRole('button', {
        name: 'Reemplazar y copiar',
      }),
    );
    await waitFor(() => expect(location(router)).toBe('/armador'), { timeout: 8000 });
    expect(Object.keys(useBuildStore.getState().parts)).toHaveLength(8);
  });
});

describe('Armado compartido: guardar una copia', () => {
  it('sin sesión invita a iniciarla y volver al armado', async () => {
    await open();
    expect(
      screen.getByRole('link', { name: 'Inicia sesión para guardar una copia' }),
    ).toHaveAttribute('href', '/ingresar?next=%2Farmado%2FGAMEam5Set');
  });

  it('con sesión, otra persona guarda una copia en su cuenta', async () => {
    const { user, router } = await open('GAMEam5Set', seller);
    await loaded();
    await user.click(screen.getByRole('button', { name: 'Guardar copia en mi cuenta' }));
    await waitFor(() => expect(location(router)).toBe('/cuenta/armados'), { timeout: 8000 });
  });

  it('el dueño ve "Es tu armado" y un enlace a sus armados, no la copia', async () => {
    await open('GAMEam5Set', buyer);
    expect(await screen.findByText('Es tu armado')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Guardar copia en mi cuenta' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver mis armados' })).toHaveAttribute(
      'href',
      '/cuenta/armados',
    );
  });

  it('si falla guardar la copia avisa', async () => {
    server.use(
      http.post(route('/builds/:shareCode/clone'), () =>
        HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: 'x', details: null, requestId: 'r' },
          { status: 500 },
        ),
      ),
    );
    const { user } = await open('GAMEam5Set', seller);
    await user.click(screen.getByRole('button', { name: 'Guardar copia en mi cuenta' }));
    expect(await screen.findByText(/Ocurrió un error inesperado/)).toBeInTheDocument();
  });
});

describe('Armado compartido: ofertas que cambiaron', () => {
  it('si la oferta guardada ya no está muestra la más barata de hoy y lo avisa', async () => {
    server.use(
      http.get(route('/offers'), ({ request }) => {
        const id = new URL(request.url).searchParams.get('componentId');
        const items = dataOffers
          .filter((offer) => offer.component.id === id)
          // Mismos productos con otro id de oferta: la guardada ya no existe
          .map((offer, index) => ({
            ...offer,
            offerId: `b0000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
          }));
        return HttpResponse.json({ items, nextCursor: null });
      }),
    );
    await open();
    await loaded();
    expect(pieces().getAllByText(/La oferta guardada ya no está/)).toHaveLength(8);
  });

  it('sin ofertas vigentes avisa y no deja copiar', async () => {
    server.use(
      http.get(route('/offers'), () => HttpResponse.json({ items: [], nextCursor: null })),
    );
    await open();
    expect(await screen.findAllByText('Sin oferta vigente')).toHaveLength(8);
    expect(screen.getByRole('note')).toHaveTextContent(/Ninguna pieza de este armado/);
    for (const button of screen.getAllByRole('button', { name: /Copiar en mi armado/ })) {
      expect(button).toBeDisabled();
    }
    expect(screen.getByText('Ofertas vigentes: 0 de 8')).toBeInTheDocument();
  });

  it('si el total cambió desde que se guardó lo dice', async () => {
    server.use(
      http.get(route('/builds/:shareCode'), ({ params }) =>
        HttpResponse.json(buildWithTotal(params.shareCode, 5_000_000)),
      ),
    );
    await open();
    await loaded();
    expect(await screen.findByRole('note')).toHaveTextContent(
      /Cuando se guardó, el armado costaba/,
    );
  });
});

describe('Armado compartido: errores', () => {
  it('un código que no existe muestra el estado de "no encontrado"', async () => {
    renderApp('/armado/ZZZZZZZZZZ');
    expect(
      await screen.findByRole('heading', { name: 'Armado no encontrado' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Este armado no existe o fue despublicado por su autor.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ir al asistente/ })).toHaveAttribute(
      'href',
      '/armador',
    );
  });

  it('un código mal escrito ni siquiera consulta la API', async () => {
    let calls = 0;
    server.use(
      http.get(route('/builds/:shareCode'), () => {
        calls += 1;
        return HttpResponse.json({});
      }),
    );
    renderApp('/armado/xyz999');
    expect(
      await screen.findByRole('heading', { name: 'Armado no encontrado' }),
    ).toBeInTheDocument();
    expect(calls).toBe(0);
  });

  it('si falla la red ofrece reintentar', async () => {
    server.use(http.get(route('/builds/:shareCode'), () => HttpResponse.error()));
    renderApp('/armado/GAMEam5Set');
    expect(
      await screen.findByRole('button', { name: 'Reintentar' }, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it('mientras carga muestra un marcador', async () => {
    renderApp('/armado/GAMEam5Set');
    expect(await screen.findByRole('status', { name: 'Cargando el armado' })).toBeInTheDocument();
  });
});
