import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { offers as allOffers, publicStores } from '../../mocks/data.js';
import { server } from '../../mocks/node.js';
import { renderApp } from '../../test/utils.jsx';
import { useBuildStore } from '../builder/store.js';

beforeEach(() => useBuildStore.setState({ parts: {} }));

const store = publicStores.find((s) => s.name === 'TecnoPasarela Cali');
const storeOffers = allOffers.filter((o) => o.store.id === store.id);

const open = async (path = `/tiendas/${store.id}`) => {
  const utils = renderApp(path);
  await screen.findByRole('heading', { level: 1, name: store.name });
  return utils;
};
const catalog = () => within(screen.getByRole('region', { name: 'Ofertas de la tienda' }));
const cards = () => catalog().findAllByRole('article');
const prices = () =>
  catalog()
    .getAllByText(/^\$ [\d.]+ COP$/)
    .map((el) => Number(el.textContent.replace(/\D/g, '')));
const search = (router) => new URLSearchParams(router.state.location.search);

describe('Perfil de tienda: cabecera', () => {
  it('muestra nombre, verificación, ubicación y número de WhatsApp reales', async () => {
    await open();
    expect(document.title).toBe('TecnoPasarela Cali · PcBuilder');
    expect(screen.getAllByText('Comercio verificado').length).toBeGreaterThan(0);
    expect(screen.getByText(store.description)).toBeInTheDocument();
    expect(screen.getAllByText(store.commercialCenter).length).toBeGreaterThan(0);
    expect(screen.getByText(store.address)).toBeInTheDocument();
    expect(screen.getByText('+57 300 000 0001')).toBeInTheDocument();
    const summary = within(screen.getByRole('complementary', { name: 'Resumen de la tienda' }));
    expect(summary.getByText(String(store.offersCount))).toBeInTheDocument();
    expect(summary.getByText('ofertas activas')).toBeInTheDocument();
  });

  it('el breadcrumb vuelve al directorio', async () => {
    await open();
    const nav = within(screen.getByRole('navigation', { name: 'Ruta de navegación' }));
    expect(nav.getByRole('link', { name: 'Tiendas' })).toHaveAttribute('href', '/tiendas');
    expect(nav.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/');
  });

  it('el botón de WhatsApp abre el chat de la tienda', async () => {
    await open();
    const link = screen.getByRole('link', { name: `Escribir a ${store.name} por WhatsApp` });
    expect(link.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/573000000001\?text=/);
  });

  it('compartir el perfil está deshabilitado como "Próximamente"', async () => {
    await open();
    expect(screen.getByRole('button', { name: /Compartir perfil/ })).toBeDisabled();
  });

  it('no inventa datos que la API no entrega', async () => {
    await open();
    expect(document.body).not.toHaveTextContent(
      /NIT|Horario|Medios de pago|Índice de confiabilidad|DIAN|respuesta en/i,
    );
  });

  it('una tienda sin WhatsApp muestra el botón deshabilitado y "No disponible"', async () => {
    server.use(
      http.get('*/api/v1/stores', () =>
        HttpResponse.json({ items: [{ ...store, whatsappE164: null }] }),
      ),
    );
    await open();
    expect(
      screen.getByRole('link', { name: `WhatsApp no disponible para ${store.name}` }),
    ).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByText('No disponible')).toBeInTheDocument();
  });
});

