import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { demoUsers, signInMock } from '../../mocks/auth.js';
import { findOffer } from '../../mocks/data.js';
import { server } from '../../mocks/node.js';
import { renderApp } from '../../test/utils.jsx';
import { useBuildStore } from '../builder/store.js';

const [buyer, seller] = demoUsers;
const route = (path) => `*/api/v1${path}`;
const location = (router) => router.state.location.pathname + router.state.location.search;

beforeEach(() => useBuildStore.setState({ parts: {} }));

const open = async (user = buyer) => {
  signInMock(user);
  const utils = renderApp('/cuenta/armados');
  await screen.findByRole('heading', { level: 1, name: 'Mis armados guardados' });
  return { ...utils, user: userEvent.setup() };
};
const list = () => within(screen.getByRole('region', { name: 'Armados' }));
const titles = () =>
  list()
    .getAllByRole('heading', { level: 2 })
    .map((heading) => heading.textContent);
const card = (name) => within(list().getByRole('article', { name }));
/** Abrir un armado pide las piezas y ofertas de cada componente: con cobertura tarda más. */
const inAssistant = (router) =>
  waitFor(() => expect(location(router)).toBe('/armador'), { timeout: 8000 });
const loadedAll = () =>
  waitFor(() =>
    expect(screen.queryAllByRole('status', { name: /Cargando detalle/ })).toHaveLength(0),
  );

describe('Armados guardados: lista', () => {
  it('muestra los armados de la cuenta, el más reciente primero', async () => {
    await open();
    expect(
      await list().findByRole('heading', { level: 2, name: 'Setup Gaming AM5' }),
    ).toBeInTheDocument();
    expect(titles()).toEqual(['Setup Gaming AM5', 'Estación de trabajo', 'Económico para esports']);
    expect(document.title).toBe('Mis armados guardados · PcBuilder');
  });

  it('cada tarjeta muestra código, fecha, presupuesto, consumo y piezas reales', async () => {
    await open();
    await list().findByRole('heading', { level: 2, name: 'Setup Gaming AM5' });
    await loadedAll();
    const gaming = card('Setup Gaming AM5');
    expect(gaming.getByText('Código GAMEam5Set')).toBeInTheDocument();
    expect(gaming.getByText(/Modificado el 14 de noviembre de 2026/)).toBeInTheDocument();
    expect(gaming.getByText(/^\$ [\d.]+ COP$/)).toBeInTheDocument();
    expect(gaming.getByText(/^\d+ W$/)).toBeInTheDocument();
    expect(gaming.getByText(/Fuente recomendada: \d+ W/)).toBeInTheDocument();
    expect(gaming.getByText('8 de 8')).toBeInTheDocument();
    // Primeras cuatro piezas y el resto resumido
    const pieces = within(gaming.getByRole('list', { name: 'Piezas del armado' }));
    expect(pieces.getAllByRole('listitem')).toHaveLength(5);
    expect(pieces.getByText('+ 4 componentes más')).toBeInTheDocument();
  });

  it('el estado de compatibilidad sale con texto, no solo con color', async () => {
    await open();
    await list().findByRole('heading', { level: 2, name: 'Setup Gaming AM5' });
    await loadedAll();
    expect(card('Setup Gaming AM5').getByText('Compatible')).toBeInTheDocument();
    expect(card('Estación de trabajo').getByText('Con advertencias')).toBeInTheDocument();
    expect(
      card('Económico para esports').getByText('Incompatibilidad detectada'),
    ).toBeInTheDocument();
  });

  it('un armado incompatible muestra el aviso real del motor y ofrece corregirlo', async () => {
    await open();
    await list().findByRole('heading', { level: 2, name: 'Económico para esports' });
    await loadedAll();
    const broken = card('Económico para esports');
    expect(broken.getByText(/Socket CPU/i)).toBeInTheDocument();
    expect(
      broken.getByRole('button', { name: 'Corregir Económico para esports en el asistente' }),
    ).toBeInTheDocument();
    expect(
      card('Setup Gaming AM5').getByRole('button', {
        name: 'Abrir Setup Gaming AM5 en el asistente',
      }),
    ).toBeInTheDocument();
  });

  it('no inventa datos que la API no entrega', async () => {
    await open();
    await list().findByRole('heading', { level: 2, name: 'Setup Gaming AM5' });
    await loadedAll();
    expect(document.body).not.toHaveTextContent(
      /Simulación UI|scraping|Sincronización Local|Stock local verificado|Objetivo de Rendimiento|1440p/i,
    );
  });

  it('el menú de la cuenta marca "Mis armados" y muestra el total de los armados', async () => {
    await open();
    await list().findByRole('heading', { level: 2, name: 'Setup Gaming AM5' });
    const menu = within(screen.getByRole('navigation', { name: 'Menú de la cuenta' }));
    expect(menu.getByRole('link', { name: /Mis armados/ })).toHaveAttribute('aria-current', 'page');
    expect(menu.getByRole('link', { name: 'Mi perfil' })).not.toHaveAttribute('aria-current');
    const total = screen.getByText('Total de tus armados').parentElement;
    expect(total).toHaveTextContent('3 configuraciones guardadas');
  });

  it('"Nuevo ensamble" lleva al asistente', async () => {
    await open();
    expect(screen.getByRole('link', { name: /Nuevo ensamble/ })).toHaveAttribute(
      'href',
      '/armador',
    );
  });
});

