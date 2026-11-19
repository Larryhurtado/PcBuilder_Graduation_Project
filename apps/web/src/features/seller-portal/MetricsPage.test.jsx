import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { demoUsers, signInMock } from '../../mocks/auth.js';
import { server } from '../../mocks/node.js';
import { renderApp } from '../../test/utils.jsx';
import { addDays, rangeFor, todayInColombia } from './ranges.js';

const [, seller] = demoUsers;
const route = (path) => `*/api/v1${path}`;
const TODAY = todayInColombia();
const FIRST_DAY = rangeFor('7d', TODAY).from;

/**
 * Datos conocidos de analítica: en el rango actual cada día tiene 100 visitas y 10 clics, salvo hoy
 * (30 clics) y el primer día del rango de 7 días (sin eventos). En el periodo anterior, 100 visitas y
 * 5 clics cada día.
 */
const known = () =>
  server.use(
    http.get(route('/seller/analytics/summary'), ({ request }) => {
      const query = new URL(request.url).searchParams;
      const from = query.get('from');
      const to = query.get('to');
      const isCurrent = to === TODAY;
      const daily = [];
      for (let day = from; day <= to; day = addDays(day, 1)) {
        if (isCurrent && day === FIRST_DAY) continue;
        daily.push({
          day,
          views: 100,
          whatsappClicks: isCurrent ? (day === TODAY ? 30 : 10) : 5,
        });
      }
      return HttpResponse.json({
        totals: {
          views: daily.reduce((sum, item) => sum + item.views, 0),
          whatsappClicks: daily.reduce((sum, item) => sum + item.whatsappClicks, 0),
          activeOffers: 10,
          pausedOffers: 1,
        },
        daily,
      });
    }),
  );

const open = async (path = '/vendedor/metricas') => {
  signInMock(seller);
  const utils = renderApp(path);
  await screen.findByRole('heading', { level: 1, name: 'Métricas y clics' });
  return { ...utils, user: userEvent.setup() };
};
const loaded = () => screen.findByRole('region', { name: 'Datos por día' });
const kpis = () => within(screen.getByRole('region', { name: 'Indicadores' }));

// Las funciones de URL del entorno de pruebas no sirven con el Blob de jsdom: cada prueba define las suyas
const originalUrl = { create: URL.createObjectURL, revoke: URL.revokeObjectURL };
const setUrl = (create, revoke) => {
  Object.defineProperty(URL, 'createObjectURL', {
    value: create,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    value: revoke,
    configurable: true,
    writable: true,
  });
};

afterEach(() => setUrl(originalUrl.create, originalUrl.revoke));