describe('Perfil de tienda: ofertas', () => {
  it('lista solo las ofertas de esa tienda', async () => {
    await open();
    const found = await cards();
    expect(found).toHaveLength(storeOffers.length);
    for (const card of found) {
      expect(within(card).getByText(store.name)).toBeInTheDocument();
    }
    expect(catalog().getByText(`Mostrando ${storeOffers.length} ofertas`)).toBeInTheDocument();
  });

  it('filtra por categoría y lo guarda en la URL', async () => {
    const user = userEvent.setup();
    const { router } = await open();
    await cards();

    await user.click(catalog().getByRole('button', { name: 'Procesadores' }));
    await waitFor(() => expect(search(router).get('category')).toBe('cpu'));
    const cpus = storeOffers.filter((o) => o.component.category === 'cpu');
    await waitFor(async () => expect(await cards()).toHaveLength(cpus.length));
    expect(catalog().getByRole('button', { name: 'Procesadores' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(catalog().getByRole('button', { name: 'Todas' }));
    await waitFor(() => expect(search(router).has('category')).toBe(false));
  });

  it('ordena por menor y mayor precio', async () => {
    const user = userEvent.setup();
    await open();
    await cards();
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Ordenar ofertas de la tienda' }),
      'price_asc',
    );
    await waitFor(() => {
      const list = prices();
      expect(list).toEqual([...list].sort((a, b) => a - b));
    });
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Ordenar ofertas de la tienda' }),
      'price_desc',
    );
    await waitFor(() => {
      const list = prices();
      expect(list).toEqual([...list].sort((a, b) => b - a));
    });
  });

  it('busca dentro del inventario de la tienda', async () => {
    const user = userEvent.setup();
    const { router } = await open();
    await cards();
    await user.type(
      screen.getByRole('searchbox', { name: 'Buscar en el inventario de la tienda' }),
      'ryzen',
    );
    await waitFor(() => expect(search(router).get('q')).toBe('ryzen'));
    await waitFor(async () => {
      const found = await cards();
      expect(found.length).toBeGreaterThan(0);
      for (const card of found) expect(card).toHaveTextContent(/ryzen/i);
    });
  });

  it('sin coincidencias ofrece quitar los filtros', async () => {
    const user = userEvent.setup();
    await open(`/tiendas/${store.id}?q=zzzz`);
    expect(
      await screen.findByRole('heading', { name: /no tiene ofertas con esos filtros/ }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Quitar los filtros' }));
    expect(await cards()).toHaveLength(storeOffers.length);
  });

  it('una tienda sin ofertas lo dice y ofrece ver otras tiendas', async () => {
    server.use(
      http.get('*/api/v1/offers', () => HttpResponse.json({ items: [], nextCursor: null })),
    );
    await open();
    expect(
      await screen.findByRole('heading', { name: 'Esta tienda no tiene ofertas activas' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver otras tiendas' })).toHaveAttribute(
      'href',
      '/tiendas',
    );
  });

  it('"Cargar más" trae la siguiente página', async () => {
    const user = userEvent.setup();
    const [first, second] = [storeOffers[0], storeOffers[1]];
    server.use(
      http.get('*/api/v1/offers', ({ request }) => {
        const next = new URL(request.url).searchParams.get('cursor');
        return HttpResponse.json(
          next
            ? { items: [second], nextCursor: null }
            : { items: [first], nextCursor: 'siguiente' },
        );
      }),
    );
    await open();
    expect(await cards()).toHaveLength(1);
    expect(catalog().getByText('Mostrando 1 oferta (hay más)')).toBeInTheDocument();
    await user.click(catalog().getByRole('button', { name: 'Cargar más ofertas' }));
    await waitFor(async () => expect(await cards()).toHaveLength(2));
    expect(catalog().queryByRole('button', { name: 'Cargar más ofertas' })).not.toBeInTheDocument();
  });

  it('si fallan las ofertas muestra el error con reintento sin tumbar el perfil', async () => {
    server.use(http.get('*/api/v1/offers', () => HttpResponse.error()));
    await open();
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: store.name })).toBeInTheDocument();
  });

  it('"Al ensamble" agrega la pieza al armado y avisa', async () => {
    const user = userEvent.setup();
    await open();
    const [card] = await cards();
    await user.click(within(card).getByRole('button', { name: /Agregar al armado/ }));
    expect(Object.keys(useBuildStore.getState().parts)).toHaveLength(1);
    expect(screen.getByText(/se agregó a tu armado/)).toBeInTheDocument();
  });
});

describe('Perfil de tienda: estados', () => {
  it('una tienda inexistente muestra una pantalla amable', async () => {
    renderApp('/tiendas/99999999-9999-4999-8999-999999999999');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Esta tienda no está disponible' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver todas las tiendas' })).toHaveAttribute(
      'href',
      '/tiendas',
    );
  });

  it('un fallo de red muestra el error con reintento', async () => {
    server.use(http.get('*/api/v1/stores', () => HttpResponse.error()));
    renderApp(`/tiendas/${store.id}`);
    expect(
      await screen.findByRole('button', { name: 'Reintentar' }, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it('mientras carga muestra un marcador', () => {
    renderApp(`/tiendas/${store.id}`);
    expect(screen.getByRole('status', { name: 'Cargando tienda' })).toBeInTheDocument();
  });
});
