import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { demoUsers, signInMock } from '../../mocks/auth.js';
import { components, findOffer } from '../../mocks/data.js';
import { server } from '../../mocks/node.js';
import { renderApp } from '../../test/utils.jsx';
import { useBuildStore } from '../builder/store.js';

const [buyer, seller] = demoUsers;
const route = (path) => `*/api/v1${path}`;
const location = (router) => router.state.location.pathname + router.state.location.search;

beforeEach(() => useBuildStore.setState({ parts: {} }));

const open = async (user = buyer) => {
  signInMock(user);
  const utils = renderApp('/cuenta/favoritos');
  await screen.findByRole('heading', { level: 1, name: 'Mis componentes favoritos' });
  return { ...utils, user: userEvent.setup() };
};
const list = () => within(screen.getByRole('region', { name: 'Favoritos' }));
const names = () =>
  list()
    .getAllByRole('heading', { level: 2 })
    .map((heading) => heading.textContent);
const cardOf = (partial) =>
  within(
    list()
      .getAllByRole('article')
      .find((article) => article.textContent.includes(partial)),
  );
const loaded = () => list().findAllByRole('heading', { level: 2 });

const wish = (partial, extra = {}) => {
  const component = components.find((item) => item.displayName.includes(partial));
  return {
    componentId: component.id,
    category: component.category,
    brand: component.brand,
    model: component.model,
    displayName: component.displayName,
    minPriceCop: 100000,
    offersCount: 1,
    addedAt: '2026-11-01T10:00:00.000Z',
    ...extra,
  };
};

