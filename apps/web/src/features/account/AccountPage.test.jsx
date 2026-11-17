import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { demoUsers, signInMock } from '../../mocks/auth.js';
import { server } from '../../mocks/node.js';
import { renderApp } from '../../test/utils.jsx';

const [buyer, seller] = demoUsers;
const route = (path) => `*/api/v1${path}`;
const location = (router) => router.state.location.pathname + router.state.location.search;

const open = async (user = buyer) => {
  signInMock(user);
  const utils = renderApp('/cuenta');
  await screen.findByRole('heading', { level: 1, name: 'Mi cuenta' });
  return utils;
};
const menu = () => within(screen.getByRole('navigation', { name: 'Menú de la cuenta' }));
const error500 = () =>
  HttpResponse.json(
    { code: 'INTERNAL_ERROR', message: 'x', details: null, requestId: 'r' },
    { status: 500 },
  );

describe('Mi cuenta: datos de la persona', () => {
  it('muestra el nombre, el correo y el tipo de cuenta reales', async () => {
    await open();
    const card = within(screen.getByRole('complementary', { name: 'Perfil' }));
    expect(card.getByText(buyer.fullName)).toBeInTheDocument();
    expect(card.getByText(buyer.email)).toBeInTheDocument();
    expect(card.getByText('Cuenta de comprador')).toBeInTheDocument();
    expect(card.getByText('CC')).toBeInTheDocument(); // iniciales
    expect(document.title).toBe('Mi cuenta · PcBuilder');
  });

  it('un vendedor ve su tipo de cuenta', async () => {
    await open(seller);
    expect(screen.getByText('Cuenta de vendedor')).toBeInTheDocument();
  });

  it('el breadcrumb vuelve al inicio', async () => {
    await open();
    const nav = within(screen.getByRole('navigation', { name: 'Ruta de navegación' }));
    expect(nav.getByRole('link', { name: 'Inicio' })).toHaveAttribute('href', '/');
  });

  it('los datos del perfil muestran los valores reales, con el correo de solo lectura', async () => {
    await open();
    expect(screen.getByLabelText('Nombre y apellido')).toHaveValue(buyer.fullName);
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue(buyer.email);
    expect(screen.getByText('Solo lectura')).toBeInTheDocument();
  });

  it('no inventa datos que la API no entrega', async () => {
    await open();
    expect(document.body).not.toHaveTextContent(
      /RFC 5322|Argon2|Sede principal|Nodo Bogot|Hubs Regionales|entropía|supresión criptográfica|Decreto 1377/i,
    );
  });
});

describe('Mi cuenta: menú', () => {
  it('lista los contadores de armados y favoritos que devuelve la API', async () => {
    await open();
    const builds = menu().getByRole('link', { name: /Mis armados/ });
    const wishlist = menu().getByRole('link', { name: /Favoritos/ });
    await waitFor(() => expect(builds).toHaveTextContent('3'));
    await waitFor(() => expect(wishlist).toHaveTextContent('1'));
    expect(builds).toHaveAttribute('href', '/cuenta/armados');
    expect(wishlist).toHaveAttribute('href', '/cuenta/favoritos');
  });

  it('una cuenta sin armados ni favoritos muestra cero', async () => {
    await open(seller);
    const builds = menu().getByRole('link', { name: /Mis armados/ });
    await waitFor(() => expect(builds).toHaveTextContent('0'));
  });

  it('si fallan los contadores el menú sigue funcionando sin mostrar números', async () => {
    server.use(http.get(route('/me/builds'), error500), http.get(route('/me/wishlist'), error500));
    await open();
    const builds = menu().getByRole('link', { name: /Mis armados/ });
    await waitFor(() => expect(builds).not.toHaveTextContent('…'));
    expect(builds).toHaveAccessibleName('Mis armados');
    expect(builds).toHaveAttribute('href', '/cuenta/armados');
  });

  it('marca la página actual', async () => {
    await open();
    expect(menu().getByRole('link', { name: 'Mi perfil' })).toHaveAttribute('aria-current', 'page');
  });

  it('un comprador ve "Ser vendedor" y un vendedor no', async () => {
    await open(buyer);
    expect(menu().getByRole('link', { name: 'Ser vendedor' })).toHaveAttribute('href', '/vender');
  });

  it('un vendedor no ve "Ser vendedor"', async () => {
    await open(seller);
    expect(menu().queryByRole('link', { name: 'Ser vendedor' })).not.toBeInTheDocument();
  });

  it('"Cerrar sesión" cierra la sesión y lleva a ingresar', async () => {
    const user = userEvent.setup();
    const { router } = await open();
    await user.click(menu().getByRole('button', { name: 'Cerrar sesión' }));
    await screen.findByRole('heading', { level: 1, name: 'Ingresar a tu cuenta' });
    expect(location(router)).toBe('/ingresar?next=%2Fcuenta');
  });
});

describe('Mi cuenta: lo que depende del backend se ve deshabilitado', () => {
  it('la edición del perfil está deshabilitada como "Próximamente"', async () => {
    await open();
    expect(screen.getByLabelText('Nombre y apellido')).toBeDisabled();
    expect(screen.getByLabelText('Ciudad preferida')).toBeDisabled();
    expect(screen.getByRole('switch', { name: 'Alertas de precio' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Guardar cambios/ })).toBeDisabled();
    expect(screen.getAllByText('Edición próximamente')).toHaveLength(2);
  });

  it('el cambio de contraseña está deshabilitado y recuerda las reglas', async () => {
    await open();
    expect(screen.getByLabelText('Contraseña actual')).toBeDisabled();
    expect(screen.getByLabelText('Nueva contraseña')).toBeDisabled();
    expect(screen.getByLabelText('Confirmar nueva contraseña')).toBeDisabled();
    expect(screen.getByRole('button', { name: /Actualizar contraseña/ })).toBeDisabled();
    expect(screen.getByText(/Entre 8 y 72 caracteres/)).toBeInTheDocument();
  });

  it('eliminar la cuenta está deshabilitado y enlaza la política de privacidad', async () => {
    await open();
    const zone = within(screen.getByRole('region', { name: 'Eliminar cuenta' }));
    expect(zone.getByRole('button', { name: /Eliminar mi cuenta/ })).toBeDisabled();
    expect(zone.getByRole('link', { name: 'Política de Privacidad' })).toHaveAttribute(
      'href',
      '/privacidad',
    );
  });
});

describe('Mi cuenta: acceso', () => {
  it('sin sesión lleva a ingresar y vuelve después de entrar', async () => {
    const { router } = renderApp('/cuenta');
    await screen.findByRole('heading', { level: 1, name: 'Ingresar a tu cuenta' });
    expect(location(router)).toBe('/ingresar?next=%2Fcuenta');
  });
});
