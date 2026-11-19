import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { demoUsers, signInMock } from '../../mocks/auth.js';
import { server } from '../../mocks/node.js';
import { renderApp } from '../../test/utils.jsx';

const [buyer, seller] = demoUsers;
const route = (path) => `*/api/v1${path}`;

const fill = async (user, email, password) => {
  if (email) await user.type(screen.getByLabelText('Correo electrónico'), email);
  if (password) await user.type(screen.getByLabelText('Contraseña'), password);
};
const submit = (user) => user.click(screen.getByRole('button', { name: /^Ingresar$/ }));
const location = (router) => router.state.location.pathname + router.state.location.search;

const apiError = (status, code) =>
  HttpResponse.json(
    { code, message: 'texto del servidor', details: null, requestId: 'r' },
    { status },
  );

describe('Ingresar: pantalla', () => {
  it('muestra el formulario, los enlaces y la nota de datos', async () => {
    renderApp('/ingresar');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ingresar a tu cuenta' }),
    ).toBeInTheDocument();
    expect(document.title).toBe('Ingresar · PcBuilder');
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('link', { name: '¿Olvidaste tu contraseña?' })).toHaveAttribute(
      'href',
      '/recuperar',
    );
    expect(screen.getByRole('link', { name: /Crear cuenta gratis/ })).toHaveAttribute(
      'href',
      '/registro',
    );
    // El pie del sitio repite estos enlaces: se busca solo dentro de la nota de la tarjeta
    const note = within(screen.getByText(/Ley 1581 de 2012/));
    expect(note.getByRole('link', { name: 'Términos' })).toHaveAttribute('href', '/terminos');
    expect(note.getByRole('link', { name: 'Privacidad' })).toHaveAttribute('href', '/privacidad');
  });

  it('no ofrece inicio con terceros ni lo inventado por el prototipo', async () => {
    renderApp('/ingresar');
    await screen.findByRole('heading', { level: 1, name: 'Ingresar a tu cuenta' });
    expect(screen.queryByText(/Google|GitHub/)).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/SSL|BOG-DC1|Simular error|Recordar sesión/);
  });

  it('el botón del ojo muestra y oculta la contraseña', async () => {
    const user = userEvent.setup();
    renderApp('/ingresar');
    await screen.findByLabelText('Contraseña');
    const field = screen.getByLabelText('Contraseña');
    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(field).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(field).toHaveAttribute('type', 'password');
  });
});

