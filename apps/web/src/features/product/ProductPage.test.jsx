import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { components, findOffer } from '../../mocks/data.js';
import { server } from '../../mocks/node.js';
import { renderApp } from '../../test/utils.jsx';
import { useBuildStore } from '../builder/store.js';

beforeEach(() => useBuildStore.setState({ parts: {} }));

const ryzen = findOffer('AMD Ryzen 5 7600').component;
const board = findOffer('MSI PRO B650M-P').component;
const ryzenAm4 = findOffer('Ryzen 5 5600').component;

const open = async (component, extra) => {
  const utils = renderApp(`/producto/${component.id}`);
  await screen.findByRole('heading', { level: 1, name: component.displayName });
  if (extra) await extra;
  return utils;
};

const offersSection = () => within(screen.getByRole('region', { name: /Ofertas verificadas/ }));
const storeNames = () =>
  offersSection()
    .getAllByRole('heading', { level: 3 })
    .map((h) => h.textContent);

describe('Ficha: contenido', () => {
  it('muestra el nombre, la ruta de navegación y los datos clave', async () => {
    await open(ryzen);
    const nav = within(screen.getByRole('navigation', { name: 'Ruta de navegación' }));
    expect(nav.getByRole('link', { name: 'Catálogo' })).toHaveAttribute('href', '/catalogo');
    expect(nav.getByRole('link', { name: 'Procesadores' })).toHaveAttribute(
      'href',
      '/catalogo?category=cpu',
    );
    // Dato clave del encabezado y fila de la tabla
    expect(screen.getAllByText('Socket')).toHaveLength(2);
    expect(document.title).toBe('AMD Ryzen 5 7600 · PcBuilder');
  });

  it('la tabla de especificaciones incluye versión, fuente y licencia', async () => {
    await open(ryzen);
    const table = within(screen.getByRole('region', { name: 'Especificaciones técnicas' }));
    expect(table.getByText('Núcleos / hilos')).toBeInTheDocument();
    expect(table.getByText(/Versión del dato: v1/)).toBeInTheDocument();
    expect(table.getByText(/Fuente: BuildCores OpenDB/)).toBeInTheDocument();
    expect(table.getByText(/CC BY-NC-SA 4\.0/)).toBeInTheDocument();
  });

  it('un dato desconocido se muestra como "No disponible", no como cero', async () => {
    const h510 = findOffer('H510').component;
    await open(h510);
    const table = within(screen.getByRole('region', { name: 'Especificaciones técnicas' }));
    expect(table.getByText('Altura máxima del disipador').nextSibling).toHaveTextContent(
      'No disponible',
    );
  });

  it('no inventa datos que la API no entrega', async () => {
    await open(ryzen);
    expect(document.body).not.toHaveTextContent(/Top Ventas|OPN|almacenes auditados|Sincronizado/);
    expect(
      screen.queryByRole('button', { name: /Verificar compatibilidad con mi PC/ }),
    ).not.toBeInTheDocument();
  });

  it('compartir y alternativas están deshabilitados como "Próximamente"', async () => {
    await open(ryzen);
    expect(screen.getByRole('button', { name: /Compartir .* \(próximamente\)/ })).toBeDisabled();
    const alt = within(screen.getByRole('region', { name: 'Alternativas directas' }));
    expect(alt.getByText('Próximamente')).toBeInTheDocument();
  });
});

