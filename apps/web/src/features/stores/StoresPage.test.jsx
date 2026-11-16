import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { publicStores } from '../../mocks/data.js';
import { server } from '../../mocks/node.js';
import { renderApp } from '../../test/utils.jsx';

const list = () => within(screen.getByRole('region', { name: 'Tiendas' }));
const names = () =>
  list()
    .getAllByRole('heading', { level: 3 })
    .map((h) => h.textContent);
const search = (router) => new URLSearchParams(router.state.location.search);

const loaded = () => list().findAllByRole('heading', { level: 3 });

describe('Directorio de tiendas', () => {
  it('muestra el título, el aviso de qué significa verificado y las tiendas', async () => {
    renderApp('/tiendas');
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Directorio de tiendas de hardware en Colombia',
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(/No garantizamos el cumplimiento de sus ofertas/)).toBeInTheDocument();
    expect(await loaded()).toHaveLength(2);
    expect(list().getByText('Mostrando 2 tiendas')).toBeInTheDocument();
    expect(document.title).toBe('Tiendas verificadas · PcBuilder');
  });

  it('cada tarjeta muestra ubicación, ofertas activas, catálogo y WhatsApp', async () => {
    renderApp('/tiendas');
    await loaded();
    const card = within(list().getAllByRole('article')[0]);
    const store = publicStores.find((s) => s.name === card.getByRole('heading').textContent);
    expect(card.getByText('Comercio verificado')).toBeInTheDocument();
    expect(card.getByText(store.commercialCenter)).toBeInTheDocument();
    expect(card.getByText(`${store.offersCount} ofertas activas`)).toBeInTheDocument();
    expect(card.getByRole('link', { name: /^Ver tienda y catálogo de / })).toHaveAttribute(
      'href',
      `/tiendas/${store.id}`,
    );
    expect(card.getByRole('link', { name: /por WhatsApp/ }).getAttribute('href')).toMatch(
      /^https:\/\/wa\.me\/57300000000\d\?text=/,
    );
  });

  it('las estadísticas salen de las tiendas reales, sin cifras inventadas', async () => {
    renderApp('/tiendas');
    await loaded();
    const offers = publicStores.reduce((sum, s) => sum + s.offersCount, 0);
    expect(screen.getByText('ofertas activas', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText(String(offers))).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/NIT|Medellín|Ley 1480|cada 4 h|100%/);
  });

  it('ordena por más ofertas y por nombre', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/tiendas');
    await loaded();
    const byOffers = [...publicStores]
      .sort((a, b) => b.offersCount - a.offersCount || a.name.localeCompare(b.name, 'es'))
      .map((s) => s.name);
    expect(names()).toEqual(byOffers);

    await user.selectOptions(screen.getByRole('combobox', { name: 'Ordenar tiendas' }), 'name');
    expect(names()).toEqual([...byOffers].sort((a, b) => a.localeCompare(b, 'es')));
    expect(search(router).get('sort')).toBe('name');
  });

  it('filtra por ciudad y lo guarda en la URL', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/tiendas');
    await loaded();

    await user.click(screen.getByRole('button', { name: /^Cali/ }));
    await waitFor(() => expect(names()).toEqual(['TecnoPasarela Cali']));
    expect(search(router).get('city')).toBe('Cali');
    expect(screen.getByRole('button', { name: /^Cali/ })).toHaveAttribute('aria-pressed', 'true');
    // Las ciudades siguen disponibles aunque haya una elegida
    expect(screen.getByRole('button', { name: /^Bogotá/ })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Todas/ }));
    await waitFor(() => expect(names()).toHaveLength(2));
    expect(search(router).has('city')).toBe(false);
  });

  it('busca por nombre al dejar de escribir', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/tiendas');
    await loaded();

    await user.type(screen.getByRole('searchbox', { name: 'Buscar tienda' }), 'unilago');
    await waitFor(() => expect(names()).toEqual(['Unilago Gaming']));
    expect(search(router).get('q')).toBe('unilago');
  });

  it('con una sola letra pide escribir más y no consulta', async () => {
    const user = userEvent.setup();
    renderApp('/tiendas');
    await loaded();
    await user.type(screen.getByRole('searchbox', { name: 'Buscar tienda' }), 'u');
    expect(await screen.findByText('Escribe al menos 2 letras para buscar.')).toBeInTheDocument();
    expect(names()).toHaveLength(2);
  });

  it('sin coincidencias ofrece quitar los filtros', async () => {
    const user = userEvent.setup();
    renderApp('/tiendas?q=zzzz');
    expect(
      await screen.findByRole('heading', { name: /No encontramos tiendas/ }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Quitar los filtros' }));
    expect(await loaded()).toHaveLength(2);
  });

  it('abre ya filtrado desde un enlace con ?city=', async () => {
    renderApp('/tiendas?city=Bogot%C3%A1');
    await waitFor(() => expect(names()).toEqual(['Unilago Gaming']));
  });

  it('el filtro por centro comercial está deshabilitado como "Próximamente"', async () => {
    renderApp('/tiendas');
    await loaded();
    expect(
      screen.getByRole('combobox', { name: /Centro comercial \(próximamente\)/ }),
    ).toBeDisabled();
    expect(screen.getByText('Criterios de verificación')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Criterios de verificación/ })).toBeDisabled();
  });

  it('una tienda sin WhatsApp muestra el botón deshabilitado', async () => {
    server.use(
      http.get('*/api/v1/stores', () =>
        HttpResponse.json({ items: [{ ...publicStores[0], whatsappE164: null }] }),
      ),
    );
    renderApp('/tiendas');
    await loaded();
    expect(list().getByRole('link', { name: /WhatsApp no disponible/ })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('con 50 tiendas avisa que son las primeras 50', async () => {
    const many = Array.from({ length: 50 }, (_, i) => ({
      ...publicStores[0],
      id: `33333333-3333-4333-8333-${String(i).padStart(12, '0')}`,
      name: `Tienda ${i}`,
    }));
    server.use(http.get('*/api/v1/stores', () => HttpResponse.json({ items: many })));
    renderApp('/tiendas');
    await loaded();
    expect(list().getByText('Mostrando 50 tiendas (las primeras 50)')).toBeInTheDocument();
    expect(screen.getByText('50+')).toBeInTheDocument();
  });

  it('si la API falla muestra el error con reintento', async () => {
    server.use(http.get('*/api/v1/stores', () => HttpResponse.error()));
    renderApp('/tiendas');
    expect((await screen.findAllByRole('alert'))[0]).toHaveTextContent(/No pudimos conectar/);
    expect(screen.getAllByRole('button', { name: 'Reintentar' }).length).toBeGreaterThan(0);
  });

  it('muestra marcadores mientras carga', () => {
    renderApp('/tiendas');
    expect(screen.getByRole('status', { name: 'Cargando tiendas' })).toBeInTheDocument();
  });

  it('sin tiendas lo dice', async () => {
    server.use(http.get('*/api/v1/stores', () => HttpResponse.json({ items: [] })));
    renderApp('/tiendas');
    expect(
      await screen.findByText('Aún no hay comercios verificados para mostrar.'),
    ).toBeInTheDocument();
  });
});
