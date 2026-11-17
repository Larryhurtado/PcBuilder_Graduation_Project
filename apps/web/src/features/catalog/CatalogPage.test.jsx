import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { server } from '../../mocks/node.js';
import { renderApp } from '../../test/utils.jsx';
import { useBuildStore } from '../builder/store.js';

beforeEach(() => useBuildStore.setState({ parts: {} }));

const results = () => within(screen.getByRole('region', { name: 'Resultados' }));
const names = () =>
  results()
    .getAllByRole('heading', { level: 3 })
    .map((h) => h.textContent);
const prices = () =>
  results()
    .getAllByText(/^\$ [\d.]+ COP$/)
    .map((el) => Number(el.textContent.replace(/\D/g, '')));
const search = (router) => new URLSearchParams(router.state.location.search);

/** Espera a que lleguen las ofertas del catálogo. */
const loaded = () => results().findAllByRole('heading', { level: 3 });

describe('Catálogo: resultados', () => {
  it('muestra 12 ofertas y "Cargar más" trae el resto', async () => {
    const user = userEvent.setup();
    renderApp('/catalogo');
    expect(await loaded()).toHaveLength(12);
    expect(results().getByText('Mostrando 12 ofertas (hay más)')).toBeInTheDocument();

    await user.click(results().getByRole('button', { name: 'Cargar más ofertas' }));
    await waitFor(() => expect(names()).toHaveLength(22));
    expect(results().queryByRole('button', { name: 'Cargar más ofertas' })).not.toBeInTheDocument();
    expect(results().getByText('Mostrando 22 ofertas')).toBeInTheDocument();
  });

  it('cada tarjeta muestra nombre, precio en COP, garantía, tienda, ciudad y datos técnicos', async () => {
    renderApp('/catalogo');
    await loaded();
    const card = within(results().getAllByRole('article')[0]); // la más reciente
    expect(card.getByRole('heading', { name: 'AMD Ryzen 5 7600' })).toBeInTheDocument();
    expect(card.getByText('$ 849.000 COP')).toBeInTheDocument();
    expect(card.getByText('Garantía 12 meses')).toBeInTheDocument();
    expect(card.getByText('TecnoPasarela Cali')).toBeInTheDocument();
    expect(card.getByText('Cali • C.C. Pasarela')).toBeInTheDocument();
    expect(card.getByText('TDP 65 W')).toBeInTheDocument();
    expect(card.getByRole('link', { name: 'AMD Ryzen 5 7600' })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/producto\//),
    );
    expect(card.getByRole('link', { name: 'WhatsApp' }).getAttribute('href')).toMatch(
      /^https:\/\/wa\.me\/573000000001\?text=/,
    );
  });

  it('no afirma lo que la plataforma no sabe: stock, precio anterior o sincronización en vivo', async () => {
    renderApp('/catalogo');
    await loaded();
    expect(document.body).not.toHaveTextContent(/Stock:/);
    expect(document.body).not.toHaveTextContent(/sincronización en vivo/i);
    expect(document.body).not.toHaveTextContent(/tiendas auditadas/i);
    expect(document.body).not.toHaveTextContent(/Medellín|Monterrey/);
  });

  it('sin sesión, el corazón de cada tarjeta lleva a ingresar y vuelve al catálogo', async () => {
    renderApp('/catalogo');
    await loaded();
    const hearts = await results().findAllByRole('link', {
      name: /^Ingresa para guardar .* en favoritos$/,
    });
    expect(hearts).toHaveLength(12);
    expect(hearts[0]).toHaveAttribute('href', '/ingresar?next=%2Fcatalogo');
  });

  it('la vista compacta muestra las mismas ofertas en filas', async () => {
    const user = userEvent.setup();
    renderApp('/catalogo');
    await loaded();
    const before = names();

    await user.click(screen.getByRole('button', { name: 'Vista compacta' }));
    expect(screen.getByRole('button', { name: 'Vista compacta' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(names()).toEqual(before);

    await user.click(screen.getByRole('button', { name: 'Vista cuadrícula' }));
    expect(screen.getByRole('button', { name: 'Vista cuadrícula' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });
});

describe('Catálogo: búsqueda y orden', () => {
  it('busca al dejar de escribir y lo deja en la URL', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/catalogo');
    await loaded();

    await user.type(screen.getByRole('searchbox', { name: 'Buscar en el catálogo' }), 'x3d');
    await waitFor(() => expect(names()).toEqual(['AMD Ryzen 7 7800X3D']));
    expect(search(router).get('q')).toBe('x3d');
  });

  it('una búsqueda que viene en la URL (barra superior, enlaces) llena el campo y filtra', async () => {
    renderApp('/catalogo?q=ryzen');
    await loaded();
    expect(screen.getByRole('searchbox', { name: 'Buscar en el catálogo' })).toHaveValue('ryzen');
    expect(names().every((name) => /Ryzen/.test(name))).toBe(true);
  });

  it('la búsqueda de la barra superior lleva al catálogo con los resultados', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/');
    await user.type(screen.getByRole('searchbox', { name: /buscar componentes/i }), 'rtx{Enter}');
    expect(router.state.location.pathname).toBe('/catalogo');
    await waitFor(() => expect(names().every((name) => /RTX/.test(name))).toBe(true));
    expect(names()).toHaveLength(2);
  });

  it('ordena por menor y mayor precio y lo conserva en la URL', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/catalogo');
    await loaded();

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Ordenar resultados' }),
      'price_asc',
    );
    await waitFor(() => expect(prices()[0]).toBe(99000));
    expect(prices()).toEqual([...prices()].sort((a, b) => a - b));
    expect(search(router).get('sort')).toBe('price_asc');

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Ordenar resultados' }),
      'price_desc',
    );
    await waitFor(() => expect(prices()[0]).toBe(3050000));
  });
});

describe('Catálogo: filtros', () => {
  it('filtra por categoría y muestra los atributos técnicos de esa categoría', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/catalogo');
    await loaded();
    expect(screen.getByText(/Elige una categoría para filtrar/)).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: 'Procesadores' }));
    await waitFor(() => expect(names()).toHaveLength(5));
    expect(search(router).get('category')).toBe('cpu');
    expect(
      screen.getByRole('button', { name: 'Quitar filtro: Categoría: Procesadores' }),
    ).toBeInTheDocument();

    const socket = screen.getByRole('group', { name: 'Socket de la placa base' });
    await user.click(within(socket).getByRole('button', { name: 'AM5' }));
    await waitFor(() => expect(names()).toHaveLength(3));
    expect(names().every((name) => /Ryzen (5 7600|7 7800X3D)/.test(name))).toBe(true);
    expect(within(socket).getByRole('button', { name: 'AM5' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('cambiar de categoría descarta los atributos de la anterior', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/catalogo?category=cpu&socket=AM5');
    await waitFor(() => expect(names()).toHaveLength(3));

    await user.click(screen.getByRole('radio', { name: 'Memoria RAM' }));
    await waitFor(() => expect(names()).toHaveLength(3));
    expect(search(router).has('socket')).toBe(false);
  });

  it('acepta los enlaces del inicio (?category=)', async () => {
    renderApp('/catalogo?category=gpu');
    await waitFor(() => expect(names()).toHaveLength(2));
    expect(screen.getByRole('radio', { name: 'Tarjetas gráficas' })).toBeChecked();
  });

  it('filtra por rango de precio al salir del campo', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/catalogo');
    await loaded();

    const min = screen.getByRole('textbox', { name: 'Precio mínimo en pesos colombianos' });
    await user.type(min, '500000');
    expect(min).toHaveValue('500.000');
    await user.tab();

    await waitFor(() => expect(prices().every((price) => price >= 500000)).toBe(true));
    expect(search(router).get('minPrice')).toBe('500000');
    expect(
      screen.getByRole('button', { name: 'Quitar filtro: Precio: Desde $ 500.000' }),
    ).toBeInTheDocument();
  });

  it('rechaza un rango de precio invertido sin llamar a la API', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/catalogo');
    await loaded();

    await user.type(
      screen.getByRole('textbox', { name: 'Precio mínimo en pesos colombianos' }),
      '900000',
    );
    await user.tab(); // aplica el mínimo
    await user.type(
      screen.getByRole('textbox', { name: 'Precio máximo en pesos colombianos' }),
      '100000',
    );
    await user.tab();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El mínimo no puede ser mayor que el máximo.',
    );
    expect(search(router).has('maxPrice')).toBe(false);
  });

  it('filtra por condición y siempre deja una marcada', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/catalogo');
    await loaded();

    await user.click(screen.getByRole('checkbox', { name: 'Nuevo' }));
    await waitFor(() => expect(names()).toHaveLength(1));
    expect(names()[0]).toMatch(/Kingston HyperX/);
    expect(search(router).get('condition')).toBe('used');

    await user.click(screen.getByRole('checkbox', { name: 'Usado' })); // es la única marcada
    expect(screen.getByRole('checkbox', { name: 'Usado' })).toBeChecked();
    expect(search(router).get('condition')).toBe('used');
  });

  it('filtra por ciudad con las ciudades de las tiendas verificadas', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/catalogo');
    await loaded();

    const group = within(await screen.findByRole('radiogroup', { name: 'Ciudad' }));
    expect(group.getAllByRole('radio')).toHaveLength(3); // todas + Cali + Bogotá
    await user.click(group.getByRole('radio', { name: /Bogotá/ }));

    await waitFor(() => expect(search(router).get('city')).toBe('Bogotá'));
    await waitFor(() => expect(results().queryAllByText('TecnoPasarela Cali')).toHaveLength(0));
    expect(results().getAllByText('Unilago Gaming').length).toBeGreaterThan(0);
  });

  it('quita un filtro con su chip y todos con "Limpiar todos los filtros" (la búsqueda se queda)', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/catalogo?q=ryzen&category=cpu&condition=new');
    await loaded();

    await user.click(screen.getByRole('button', { name: 'Quitar filtro: Condición: Nuevo' }));
    expect(search(router).has('condition')).toBe(false);

    await user.click(screen.getByRole('button', { name: 'Limpiar todos los filtros' }));
    expect(search(router).has('category')).toBe(false);
    expect(search(router).get('q')).toBe('ryzen');
    expect(screen.queryByRole('group', { name: 'Filtros activos' })).not.toBeInTheDocument();
  });

  it('los filtros se pueden abrir desde móvil con el botón "Filtros"', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/catalogo?category=cpu');
    await loaded();

    await user.click(screen.getByRole('button', { name: 'Filtros (1)' }));
    const dialog = within(await screen.findByRole('dialog', { name: 'Filtros de búsqueda' }));
    await user.click(dialog.getByRole('radio', { name: 'Memoria RAM' }));
    await waitFor(() => expect(search(router).get('category')).toBe('ram'));

    await user.click(dialog.getByRole('button', { name: 'Ver resultados' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

describe('Catálogo: estados', () => {
  it('sin resultados explica qué hacer y "Quitar todos los filtros" limpia también la búsqueda', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/catalogo?q=zzzz');
    expect(
      await screen.findByRole('heading', { name: 'No encontramos ofertas con estos filtros' }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Quitar todos los filtros' }));
    expect(search(router).has('q')).toBe(false);
    expect(await loaded()).not.toHaveLength(0);
  });

  it('muestra el error de conexión con reintento', async () => {
    server.use(http.get('*/api/v1/offers', () => HttpResponse.error()));
    const user = userEvent.setup();
    renderApp('/catalogo');
    expect(await screen.findByRole('alert')).toHaveTextContent('Revisa tu conexión');

    server.resetHandlers();
    await user.click(screen.getByRole('button', { name: 'Reintentar' }));
    expect(await loaded()).toHaveLength(12);
  });

  it('mientras cargan muestra marcadores de posición', () => {
    renderApp('/catalogo');
    expect(screen.getByRole('status', { name: 'Cargando ofertas' })).toBeInTheDocument();
  });
});

describe('Catálogo: Al ensamble (HU-11)', () => {
  it('agrega la pieza al armador, avisa con un enlace y la tarjeta pasa a "En tu armado"', async () => {
    const user = userEvent.setup();
    renderApp('/catalogo?category=cpu');
    await waitFor(() => expect(names()).toHaveLength(5));

    const [first] = results().getAllByRole('button', {
      name: 'Agregar al armado AMD Ryzen 5 7600',
    });
    await user.click(first);

    expect(useBuildStore.getState().parts.cpu.component.displayName).toBe('AMD Ryzen 5 7600');
    expect(screen.getByText('AMD Ryzen 5 7600 se agregó a tu armado.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver armador' })).toHaveAttribute('href', '/armador');
    expect(results().getAllByText('En tu armado')).toHaveLength(1);
  });

  it('cambiar por otra pieza de la misma categoría la reemplaza y lo avisa', async () => {
    const user = userEvent.setup();
    renderApp('/catalogo?category=cpu');
    await waitFor(() => expect(names()).toHaveLength(5));

    await user.click(
      results().getAllByRole('button', { name: 'Agregar al armado AMD Ryzen 5 7600' })[0],
    );
    await user.click(
      results().getByRole('button', { name: 'Cambiar en el armado por AMD Ryzen 7 7800X3D' }),
    );

    expect(useBuildStore.getState().parts.cpu.component.displayName).toBe('AMD Ryzen 7 7800X3D');
    expect(
      screen.getByText('AMD Ryzen 7 7800X3D reemplazó a AMD Ryzen 5 7600 en tu armado.'),
    ).toBeInTheDocument();
  });

  it('el aviso se puede cerrar', async () => {
    const user = userEvent.setup();
    renderApp('/catalogo?category=ram');
    await waitFor(() => expect(names()).toHaveLength(3));

    await user.click(results().getAllByRole('button', { name: /^Agregar al armado/ })[0]);
    await user.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
    expect(screen.queryByRole('link', { name: 'Ver armador' })).not.toBeInTheDocument();
  });

  it('una pieza que ya estaba en el armado aparece marcada al abrir el catálogo', async () => {
    renderApp('/catalogo?category=gpu');
    await waitFor(() => expect(names()).toHaveLength(2));
    const { findOffer } = await import('../../mocks/data.js');
    useBuildStore.setState({ parts: { gpu: findOffer('RTX 4070 SUPER') } });
    expect(await results().findAllByText('En tu armado')).toHaveLength(1);
  });
});