describe('Ingresar: validación', () => {
  it('con los campos vacíos avisa y no llama a la API', async () => {
    const user = userEvent.setup();
    let calls = 0;
    server.use(
      http.post(route('/auth/login'), () => {
        calls += 1;
        return HttpResponse.json({});
      }),
    );
    renderApp('/ingresar');
    await screen.findByLabelText('Contraseña');
    await submit(user);
    expect(await screen.findByText('Escribe tu correo electrónico')).toBeInTheDocument();
    expect(screen.getByText('Escribe tu contraseña')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('aria-invalid', 'true');
    expect(calls).toBe(0);
  });

  it('con un correo mal escrito lo dice junto al campo', async () => {
    const user = userEvent.setup();
    renderApp('/ingresar');
    await screen.findByLabelText('Contraseña');
    await fill(user, 'no-es-correo', 'algo');
    await submit(user);
    expect(await screen.findByText('Correo electrónico no válido')).toBeInTheDocument();
  });
});

describe('Ingresar: resultado', () => {
  it('un comprador entra y va al inicio', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/ingresar');
    await screen.findByLabelText('Contraseña');
    await fill(user, buyer.email, buyer.password);
    await submit(user);
    await waitFor(() => expect(location(router)).toBe('/'));
    expect(await screen.findByRole('link', { name: 'Mi cuenta' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Ingresar' })).not.toBeInTheDocument();
  });

  it('un vendedor entra y va a su panel', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/ingresar');
    await screen.findByLabelText('Contraseña');
    await fill(user, seller.email, seller.password);
    await submit(user);
    await waitFor(() => expect(location(router)).toBe('/vendedor'));
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
  });

  it('vuelve a la página que se intentaba abrir (?next=)', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/ingresar?next=%2Fcatalogo%3Fcategory%3Dcpu');
    await screen.findByLabelText('Contraseña');
    await fill(user, buyer.email, buyer.password);
    await submit(user);
    await waitFor(() => expect(location(router)).toBe('/catalogo?category=cpu'));
  });

  it('ignora un ?next= hacia otro sitio', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/ingresar?next=https%3A%2F%2Fmalo.com');
    await screen.findByLabelText('Contraseña');
    await fill(user, buyer.email, buyer.password);
    await submit(user);
    await waitFor(() => expect(location(router)).toBe('/'));
  });

  it('credenciales incorrectas muestran el aviso y dejan escribir de nuevo', async () => {
    const user = userEvent.setup();
    const { router } = renderApp('/ingresar');
    await screen.findByLabelText('Contraseña');
    await fill(user, buyer.email, 'incorrecta1');
    await submit(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos.');
    expect(location(router)).toBe('/ingresar');
    expect(screen.getByRole('button', { name: /^Ingresar$/ })).toBeEnabled();
  });

  it.each([
    [403, 'ROLE_FORBIDDEN', 'No tienes permiso para esta acción.'],
    [429, 'RATE_LIMITED', /intentos|espera|minutos/i],
  ])('muestra el mensaje del código %s %s', async (status, code, message) => {
    server.use(http.post(route('/auth/login'), () => apiError(status, code)));
    const user = userEvent.setup();
    renderApp('/ingresar');
    await screen.findByLabelText('Contraseña');
    await fill(user, buyer.email, 'cualquiera1');
    await submit(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });

  it('un fallo de red avisa que no se pudo conectar', async () => {
    server.use(http.post(route('/auth/login'), () => HttpResponse.error()));
    const user = userEvent.setup();
    renderApp('/ingresar');
    await screen.findByLabelText('Contraseña');
    await fill(user, buyer.email, 'cualquiera1');
    await submit(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(/No pudimos conectar/);
  });

  it('mientras envía deshabilita el botón', async () => {
    let release;
    server.use(
      http.post(route('/auth/login'), async () => {
        await new Promise((resolve) => {
          release = resolve;
        });
        return apiError(401, 'INVALID_CREDENTIALS');
      }),
    );
    const user = userEvent.setup();
    renderApp('/ingresar');
    await screen.findByLabelText('Contraseña');
    await fill(user, buyer.email, 'cualquiera1');
    await submit(user);
    const busy = await screen.findByRole('button', { name: 'Ingresando…' });
    expect(busy).toBeDisabled();
    release();
    await screen.findByRole('alert');
  });

  it('quien ya tiene sesión sale de la pantalla de ingreso', async () => {
    signInMock(buyer);
    const { router } = renderApp('/ingresar');
    await waitFor(() => expect(location(router)).toBe('/'));
  });
});

describe('Guardas de ruta y cierre de sesión', () => {
  it('sin sesión, una página de cuenta lleva a ingresar y recuerda a dónde volver', async () => {
    const { router } = renderApp('/cuenta/favoritos');
    await screen.findByRole('heading', { level: 1, name: 'Ingresar a tu cuenta' });
    expect(location(router)).toBe('/ingresar?next=%2Fcuenta%2Ffavoritos');
  });

  it('con sesión entra a la página de cuenta', async () => {
    signInMock(buyer);
    renderApp('/cuenta/favoritos');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Mis componentes favoritos' }),
    ).toBeInTheDocument();
  });

  it('el panel del vendedor no es para un comprador', async () => {
    signInMock(buyer);
    renderApp('/vendedor');
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Esta sección no es para tu tipo de cuenta',
      }),
    ).toBeInTheDocument();
  });

  it('el vendedor sí entra a su panel', async () => {
    signInMock(seller);
    renderApp('/vendedor/negocio');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ajustes de tienda' }),
    ).toBeInTheDocument();
  });

  it('las páginas públicas no esperan a la sesión', () => {
    renderApp('/tiendas');
    expect(
      screen.getByRole('heading', { level: 1, name: /Directorio de tiendas/ }),
    ).toBeInTheDocument();
  });

  it('"Cerrar sesión" en la barra cierra la sesión', async () => {
    const user = userEvent.setup();
    signInMock(buyer);
    renderApp('/tiendas');
    await user.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));
    const header = within(screen.getByRole('banner'));
    expect(await header.findByRole('link', { name: 'Ingresar' })).toBeInTheDocument();
    expect(header.queryByRole('link', { name: 'Mi cuenta' })).not.toBeInTheDocument();
  });
});
