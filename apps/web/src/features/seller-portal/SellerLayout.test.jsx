import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { demoUsers, signInMock } from '../../mocks/auth.js';
import { publicStores } from '../../mocks/data.js';
import { server } from '../../mocks/node.js';
import { renderApp } from '../../test/utils.jsx';

const [, seller] = demoUsers;
const route = (path) => `*/api/v1${path}`;
const store = publicStores.find((item) => item.name === 'TecnoPasarela Cali');
const location = (router) => router.state.location.pathname + router.state.location.search;

const open = async (path = '/vendedor') => {
  signInMock(seller);
  const utils = renderApp(path);
  await screen.findByRole('navigation', { name: 'Panel comercial' });
  return { ...utils, user: userEvent.setup() };
};
const menu = () => within(screen.getByRole('navigation', { name: 'Panel comercial' }));
const topbar = () => within(screen.getByRole('banner'));

describe('Marco del portal del vendedor', () => {
  it('tiene su propio marco: no muestra la barra ni el pie públicos', async () => {
    await open();
    expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Atribución de datos' })).not.toBeInTheDocument();
  });

  it('el menú lleva a cada pantalla del portal y marca la actual', async () => {
    await open();
    expect(menu().getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
    expect(menu().getByRole('link', { name: 'Inventario' })).toHaveAttribute(
      'href',
      '/vendedor/inventario',
    );
    expect(menu().getByRole('link', { name: 'Publicar producto' })).toHaveAttribute(
      'href',
      '/vendedor/publicar',
    );
    expect(menu().getByRole('link', { name: 'Ajustes de tienda' })).toHaveAttribute(
      'href',
      '/vendedor/negocio',
    );
  });

  it('"Métricas y clics" está deshabilitado como "Próximamente"', async () => {
    await open();
    expect(menu().getByRole('button', { name: /Métricas y clics/ })).toBeDisabled();
  });

  it('la barra superior muestra el negocio, su ubicación y el estado de verificación', async () => {
    await open();
    expect(await topbar().findByText('TecnoPasarela Cali')).toBeInTheDocument();
    expect(topbar().getByText('C.C. Pasarela · Cali')).toBeInTheDocument();
    const chip = await topbar().findByRole('link', { name: /Verificado/ });
    expect(chip).toHaveAttribute('href', '/vendedor/verificacion');
  });

  it('"Directorio público" y "Portal público" llevan al perfil de la tienda verificada', async () => {
    await open();
    const directory = await topbar().findByRole('link', { name: /Directorio público/ });
    await waitFor(() => expect(directory).toHaveAttribute('href', `/tiendas/${store.id}`));
    const aside = within(screen.getAllByRole('complementary')[0]);
    expect(aside.getByRole('link', { name: /Portal público/ })).toHaveAttribute(
      'href',
      `/tiendas/${store.id}`,
    );
  });

  it('sin verificar, los enlaces públicos llevan al directorio general', async () => {
    server.use(
      http.get(route('/seller/verification/status'), () =>
        HttpResponse.json({
          status: 'not_submitted',
          submittedAt: null,
          reviewerNote: null,
          deadlineAt: null,
          canReapplyAt: null,
        }),
      ),
    );
    await open();
    const directory = await topbar().findByRole('link', { name: /Directorio público/ });
    expect(directory).toHaveAttribute('href', '/tiendas');
    expect(
      await topbar().findByRole('link', { name: /Verificación pendiente/ }),
    ).toBeInTheDocument();
  });

  it('las notificaciones están deshabilitadas como "Próximamente"', async () => {
    await open();
    expect(
      topbar().getByRole('button', { name: /Notificaciones \(próximamente\)/ }),
    ).toBeDisabled();
  });

  it('el avatar lleva a la cuenta y muestra las iniciales', async () => {
    await open();
    const link = topbar().getByRole('link', { name: 'Mi cuenta' });
    expect(link).toHaveAttribute('href', '/cuenta');
    expect(link).toHaveTextContent('VV');
  });

  it('el pie conserva la atribución de BuildCores', async () => {
    await open();
    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      'BuildCores OpenDB (CC BY-NC-SA 4.0)',
    );
  });

  it('las demás pantallas del vendedor viven dentro del mismo marco', async () => {
    await open('/vendedor/negocio');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ajustes de tienda' }),
    ).toBeInTheDocument();
    expect(menu().getByRole('link', { name: 'Ajustes de tienda' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('"Salir" cierra la sesión y lleva a ingresar', async () => {
    const { user, router } = await open();
    const aside = within(screen.getAllByRole('complementary')[0]);
    await user.click(aside.getByRole('button', { name: /Salir/ }));
    await screen.findByRole('heading', { level: 1, name: 'Ingresar a tu cuenta' });
    expect(location(router)).toBe('/ingresar?next=%2Fvendedor');
  });

  it('el menú móvil se abre desde el botón, navega y se cierra', async () => {
    const { user, router } = await open();
    await user.click(screen.getByRole('button', { name: 'Abrir el menú del panel' }));
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByRole('navigation', { name: 'Panel comercial' })).toBeInTheDocument();
    await user.click(dialog.getByRole('link', { name: 'Inventario' }));
    await waitFor(() => expect(location(router)).toBe('/vendedor/inventario'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('el menú móvil se cierra con su botón', async () => {
    const { user } = await open();
    await user.click(screen.getByRole('button', { name: 'Abrir el menú del panel' }));
    const dialog = within(await screen.findByRole('dialog'));
    await user.click(dialog.getByRole('button', { name: 'Cerrar el menú' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('si no carga el comercio el marco sigue funcionando con un nombre genérico', async () => {
    server.use(http.get(route('/seller/store'), () => HttpResponse.error()));
    await open();
    expect(await topbar().findByText('Mi negocio')).toBeInTheDocument();
    expect(menu().getByRole('link', { name: 'Inventario' })).toBeInTheDocument();
  });
});
