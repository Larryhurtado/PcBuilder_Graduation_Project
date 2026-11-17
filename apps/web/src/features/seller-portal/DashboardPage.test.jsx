import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { demoUsers, signInMock } from '../../mocks/auth.js';
import { server } from '../../mocks/node.js';
import { renderApp } from '../../test/utils.jsx';
import { previousRange, rangeFor, todayInColombia } from './ranges.js';

const [buyer, seller] = demoUsers;
const route = (path) => `*/api/v1${path}`;
const location = (router) => router.state.location.pathname + router.state.location.search;

const today = todayInColombia();
const week = rangeFor('7d', today);
const before = previousRange(week);

/** Resumen con cifras fijas: una para el periodo actual y otra para el anterior. */
const analytics = ({ current, previous, active = 10, paused = 1 }) =>
  http.get(route('/seller/analytics/summary'), ({ request }) => {
    const from = new URL(request.url).searchParams.get('from');
    const totals = from === week.from ? current : previous;
    return HttpResponse.json({
      totals: { ...totals, activeOffers: active, pausedOffers: paused },
      daily:
        from === week.from
          ? [{ day: week.to, views: totals.views, whatsappClicks: totals.whatsappClicks }]
          : [],
    });
  });

const open = async (account = seller, path = '/vendedor') => {
  signInMock(account);
  const utils = renderApp(path);
  await screen.findByRole('heading', { level: 1, name: 'Dashboard' });
  return { ...utils, user: userEvent.setup() };
};
const kpis = () => within(screen.getByRole('region', { name: 'Indicadores' }));
const kpi = (label) => within(kpis().getByText(label).closest('div').parentElement);