describe('Armados guardados: filtro y orden', () => {
  it('los filtros por estado esperan a que carguen los detalles y luego filtran', async () => {
    const { user } = await open();
    await list().findByRole('heading', { level: 2, name: 'Setup Gaming AM5' });
    await loadedAll();
    const incompatible = list().getByRole('button', { name: /Incompatibles/ });
    await waitFor(() => expect(incompatible).toBeEnabled());
    expect(list().getByRole('button', { name: /Todos/ })).toHaveTextContent('3');

    await user.click(incompatible);
    expect(titles()).toEqual(['Económico para esports']);
    await user.click(list().getByRole('button', { name: /Con advertencias/ }));
    expect(titles()).toEqual(['Estación de trabajo']);
    await user.click(list().getByRole('button', { name: /Compatibles/ }));
    expect(titles()).toEqual(['Setup Gaming AM5']);
    await user.click(list().getByRole('button', { name: /Todos/ }));
    expect(titles()).toHaveLength(3);
  });

  it('ordena por nombre y por precio', async () => {
    const { user } = await open();
    await list().findByRole('heading', { level: 2, name: 'Setup Gaming AM5' });
    const sort = screen.getByRole('combobox', { name: 'Ordenar armados' });

    await user.selectOptions(sort, 'name');
    expect(titles()).toEqual(['Económico para esports', 'Estación de trabajo', 'Setup Gaming AM5']);

    await user.selectOptions(sort, 'price_asc');
    expect(titles()[0]).toBe('Económico para esports');
    await user.selectOptions(sort, 'price_desc');
    expect(titles()[0]).toBe('Setup Gaming AM5');
  });
});

describe('Armados guardados: compartir', () => {
  it('copia el enlace del armado y avisa', async () => {
    const { user } = await open();
    await list().findByRole('heading', { level: 2, name: 'Setup Gaming AM5' });
    await user.click(
      card('Setup Gaming AM5').getByRole('button', { name: 'Compartir Setup Gaming AM5' }),
    );
    expect(await screen.findByText('Enlace de «Setup Gaming AM5» copiado.')).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toBe(
      `${window.location.origin}/armado/GAMEam5Set`,
    );
  });
});

describe('Armados guardados: eliminar', () => {
  it('pide confirmación y, al confirmar, elimina el armado de la lista', async () => {
    const { user } = await open();
    await list().findByRole('heading', { level: 2, name: 'Económico para esports' });
    await user.click(
      card('Económico para esports').getByRole('button', {
        name: 'Eliminar Económico para esports',
      }),
    );
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText(/su enlace para compartir dejará de funcionar/)).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Eliminar armado' }));

    expect(await screen.findByText('«Económico para esports» se eliminó.')).toBeInTheDocument();
    await waitFor(() => expect(titles()).not.toContain('Económico para esports'));
    expect(titles()).toHaveLength(2);
  });

  it('cancelar no elimina nada', async () => {
    const { user } = await open();
    await list().findByRole('heading', { level: 2, name: 'Setup Gaming AM5' });
    await user.click(
      card('Setup Gaming AM5').getByRole('button', { name: 'Eliminar Setup Gaming AM5' }),
    );
    const dialog = within(await screen.findByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: 'Cancelar' }));
    expect(titles()).toHaveLength(3);
  });

  it('si el servidor falla muestra el error y deja reintentar', async () => {
    server.use(
      http.delete(route('/me/builds/:id'), () =>
        HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: 'x', details: null, requestId: 'r' },
          { status: 500 },
        ),
      ),
    );
    const { user } = await open();
    await list().findByRole('heading', { level: 2, name: 'Setup Gaming AM5' });
    await user.click(
      card('Setup Gaming AM5').getByRole('button', { name: 'Eliminar Setup Gaming AM5' }),
    );
    const dialog = within(await screen.findByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: 'Eliminar armado' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent('Ocurrió un error inesperado');
    expect(dialog.getByRole('button', { name: 'Eliminar armado' })).toBeEnabled();
    expect(titles()).toHaveLength(3);
  });
});