describe('Ficha: ofertas', () => {
  it('lista las ofertas de la más barata a la más cara y marca el mejor precio', async () => {
    await open(ryzen);
    await offersSection().findByRole('heading', { name: 'TecnoPasarela Cali', level: 3 });
    expect(storeNames()).toEqual(['TecnoPasarela Cali', expect.stringContaining('Unilago')]);
    expect(offersSection().getAllByText('Mejor precio')).toHaveLength(1);
    expect(screen.getByText('$ 849.000 COP', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('2 ofertas en 2 tiendas')).toBeInTheDocument();
  });

  it('cada oferta tiene su enlace a WhatsApp', async () => {
    await open(ryzen);
    await offersSection().findAllByRole('link', { name: 'WhatsApp' });
    for (const link of offersSection().getAllByRole('link', { name: 'WhatsApp' })) {
      expect(link.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/57/);
    }
  });

  it('se ordena por mayor precio y se filtra por ciudad', async () => {
    const user = userEvent.setup();
    await open(ryzen);
    await offersSection().findByRole('heading', { name: 'TecnoPasarela Cali', level: 3 });

    await user.selectOptions(
      offersSection().getByRole('combobox', { name: 'Ordenar ofertas' }),
      'price_desc',
    );
    expect(storeNames()[0]).toContain('Unilago');

    await user.click(offersSection().getByRole('button', { name: 'Cali' }));
    expect(storeNames()).toEqual(['TecnoPasarela Cali']);
    expect(offersSection().getByRole('button', { name: 'Cali' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  it('sin ofertas lo dice y ofrece volver a la categoría', async () => {
    server.use(
      http.get('*/api/v1/offers', () => HttpResponse.json({ items: [], nextCursor: null })),
    );
    await open(ryzen);
    expect(await screen.findAllByText('Esta pieza no tiene ofertas vigentes')).not.toHaveLength(0);
    expect(screen.getByRole('link', { name: 'Ver procesadores' })).toHaveAttribute(
      'href',
      '/catalogo?category=cpu',
    );
  });

  it('si fallan las ofertas muestra el error con reintento, sin tumbar la ficha', async () => {
    server.use(
      http.get('*/api/v1/offers', () =>
        HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: 'x', details: null, requestId: 'r' },
          { status: 500 },
        ),
      ),
    );
    await open(ryzen);
    expect(
      await screen.findByRole('button', { name: 'Reintentar' }, { timeout: 3000 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: ryzen.displayName })).toBeInTheDocument();
  });
});

describe('Ficha: compatibilidad con tu armado', () => {
  it('sin otras piezas invita a armar el PC', async () => {
    await open(ryzen);
    const banner = within(screen.getByRole('region', { name: 'Compatibilidad con tu armado' }));
    expect(banner.getByText(/Aún no hay otras piezas/)).toBeInTheDocument();
    expect(banner.getByRole('link', { name: 'Ir al armador' })).toHaveAttribute('href', '/armador');
  });

  it('es compatible con una placa AM5 ya elegida', async () => {
    useBuildStore.getState().setPart(findOffer('MSI PRO B650M-P'));
    await open(ryzen);
    expect(screen.getByText('Compatible con tu armado en curso')).toBeInTheDocument();
  });

  it('avisa del conflicto si el socket no coincide', async () => {
    useBuildStore.getState().setPart(findOffer('MSI PRO B650M-P'));
    await open(ryzenAm4);
    expect(screen.getByText('Incompatible con tu armado en curso')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('con una placa de otro tipo de memoria no depende del color: lleva texto', async () => {
    useBuildStore.getState().setPart(findOffer('AMD Ryzen 5 7600'));
    await open(board);
    expect(screen.getByRole('region', { name: 'Compatibilidad con tu armado' })).toHaveTextContent(
      /Compatible|Incompatible|No verificable/,
    );
  });
});

describe('Ficha: agregar al armado', () => {
  it('agrega la mejor oferta, avisa y pasa a "En tu armado"', async () => {
    const user = userEvent.setup();
    await open(ryzen);
    await offersSection().findByRole('heading', { name: 'TecnoPasarela Cali', level: 3 });

    // El primero es el botón principal de la columna lateral (mejor oferta)
    await user.click(
      screen.getAllByRole('button', { name: 'Agregar al armado AMD Ryzen 5 7600' })[0],
    );
    expect(useBuildStore.getState().parts.cpu.priceCop).toBe(849000);
    expect(screen.getByRole('status')).toHaveTextContent('AMD Ryzen 5 7600 se agregó a tu armado.');
    expect(screen.getAllByText('En tu armado').length).toBeGreaterThan(0);
  });

  it('desde una oferta concreta agrega esa tienda', async () => {
    const user = userEvent.setup();
    await open(ryzen);
    await offersSection().findByRole('heading', { name: 'TecnoPasarela Cali', level: 3 });

    const buttons = offersSection().getAllByRole('button', { name: /Agregar al armado/ });
    await user.click(buttons[1]);
    await waitFor(() => expect(useBuildStore.getState().parts.cpu.priceCop).toBe(879000));
  });

  it('si ya hay otra pieza de la categoría ofrece reemplazarla', async () => {
    const user = userEvent.setup();
    useBuildStore.getState().setPart(findOffer('Ryzen 5 5600'));
    await open(ryzen);
    await offersSection().findByRole('heading', { name: 'TecnoPasarela Cali', level: 3 });

    await user.click(
      screen.getAllByRole('button', { name: /Cambiar en el armado por AMD Ryzen 5 7600/ })[0],
    );
    expect(useBuildStore.getState().parts.cpu.component.displayName).toBe('AMD Ryzen 5 7600');
    expect(screen.getByRole('status')).toHaveTextContent('reemplazó a');
  });
});

describe('Ficha: estados', () => {
  it('un producto inexistente muestra una pantalla amable', async () => {
    renderApp('/producto/c0000000-0000-4000-8000-0000000000ff');
    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: 'Este producto no está disponible' },
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver el catálogo' })).toHaveAttribute(
      'href',
      '/catalogo',
    );
  });

  it('un fallo de red muestra el error con reintento', async () => {
    server.use(http.get('*/api/v1/components/:id', () => HttpResponse.error()));
    renderApp(`/producto/${components[0].id}`);
    expect(
      await screen.findByRole('button', { name: 'Reintentar' }, { timeout: 3000 }),
    ).toBeInTheDocument();
  });

  it('mientras carga muestra un marcador', () => {
    renderApp(`/producto/${components[0].id}`);
    expect(screen.getByRole('status', { name: 'Cargando producto' })).toBeInTheDocument();
  });
});