describe('Métricas: pantalla', () => {
  it('muestra el título, el rango de 7 días y no promete tiempo real', async () => {
    known();
    await open();
    await loaded();
    expect(document.title).toBe('Métricas y clics · PcBuilder');
    expect(screen.getByRole('button', { name: '7 días' })).toHaveAttribute('aria-pressed', 'true');
    expect(document.body).not.toHaveTextContent(/tiempo real/i);
  });

  it('mientras carga muestra un marcador', async () => {
    known();
    signInMock(seller);
    renderApp('/vendedor/metricas');
    expect(
      await screen.findByRole('status', { name: 'Cargando las métricas' }),
    ).toBeInTheDocument();
  });

  it('si falla la carga ofrece reintentar', async () => {
    server.use(http.get(route('/seller/analytics/summary'), () => HttpResponse.error()));
    await open();
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('el menú lateral la marca como la página actual', async () => {
    known();
    await open();
    const menu = within(screen.getByRole('navigation', { name: 'Panel comercial' }));
    expect(menu.getByRole('link', { name: 'Métricas y clics' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});

describe('Métricas: indicadores', () => {
  it('suma visitas y clics, calcula la tasa y el promedio diario', async () => {
    known();
    await open();
    await loaded();
    // 6 días con eventos: 600 visitas; clics 5 × 10 + 30 = 80; 80 / 600 = 13,3 %; 80 / 7 = 11,4
    const cards = kpis();
    await waitFor(() => expect(cards.getByText('600')).toBeInTheDocument());
    expect(cards.getByText('80')).toBeInTheDocument();
    expect(cards.getByText('13,3 %')).toBeInTheDocument();
    expect(cards.getByText('11,4')).toBeInTheDocument();
    expect(cards.getByText('En 7 días')).toBeInTheDocument();
  });

  it('compara cada indicador con el periodo anterior', async () => {
    known();
    await open();
    await loaded();
    // Antes: 700 visitas, 35 clics, tasa 5 %
    await waitFor(() => expect(kpis().getAllByText(/vs\. periodo anterior/)).toHaveLength(3));
    expect(kpis().getByText(/−14,3\s?%/)).toBeInTheDocument(); // visitas
    expect(kpis().getByText(/\+128,6\s?%/)).toBeInTheDocument(); // clics
    expect(kpis().getByText(/\+8,3 puntos/)).toBeInTheDocument(); // tasa en puntos
  });

  it('el embudo dice cuántas visitas terminan en clic', async () => {
    known();
    await open();
    await loaded();
    expect(
      screen.getByText('De cada 100 visitas, 13,3 terminan en un clic a tu WhatsApp.'),
    ).toBeInTheDocument();
  });
});

describe('Métricas: análisis por día', () => {
  it('encuentra el mejor día y el más flojo', async () => {
    known();
    await open();
    await loaded();
    const days = within(screen.getByRole('region', { name: 'Mejor y peor día' }));
    expect(days.getByText('Mejor día')).toBeInTheDocument();
    expect(days.getByText(/30 clics · 100 visitas/)).toBeInTheDocument();
    expect(days.getByText('Día más flojo')).toBeInTheDocument();
    expect(days.getByText(/0 clics · 0 visitas/)).toBeInTheDocument();
  });

  it('lista los siete días de la semana con su promedio de clics', async () => {
    known();
    await open();
    await loaded();
    const list = within(
      screen.getByRole('list', { name: 'Promedio de clics por día de la semana' }),
    );
    expect(list.getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getByText(/Tu día más fuerte:/)).toBeInTheDocument();
  });

  it('la tabla trae un renglón por día y los totales', async () => {
    known();
    await open();
    const section = within(await loaded());
    const table = within(
      section.getByRole('table', { name: /Visitas, clics y tasa de clic por día/ }),
    );
    // 7 días + encabezado + total
    expect(table.getAllByRole('row')).toHaveLength(9);
    const total = within(table.getByRole('row', { name: /^Total/ }));
    expect(total.getByText('600')).toBeInTheDocument();
    expect(total.getByText('80')).toBeInTheDocument();
    expect(total.getByText('13,3 %')).toBeInTheDocument();
  });
});

describe('Métricas: gráfica y rango', () => {
  it('cambia lo que muestra la gráfica, incluida la tasa de clic', async () => {
    known();
    const { user } = await open();
    await loaded();
    expect(
      screen.getByRole('heading', { name: 'Evolución de clics a WhatsApp' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tasa de clic' }));
    expect(
      screen.getByRole('heading', { name: 'Evolución de la tasa de clic' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Visitas a ofertas' }));
    expect(
      screen.getByRole('heading', { name: 'Evolución de visitas a ofertas' }),
    ).toBeInTheDocument();
  });

  it('al cambiar el rango pide los 30 días y lo deja en la dirección', async () => {
    known();
    const { user, router } = await open();
    await loaded();
    await user.click(screen.getByRole('button', { name: '30 días' }));
    await waitFor(() => expect(router.state.location.search).toBe('?rango=30d'));
    await waitFor(() => {
      const table = screen.getByRole('table', { name: /Visitas, clics y tasa de clic por día/ });
      expect(within(table).getAllByRole('row')).toHaveLength(32);
    });
    await user.click(screen.getByRole('button', { name: '7 días' }));
    await waitFor(() => expect(router.state.location.search).toBe(''));
  });

  it('abre con el rango de la dirección', async () => {
    known();
    await open('/vendedor/metricas?rango=30d');
    expect(screen.getByRole('button', { name: '30 días' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('Métricas: descargar CSV', () => {
  it('descarga el archivo con el nombre del rango y avisa', async () => {
    known();
    const createObjectURL = vi.fn(() => 'blob:csv');
    const revokeObjectURL = vi.fn();
    setUrl(createObjectURL, revokeObjectURL);
    const names = [];
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function download() {
        names.push(this.download);
      });
    const { user } = await open();
    await loaded();
    await user.click(screen.getByRole('button', { name: 'Descargar CSV' }));
    expect(await screen.findByText('Descargamos el archivo CSV.')).toBeInTheDocument();
    expect(names).toEqual([`metricas-${FIRST_DAY}_a_${TODAY}.csv`]);
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:csv');
    const blob = createObjectURL.mock.calls[0][0];
    expect(blob.type).toBe('text/csv;charset=utf-8');
    expect(blob.size).toBeGreaterThan(50);
    click.mockRestore();
  });

  it('si el navegador no puede crear el archivo avisa', async () => {
    known();
    setUrl(undefined, undefined);
    const { user } = await open();
    await loaded();
    await user.click(screen.getByRole('button', { name: 'Descargar CSV' }));
    expect(await screen.findByText('Tu navegador no pudo crear el archivo.')).toBeInTheDocument();
  });
});

describe('Métricas: sin datos y lo que falta', () => {
  it('sin visitas ni clics lo explica y no inventa porcentajes', async () => {
    server.use(
      http.get(route('/seller/analytics/summary'), () =>
        HttpResponse.json({
          totals: { views: 0, whatsappClicks: 0, activeOffers: 3, pausedOffers: 0 },
          daily: [],
        }),
      ),
    );
    await open();
    await loaded();
    expect(screen.getByRole('note')).toHaveTextContent(/Aún no hay visitas ni clics en este rango/);
    expect(
      screen.getByText('Todavía no hay visitas para calcular la tasa de clic.'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Aún no hay clics para comparar los días del rango.'),
    ).toBeInTheDocument();
    expect(kpis().getAllByText('—').length).toBeGreaterThan(0);
  });

  it('"Productos con más clics" queda como "Próximamente"', async () => {
    known();
    await open();
    await loaded();
    const top = within(screen.getByRole('region', { name: 'Productos con más clics' }));
    expect(top.getByText('Próximamente')).toBeInTheDocument();
  });

  it('explica cómo se cuentan las visitas y los clics', async () => {
    known();
    await open();
    await loaded();
    expect(screen.getByText(/una visita por sesión cada 30 minutos/)).toBeInTheDocument();
  });
});

describe('Dashboard: enlace a las métricas', () => {
  it('lleva a las métricas conservando el rango', async () => {
    known();
    signInMock(seller);
    const { router } = renderApp('/vendedor?rango=30d');
    const user = userEvent.setup();
    const link = await screen.findByRole('link', { name: /Ver métricas detalladas/ });
    expect(link).toHaveAttribute('href', '/vendedor/metricas?rango=30d');
    await user.click(link);
    await screen.findByRole('heading', { level: 1, name: 'Métricas y clics' });
    expect(router.state.location.search).toBe('?rango=30d');
  });
});