describe('Favoritos: lista', () => {
  it('muestra los favoritos de la cuenta, el más reciente primero', async () => {
    await open();
    expect(await loaded()).toHaveLength(3);
    expect(names().map((name) => name.split(' ').slice(0, 3).join(' '))).toEqual([
      'AMD Ryzen 7',
      'Asus DUAL GeForce',
      'Corsair 4000D Airflow',
    ]);
    expect(document.title).toBe('Mis favoritos · PcBuilder');
  });

  it('cada tarjeta muestra categoría, marca y modelo, ofertas y precio desde', async () => {
    await open();
    await loaded();
    const ryzen = cardOf('Ryzen 7 7800X3D');
    expect(ryzen.getByText('CPU')).toBeInTheDocument();
    expect(ryzen.getByText(/AMD • 7800X3D|AMD • .*/)).toBeInTheDocument();
    expect(ryzen.getByText('1 oferta en tiendas verificadas')).toBeInTheDocument();
    expect(ryzen.getByText('Desde')).toBeInTheDocument();
    expect(ryzen.getByText('$ 1.699.000 COP')).toBeInTheDocument();
    for (const link of ryzen.getAllByRole('link', { name: /Ryzen 7 7800X3D/ })) {
      expect(link).toHaveAttribute('href', expect.stringMatching(/^\/producto\//));
    }
  });

  it('el menú marca "Favoritos" y el resumen cuenta las piezas con ofertas', async () => {
    await open();
    await loaded();
    const menu = within(screen.getByRole('navigation', { name: 'Menú de la cuenta' }));
    expect(menu.getByRole('link', { name: /Favoritos/ })).toHaveAttribute('aria-current', 'page');
    const summary = screen.getByText('Resumen de favoritos').parentElement;
    expect(summary).toHaveTextContent('3 piezas');
    expect(summary).toHaveTextContent('3 de 3 con ofertas hoy');
  });

  it('lo guardado desde la ficha del producto aparece en la lista', async () => {
    const user = userEvent.setup();
    signInMock(buyer);
    const ryzen5 = findOffer('AMD Ryzen 5 7600').component;
    renderApp(`/producto/${ryzen5.id}`);
    const [heart] = await screen.findAllByRole('button', {
      name: `Guardar ${ryzen5.displayName} en favoritos`,
    });
    await waitFor(() => expect(heart).toHaveAttribute('aria-pressed', 'false'));
    await user.click(heart);
    await user.click(await screen.findByRole('link', { name: 'Ver favoritos' }));
    expect(
      await list().findByRole('heading', { level: 2, name: ryzen5.displayName }),
    ).toBeInTheDocument();
    expect(names()).toHaveLength(4);
    expect(names()[0]).toBe(ryzen5.displayName); // el más reciente primero
  });

  it('no inventa datos que la API no entrega', async () => {
    await open();
    await loaded();
    expect(document.body).not.toHaveTextContent(
      /Simulador|Telemetría|COP Index|Ahorro potencial|Stock en mostrador|Bajó|AM5 Ready|Mejor precio en/i,
    );
  });

  it('"Gestionar alertas" está deshabilitado como "Próximamente"', async () => {
    await open();
    expect(screen.getByRole('button', { name: /Gestionar alertas/ })).toBeDisabled();
  });
});

describe('Favoritos: buscar, filtrar y ordenar', () => {
  it('busca por nombre o marca', async () => {
    const { user } = await open();
    await loaded();
    await user.type(screen.getByRole('searchbox', { name: 'Buscar en tus favoritos' }), 'corsair');
    await waitFor(() => expect(names()).toHaveLength(1));
    expect(names()[0]).toMatch(/Corsair/);
  });

  it('filtra por categoría con los conteos de la lista', async () => {
    const { user } = await open();
    await loaded();
    const group = within(screen.getByRole('group', { name: 'Filtrar por categoría' }));
    expect(group.getByRole('button', { name: /Todos/ })).toHaveTextContent('3');
    await user.click(group.getByRole('button', { name: /Procesadores/ }));
    expect(names()).toHaveLength(1);
    expect(group.getByRole('button', { name: /Procesadores/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await user.click(group.getByRole('button', { name: /Todos/ }));
    expect(names()).toHaveLength(3);
  });

  it('ordena por nombre y por menor precio', async () => {
    const { user } = await open();
    await loaded();
    const sort = screen.getByRole('combobox', { name: 'Ordenar favoritos' });
    await user.selectOptions(sort, 'name');
    expect(names()).toEqual([...names()].sort((a, b) => a.localeCompare(b, 'es')));
    await user.selectOptions(sort, 'price_asc');
    // La caja de 429.000 es la más barata de las tres
    expect(names()[0]).toMatch(/Corsair 4000D/);
  });

  it('si nada coincide ofrece quitar los filtros', async () => {
    const { user } = await open();
    await loaded();
    await user.type(screen.getByRole('searchbox', { name: 'Buscar en tus favoritos' }), 'zzzz');
    expect(
      await screen.findByRole('heading', { name: 'Ningún favorito coincide' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Quitar los filtros' }));
    await waitFor(() => expect(names()).toHaveLength(3));
  });
});

describe('Favoritos: quitar un favorito', () => {
  it('el corazón de la tarjeta lo quita de la lista y "Deshacer" lo devuelve', async () => {
    const { user } = await open();
    await loaded();
    await user.click(
      cardOf('Corsair 4000D').getByRole('button', { name: /Guardar Corsair 4000D.* en favoritos/ }),
    );
    await waitFor(() => expect(names()).toHaveLength(2));
    expect(await screen.findByText(/se quitó de tus favoritos/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Deshacer' }));
    await waitFor(() => expect(names()).toHaveLength(3));
  });
});

describe('Favoritos: agregar al armado', () => {
  it('agrega la oferta más barata al asistente y avisa', async () => {
    const { user } = await open();
    await loaded();
    await user.click(
      cardOf('Ryzen 7 7800X3D').getByRole('button', {
        name: /Agregar al armado AMD Ryzen 7 7800X3D/,
      }),
    );
    expect(
      await screen.findByText('AMD Ryzen 7 7800X3D se agregó a tu armado.', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver armador' })).toHaveAttribute('href', '/armador');
    const part = useBuildStore.getState().parts.cpu;
    expect(part.offerId).toBe(findOffer('AMD Ryzen 7 7800X3D').offerId);
    expect(part.component.specs.socket).toBeTruthy();
    expect(cardOf('Ryzen 7 7800X3D').getByText('En tu armado')).toBeInTheDocument();
  });

  it('si ya hay otra pieza de la categoría ofrece reemplazarla', async () => {
    useBuildStore.getState().setPart(findOffer('AMD Ryzen 5 7600'));
    const { user } = await open();
    await loaded();
    const button = cardOf('Ryzen 7 7800X3D').getByRole('button', {
      name: /Cambiar en el armado por AMD Ryzen 7 7800X3D/,
    });
    expect(button).toHaveTextContent('Reemplazar en el armado');
    await user.click(button);
    expect(
      await screen.findByText(/reemplazó a AMD Ryzen 5 7600/, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it('una pieza sin ofertas tiene el botón deshabilitado y sin precio', async () => {
    server.use(
      http.get(route('/me/wishlist'), () =>
        HttpResponse.json({
          items: [wish('Ryzen 5 5600', { minPriceCop: null, offersCount: 0 })],
        }),
      ),
    );
    await open();
    await loaded();
    const only = cardOf('Ryzen 5 5600');
    expect(only.getByRole('button', { name: /Agregar al armado/ })).toBeDisabled();
    expect(only.getByText('Sin ofertas hoy')).toBeInTheDocument();
    expect(only.getByText('Sin ofertas por ahora')).toBeInTheDocument();
    expect(only.getByText('—')).toBeInTheDocument();
  });

  it('si las ofertas desaparecieron avisa y no cambia el armado', async () => {
    server.use(
      http.get(route('/offers'), () => HttpResponse.json({ items: [], nextCursor: null })),
    );
    const { user } = await open();
    await loaded();
    await user.click(
      cardOf('Ryzen 7 7800X3D').getByRole('button', {
        name: /Agregar al armado AMD Ryzen 7 7800X3D/,
      }),
    );
    expect(
      await screen.findByText(/no tiene ofertas vigentes hoy/, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(useBuildStore.getState().parts).toEqual({});
  });
});

describe('Favoritos: limpiar la lista', () => {
  it('pide confirmación y vacía la lista', async () => {
    const { user } = await open();
    await loaded();
    await user.click(screen.getByRole('button', { name: /Limpiar lista/ }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText(/Se quitarán 3 piezas/)).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Vaciar lista' }));
    expect(await screen.findByText('Tu lista de favoritos quedó vacía.')).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { name: 'Aún no tienes favoritos' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Limpiar lista/ })).toBeDisabled();
  });

  it('cancelar no quita nada', async () => {
    const { user } = await open();
    await loaded();
    await user.click(screen.getByRole('button', { name: /Limpiar lista/ }));
    const dialog = within(await screen.findByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: 'Cancelar' }));
    expect(names()).toHaveLength(3);
  });

  it('si algún borrado falla avisa cuántos se quitaron', async () => {
    const failing = components.find((item) => item.displayName.includes('RTX 4070 SUPER')).id;
    server.use(
      http.delete(route('/me/wishlist/:componentId'), ({ params }) =>
        params.componentId === failing
          ? HttpResponse.json(
              { code: 'INTERNAL_ERROR', message: 'x', details: null, requestId: 'r' },
              { status: 500 },
            )
          : new HttpResponse(null, { status: 204 }),
      ),
    );
    const { user } = await open();
    await loaded();
    await user.click(screen.getByRole('button', { name: /Limpiar lista/ }));
    const dialog = within(await screen.findByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: 'Vaciar lista' }));
    expect(await screen.findByText(/Se quitaron 2 de 3 favoritos/)).toBeInTheDocument();
  });
});

describe('Favoritos: estados', () => {
  it('una cuenta sin favoritos muestra el estado vacío con salida al catálogo', async () => {
    await open(seller);
    expect(
      await screen.findByRole('heading', { name: 'Aún no tienes favoritos' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Explorar el catálogo' })).toHaveAttribute(
      'href',
      '/catalogo',
    );
    expect(screen.queryByRole('combobox', { name: 'Ordenar favoritos' })).not.toBeInTheDocument();
  });

  it('si falla la lista muestra el error con reintento', async () => {
    server.use(
      http.get(route('/me/wishlist'), () =>
        HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: 'x', details: null, requestId: 'r' },
          { status: 500 },
        ),
      ),
    );
    await open();
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('mientras carga muestra marcadores', async () => {
    signInMock(buyer);
    renderApp('/cuenta/favoritos');
    expect(await screen.findByRole('status', { name: 'Cargando favoritos' })).toBeInTheDocument();
  });

  it('sin sesión lleva a ingresar', async () => {
    const { router } = renderApp('/cuenta/favoritos');
    await screen.findByRole('heading', { level: 1, name: 'Ingresar a tu cuenta' });
    expect(location(router)).toBe('/ingresar?next=%2Fcuenta%2Ffavoritos');
  });
});