describe('Armados guardados: abrir en el asistente', () => {
  it('carga las piezas en el asistente y lleva a /armador', async () => {
    const { user, router } = await open();
    await list().findByRole('heading', { level: 2, name: 'Setup Gaming AM5' });
    await loadedAll();
    await user.click(
      card('Setup Gaming AM5').getByRole('button', {
        name: 'Abrir Setup Gaming AM5 en el asistente',
      }),
    );
    await inAssistant(router);
    const parts = useBuildStore.getState().parts;
    expect(Object.keys(parts).sort()).toEqual(
      ['case', 'cooler', 'cpu', 'gpu', 'motherboard', 'psu', 'ram', 'storage'].sort(),
    );
    expect(parts.cpu.component.specs.socket).toBeTruthy();
    expect(parts.cpu.offerId).toBe(findOffer('AMD Ryzen 7 7800X3D').offerId);
    expect(
      await screen.findByText(
        /Abrimos «Setup Gaming AM5» en el asistente\./,
        {},
        { timeout: 5000 },
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Arma tu PC' }, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it('si ya hay piezas en el asistente pide confirmar el reemplazo', async () => {
    useBuildStore.getState().setPart(findOffer('Intel Core i5 12400F'));
    const { user, router } = await open();
    await list().findByRole('heading', { level: 2, name: 'Setup Gaming AM5' });
    await loadedAll();
    await user.click(
      card('Setup Gaming AM5').getByRole('button', {
        name: 'Abrir Setup Gaming AM5 en el asistente',
      }),
    );
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText(/las reemplazará/)).toBeInTheDocument();
    expect(location(router)).toBe('/cuenta/armados');
    expect(useBuildStore.getState().parts.cpu.component.displayName).toBe('Intel Core i5 12400F');

    await user.click(dialog.getByRole('button', { name: 'Reemplazar y abrir' }));
    await inAssistant(router);
    expect(useBuildStore.getState().parts.cpu.component.displayName).toBe('AMD Ryzen 7 7800X3D');
  });

  it('cancelar el reemplazo conserva el armado del asistente', async () => {
    useBuildStore.getState().setPart(findOffer('Intel Core i5 12400F'));
    const { user, router } = await open();
    await list().findByRole('heading', { level: 2, name: 'Setup Gaming AM5' });
    await loadedAll();
    await user.click(
      card('Setup Gaming AM5').getByRole('button', {
        name: 'Abrir Setup Gaming AM5 en el asistente',
      }),
    );
    const dialog = within(await screen.findByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: 'Cancelar' }));
    expect(location(router)).toBe('/cuenta/armados');
    expect(useBuildStore.getState().parts.cpu.component.displayName).toBe('Intel Core i5 12400F');
  });

  it('si una oferta guardada ya no está usa la más barata y lo avisa', async () => {
    // La oferta guardada del procesador desaparece: solo queda la de otra tienda
    const saved = findOffer('AMD Ryzen 7 7800X3D');
    server.use(
      http.get(route('/offers'), ({ request }) => {
        const params = new URL(request.url).searchParams;
        if (params.get('componentId') !== saved.component.id) return undefined;
        const { component, ...rest } = saved;
        return HttpResponse.json({
          items: [
            {
              ...rest,
              offerId: 'a0000000-0000-4000-8000-0000000000aa',
              priceCop: 1_750_000,
              component: { ...component, specs: undefined },
            },
          ],
          nextCursor: null,
        });
      }),
    );
    const { user, router } = await open();
    await list().findByRole('heading', { level: 2, name: 'Setup Gaming AM5' });
    await loadedAll();
    await user.click(
      card('Setup Gaming AM5').getByRole('button', {
        name: 'Abrir Setup Gaming AM5 en el asistente',
      }),
    );
    await inAssistant(router);
    expect(useBuildStore.getState().parts.cpu.priceCop).toBe(1_750_000);
    expect(
      await screen.findByText(/usa la oferta más barata/, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it('una pieza sin ofertas no se carga y se avisa cuál es', async () => {
    const gpu = findOffer('RTX 4070 SUPER').component;
    server.use(
      http.get(route('/offers'), ({ request }) =>
        new URL(request.url).searchParams.get('componentId') === gpu.id
          ? HttpResponse.json({ items: [], nextCursor: null })
          : undefined,
      ),
    );
    const { user, router } = await open();
    await list().findByRole('heading', { level: 2, name: 'Setup Gaming AM5' });
    await loadedAll();
    await user.click(
      card('Setup Gaming AM5').getByRole('button', {
        name: 'Abrir Setup Gaming AM5 en el asistente',
      }),
    );
    await inAssistant(router);
    expect(useBuildStore.getState().parts.gpu).toBeUndefined();
    expect(Object.keys(useBuildStore.getState().parts)).toHaveLength(7);
    expect(
      await screen.findByText(/1 pieza no se cargó/, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it('si ninguna pieza tiene ofertas no abre el asistente y lo avisa', async () => {
    server.use(
      http.get(route('/offers'), () => HttpResponse.json({ items: [], nextCursor: null })),
    );
    const { user, router } = await open();
    await list().findByRole('heading', { level: 2, name: 'Setup Gaming AM5' });
    await loadedAll();
    await user.click(
      card('Setup Gaming AM5').getByRole('button', {
        name: 'Abrir Setup Gaming AM5 en el asistente',
      }),
    );
    expect(await screen.findByText(/no se pudo abrir/)).toBeInTheDocument();
    expect(location(router)).toBe('/cuenta/armados');
    expect(useBuildStore.getState().parts).toEqual({});
  });
});

describe('Armados guardados: estados', () => {
  it('una cuenta sin armados muestra el estado vacío con salida al asistente', async () => {
    await open(seller);
    expect(
      await screen.findByRole('heading', { name: 'Aún no tienes armados guardados' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Crear un armado' })).toHaveAttribute(
      'href',
      '/armador',
    );
    expect(screen.queryByRole('combobox', { name: 'Ordenar armados' })).not.toBeInTheDocument();
  });

  it('si falla la lista muestra el error con reintento', async () => {
    server.use(
      http.get(route('/me/builds'), () =>
        HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: 'x', details: null, requestId: 'r' },
          { status: 500 },
        ),
      ),
    );
    await open();
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('si falla el detalle de un armado el resto sigue y se puede reintentar', async () => {
    server.use(
      http.get(route('/builds/GAMEam5Set'), () =>
        HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: 'x', details: null, requestId: 'r' },
          { status: 500 },
        ),
      ),
    );
    await open();
    await list().findByRole('heading', { level: 2, name: 'Setup Gaming AM5' });
    const gaming = card('Setup Gaming AM5');
    expect(
      await gaming.findByText('No pudimos cargar el detalle de este armado.'),
    ).toBeInTheDocument();
    expect(gaming.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
    expect(
      gaming.getByRole('button', { name: 'Abrir Setup Gaming AM5 en el asistente' }),
    ).toBeDisabled();
    expect(await card('Estación de trabajo').findByText('Con advertencias')).toBeInTheDocument();
  });

  it('mientras cargan muestra marcadores', async () => {
    signInMock(buyer);
    renderApp('/cuenta/armados');
    expect(await screen.findByRole('status', { name: 'Cargando armados' })).toBeInTheDocument();
  });

  it('sin sesión lleva a ingresar', async () => {
    const { router } = renderApp('/cuenta/armados');
    await screen.findByRole('heading', { level: 1, name: 'Ingresar a tu cuenta' });
    expect(location(router)).toBe('/ingresar?next=%2Fcuenta%2Farmados');
  });
});