describe('Dashboard: indicadores', () => {
  it('muestra visitas y clics con el cambio contra el periodo anterior', async () => {
    server.use(
      analytics({
        current: { views: 2000, whatsappClicks: 150 },
        previous: { views: 1000, whatsappClicks: 120 },
      }),
    );
    await open();
    expect(await kpis().findByText('2.000')).toBeInTheDocument();
    expect(kpis().getByText('150')).toBeInTheDocument();
    expect(await kpis().findByText('+100,0 %')).toBeInTheDocument();
    expect(kpis().getByText('+25,0 %')).toBeInTheDocument();
    expect(kpis().getAllByText('vs. periodo anterior')).toHaveLength(2);
  });

  it('una baja se muestra con signo menos y flecha, no solo con color', async () => {
    server.use(
      analytics({
        current: { views: 500, whatsappClicks: 40 },
        previous: { views: 1000, whatsappClicks: 40 },
      }),
    );
    await open();
    expect(await kpis().findByText('−50,0 %')).toBeInTheDocument();
    expect(kpis().getByText('+0,0 %')).toBeInTheDocument();
  });

  it('sin datos del periodo anterior lo dice en lugar de inventar un porcentaje', async () => {
    server.use(
      analytics({
        current: { views: 300, whatsappClicks: 30 },
        previous: { views: 0, whatsappClicks: 0 },
      }),
    );
    await open();
    expect(await kpis().findAllByText('Sin datos del periodo anterior')).toHaveLength(2);
  });

  it('la tasa de clic es clics entre visitas', async () => {
    server.use(
      analytics({
        current: { views: 1000, whatsappClicks: 85 },
        previous: { views: 1000, whatsappClicks: 85 },
      }),
    );
    await open();
    expect(await kpis().findByText('Tasa de clic: 8,5 %')).toBeInTheDocument();
  });

  it('sin visitas la tasa de clic no se calcula', async () => {
    server.use(
      analytics({
        current: { views: 0, whatsappClicks: 0 },
        previous: { views: 0, whatsappClicks: 0 },
      }),
    );
    await open();
    expect(await kpis().findByText('Tasa de clic: —')).toBeInTheDocument();
  });

  it('las ofertas activas y pausadas son la foto actual', async () => {
    await open();
    expect(await kpis().findByText('En el catálogo público')).toBeInTheDocument();
    expect(kpis().getByText('Ocultas del catálogo')).toBeInTheDocument();
    // La cuenta de demostración tiene 10 ofertas activas y 1 pausada
    await waitFor(() => expect(kpi('Ofertas activas').getByText('10')).toBeInTheDocument());
    expect(kpi('Ofertas pausadas').getByText('1')).toBeInTheDocument();
  });

  it('no afirma tiempo real, promedios del sector ni existencias', async () => {
    await open();
    await kpis().findByText('En el catálogo público');
    expect(document.body).not.toHaveTextContent(
      /tiempo real|Promedio del sector|sin existencias|Stock:|#BOG-042|v2\.4\.1/i,
    );
  });

  it('si falla el resumen muestra el error con reintento', async () => {
    server.use(http.get(route('/seller/analytics/summary'), () => HttpResponse.error()));
    await open();
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});

describe('Dashboard: rango de fechas', () => {
  it('empieza en 7 días y pide el rango y el periodo anterior', async () => {
    const requests = [];
    server.use(
      http.get(route('/seller/analytics/summary'), ({ request }) => {
        requests.push(Object.fromEntries(new URL(request.url).searchParams));
        return HttpResponse.json({
          totals: { views: 1, whatsappClicks: 1, activeOffers: 1, pausedOffers: 0 },
          daily: [],
        });
      }),
    );
    await open();
    await waitFor(() => expect(requests).toHaveLength(2));
    expect(requests).toContainEqual(week);
    expect(requests).toContainEqual(before);
    expect(screen.getByRole('button', { name: '7 días' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('cambiar a 30 días guarda el rango en la URL y pide los nuevos periodos', async () => {
    const requests = [];
    server.use(
      http.get(route('/seller/analytics/summary'), ({ request }) => {
        requests.push(Object.fromEntries(new URL(request.url).searchParams));
        return HttpResponse.json({
          totals: { views: 1, whatsappClicks: 1, activeOffers: 1, pausedOffers: 0 },
          daily: [],
        });
      }),
    );
    const { user, router } = await open();
    await user.click(screen.getByRole('button', { name: '30 días' }));
    expect(location(router)).toBe('/vendedor?rango=30d');
    const month = rangeFor('30d', today);
    await waitFor(() => expect(requests).toContainEqual(month));
    expect(requests).toContainEqual(previousRange(month));
    expect(screen.getByRole('button', { name: '30 días' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('"este mes" va del día 1 a hoy y se puede abrir desde un enlace', async () => {
    const requests = [];
    server.use(
      http.get(route('/seller/analytics/summary'), ({ request }) => {
        requests.push(Object.fromEntries(new URL(request.url).searchParams));
        return HttpResponse.json({
          totals: { views: 1, whatsappClicks: 1, activeOffers: 1, pausedOffers: 0 },
          daily: [],
        });
      }),
    );
    await open(seller, '/vendedor?rango=month');
    await waitFor(() => expect(requests).toContainEqual(rangeFor('month', today)));
    expect(screen.getByRole('button', { name: 'Este mes' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('un rango desconocido en la URL cae en 7 días', async () => {
    await open(seller, '/vendedor?rango=nada');
    expect(screen.getByRole('button', { name: '7 días' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Dashboard: gráfico', () => {
  it('la tabla accesible trae un día por fila, con ceros en los días sin eventos', async () => {
    server.use(
      analytics({
        current: { views: 120, whatsappClicks: 9 },
        previous: { views: 100, whatsappClicks: 8 },
      }),
    );
    await open();
    const table = await screen.findByRole('table', { name: 'Clics a WhatsApp por día' });
    const rows = within(table).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(7);
    expect(within(rows.at(-1)).getByRole('cell')).toHaveTextContent('9');
    expect(within(rows[0]).getByRole('cell')).toHaveTextContent('0');
  });

  it('se puede cambiar entre clics y visitas', async () => {
    server.use(
      analytics({
        current: { views: 120, whatsappClicks: 9 },
        previous: { views: 100, whatsappClicks: 8 },
      }),
    );
    const { user } = await open();
    await screen.findByRole('table', { name: 'Clics a WhatsApp por día' });
    await user.click(screen.getByRole('button', { name: 'Visitas a ofertas' }));
    const table = await screen.findByRole('table', { name: 'Visitas a ofertas por día' });
    expect(within(within(table).getAllByRole('row').at(-1)).getByRole('cell')).toHaveTextContent(
      '120',
    );
    expect(
      screen.getByRole('heading', { name: /Evolución de visitas a ofertas/ }),
    ).toBeInTheDocument();
  });
});

describe('Dashboard: verificación y publicar', () => {
  it('con el negocio verificado muestra el estado, el NIT y deja publicar', async () => {
    await open();
    const banner = within(await screen.findByRole('region', { name: 'Estado de verificación' }));
    expect(await banner.findByText('Negocio verificado')).toBeInTheDocument();
    expect(banner.getByText('NIT 900542189-1')).toBeInTheDocument();
    expect(banner.getByText(/no garantiza el cumplimiento de sus ofertas/)).toBeInTheDocument();
    const main = within(screen.getByRole('main'));
    expect(await main.findByRole('link', { name: 'Publicar producto' })).toHaveAttribute(
      'href',
      '/vendedor/publicar',
    );
    expect(screen.queryByText(/Aún no puedes publicar/)).not.toBeInTheDocument();
  });

  it('sin verificar bloquea "Publicar producto" con el aviso exacto y el enlace', async () => {
    server.use(
      http.get(route('/seller/verification/status'), () =>
        HttpResponse.json({
          status: 'pending_review',
          submittedAt: '2026-11-10T10:00:00.000Z',
          reviewerNote: null,
          deadlineAt: null,
          canReapplyAt: null,
        }),
      ),
    );
    await open();
    const button = await screen.findByRole('button', { name: 'Publicar producto' });
    expect(button).toBeDisabled();
    expect(
      await screen.findByText(
        /Aún no puedes publicar productos hasta que tu negocio sea verificado/,
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver estado de verificación' })).toHaveAttribute(
      'href',
      '/vendedor/verificacion',
    );
    expect(await screen.findByText('Tu solicitud está en revisión')).toBeInTheDocument();
  });

  it('"Ver inventario" lleva al inventario', async () => {
    await open();
    const link = screen.getAllByRole('link', { name: /Ver inventario/ })[0];
    expect(link).toHaveAttribute('href', '/vendedor/inventario');
  });
});

describe('Dashboard: tarjetas laterales', () => {
  it('con ofertas pausadas avisa cuántas y lleva al inventario', async () => {
    await open();
    const card = within(await screen.findByRole('region', { name: 'Ofertas pausadas' }));
    expect(await card.findByText('1 oferta pausada')).toBeInTheDocument();
    expect(card.getByRole('link', { name: /Ir al inventario/ })).toHaveAttribute(
      'href',
      '/vendedor/inventario',
    );
  });

  it('sin ofertas pausadas lo celebra con calma', async () => {
    server.use(
      analytics({
        current: { views: 10, whatsappClicks: 1 },
        previous: { views: 10, whatsappClicks: 1 },
        paused: 0,
      }),
    );
    await open();
    expect(await screen.findByText('Todo tu catálogo está visible')).toBeInTheDocument();
  });

  it('lo que depende del backend queda deshabilitado como "Próximamente"', async () => {
    await open();
    const top = screen.getByRole('region', { name: 'Productos con más clics' });
    expect(within(top).getByText('Próximamente')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Actualizar inventario masivo \(CSV\)/ }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: /WhatsApp de soporte/ })).toBeDisabled();
  });
});

describe('Dashboard: acceso', () => {
  it('sin sesión lleva a ingresar y recuerda el panel', async () => {
    const { router } = renderApp('/vendedor');
    await screen.findByRole('heading', { level: 1, name: 'Ingresar a tu cuenta' });
    expect(location(router)).toBe('/ingresar?next=%2Fvendedor');
  });

  it('un comprador no entra al portal del vendedor', async () => {
    signInMock(buyer);
    renderApp('/vendedor');
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Esta sección no es para tu tipo de cuenta',
      }),
    ).toBeInTheDocument();
  });

  it('recargar la página con la sesión viva restaura el panel', async () => {
    // La sesión se restaura en la raíz, también para el portal que no usa el marco público
    await open();
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
  });
});
