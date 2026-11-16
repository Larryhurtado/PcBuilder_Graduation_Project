import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { demoUsers, signInMock } from '../../mocks/auth.js';
import { server } from '../../mocks/node.js';
import { renderApp } from '../../test/utils.jsx';

const [buyer] = demoUsers;
const route = (path) => `*/api/v1${path}`;
const location = (router) => router.state.location.pathname + router.state.location.search;

const NEW_PASSWORD = 'Clave12345';

const open = async (path = '/registro') => {
  const utils = renderApp(path);
  await screen.findByRole('heading', { level: 1, name: 'Crea tu cuenta en PcBuilder' });
  return utils;
};

const fill = async (
  user,
  {
    name = 'Laura Gómez',
    email = 'laura@ejemplo.com',
    password = NEW_PASSWORD,
    accept = true,
  } = {},
) => {
  if (name) await user.type(screen.getByLabelText('Nombre y apellido'), name);
  if (email) await user.type(screen.getByLabelText('Correo electrónico'), email);
  if (password) await user.type(screen.getByLabelText('Contraseña'), password);
  if (accept) await user.click(screen.getByRole('checkbox'));
};
const submit = (user) =>
  user.click(screen.getByRole('button', { name: /Crear cuenta en PcBuilder/ }));

const apiError = (status, code) =>
  HttpResponse.json(
    { code, message: 'texto del servidor', details: null, requestId: 'r' },
    { status },
  );

describe('Registro: pantalla', () => {
  it('muestra el formulario y los enlaces', async () => {
    await open();
    expect(document.title).toBe('Crear cuenta · PcBuilder');
    expect(screen.getByLabelText('Nombre y apellido')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('type', 'email');
    expect(screen.getByLabelText('Contraseña')).toHaveAttribute('type', 'password');
    expect(screen.getByRole('link', { name: /Ingresar a tu cuenta/ })).toHaveAttribute(
      'href',
      '/ingresar',
    );
    expect(screen.getByRole('link', { name: 'Términos y Condiciones' })).toHaveAttribute(
      'href',
      '/terminos',
    );
    expect(screen.getByRole('link', { name: 'Política de Privacidad' })).toHaveAttribute(
      'href',
      '/privacidad',
    );
  });

  it('no ofrece inicio con terceros ni lo inventado por el prototipo', async () => {
    await open();
    expect(screen.queryByText(/Google|GitHub/)).not.toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(
      /SSL|Secure Gateway|RFC 5322|Simular|Argon2|PBKDF2|Decreto 1377|tiempo real/,
    );
  });

  it('el botón del ojo muestra y oculta la contraseña', async () => {
    const user = userEvent.setup();
    await open();
    const field = screen.getByLabelText('Contraseña');
    await user.click(screen.getByRole('button', { name: 'Mostrar contraseña' }));
    expect(field).toHaveAttribute('type', 'text');
    await user.click(screen.getByRole('button', { name: 'Ocultar contraseña' }));
    expect(field).toHaveAttribute('type', 'password');
  });

  it('los requisitos de la contraseña se marcan mientras se escribe', async () => {
    const user = userEvent.setup();
    await open();
    const rules = within(screen.getByRole('list', { name: 'Requisitos de la contraseña' }));
    expect(rules.getAllByText('(pendiente)')).toHaveLength(3);

    await user.type(screen.getByLabelText('Contraseña'), 'abc');
    expect(rules.getAllByText('(cumplido)')).toHaveLength(1); // solo "una letra"

    await user.type(screen.getByLabelText('Contraseña'), '12345');
    expect(rules.getAllByText('(cumplido)')).toHaveLength(3);
  });
});

describe('Registro: validación', () => {
  it('con todo vacío avisa y no llama a la API', async () => {
    const user = userEvent.setup();
    let calls = 0;
    server.use(
      http.post(route('/auth/register'), () => {
        calls += 1;
        return HttpResponse.json({});
      }),
    );
    await open();
    await submit(user);
    expect(await screen.findByText('Escribe tu nombre (mínimo 2 caracteres)')).toBeInTheDocument();
    expect(screen.getByText('Escribe tu correo electrónico')).toBeInTheDocument();
    expect(screen.getByText('Escribe una contraseña')).toBeInTheDocument();
    expect(screen.getByText('Debes aceptar el tratamiento de datos')).toBeInTheDocument();
    expect(screen.getByLabelText('Nombre y apellido')).toHaveAttribute('aria-invalid', 'true');
    expect(calls).toBe(0);
  });

  it('con una contraseña floja muestra la regla que falta', async () => {
    const user = userEvent.setup();
    await open();
    await fill(user, { password: 'corta' });
    await submit(user);
    expect(await screen.findByText('Mínimo 8 caracteres')).toBeInTheDocument();
  });

  it('con una contraseña sin número lo dice', async () => {
    const user = userEvent.setup();
    await open();
    await fill(user, { password: 'SoloLetrasAqui' });
    await submit(user);
    expect(await screen.findByText('Debe incluir al menos un número')).toBeInTheDocument();
  });

  it('con un correo mal escrito lo dice junto al campo', async () => {
    const user = userEvent.setup();
    await open();
    await fill(user, { email: 'no-es-correo' });
    await submit(user);
    expect(await screen.findByText('Correo electrónico no válido')).toBeInTheDocument();
  });

  it('sin aceptar el consentimiento no se registra', async () => {
    const user = userEvent.setup();
    await open();
    await fill(user, { accept: false });
    await submit(user);
    expect(await screen.findByText('Debes aceptar el tratamiento de datos')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('Registro: resultado', () => {
  it('crea la cuenta, deja la sesión abierta y va al inicio', async () => {
    const user = userEvent.setup();
    const { router } = await open();
    await fill(user);
    await submit(user);
    await waitFor(() => expect(location(router)).toBe('/'));
    expect(await screen.findByRole('link', { name: 'Mi cuenta' })).toBeInTheDocument();
  });

  it('envía los datos con el consentimiento y sin rol', async () => {
    let body;
    server.use(
      http.post(route('/auth/register'), async ({ request }) => {
        body = await request.json();
        return apiError(422, 'VALIDATION_ERROR');
      }),
    );
    const user = userEvent.setup();
    await open();
    await fill(user, { name: '  Laura Gómez ', email: 'LAURA@Ejemplo.com' });
    await submit(user);
    await screen.findByRole('alert');
    expect(body).toEqual({
      fullName: 'Laura Gómez',
      email: 'laura@ejemplo.com',
      password: NEW_PASSWORD,
      acceptTerms: true,
    });
  });

  it('vuelve a la página de origen (?next=)', async () => {
    const user = userEvent.setup();
    const { router } = await open('/registro?next=%2Fcatalogo%3Fcategory%3Dgpu');
    await fill(user);
    await submit(user);
    await waitFor(() => expect(location(router)).toBe('/catalogo?category=gpu'));
  });

  it('conserva el destino en el enlace a ingresar', async () => {
    await open('/registro?next=%2Fcuenta');
    expect(screen.getByRole('link', { name: /Ingresar a tu cuenta/ })).toHaveAttribute(
      'href',
      '/ingresar?next=%2Fcuenta',
    );
  });

  it('un correo ya registrado avisa junto al campo y ofrece ingresar', async () => {
    const user = userEvent.setup();
    await open();
    await fill(user, { email: buyer.email });
    await submit(user);
    const message = await screen.findByText(/Ya existe una cuenta con ese correo/);
    expect(message).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('aria-invalid', 'true');
    expect(within(message.parentElement).getByRole('link', { name: 'Ingresar' })).toHaveAttribute(
      'href',
      '/ingresar',
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it.each([
    [422, 'VALIDATION_ERROR', 'Hay datos que no son válidos.'],
    [429, 'RATE_LIMITED', /Demasiados intentos/],
  ])('muestra el mensaje del código %s %s', async (status, code, message) => {
    server.use(http.post(route('/auth/register'), () => apiError(status, code)));
    const user = userEvent.setup();
    await open();
    await fill(user);
    await submit(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(message);
  });

  it('un fallo de red avisa que no se pudo conectar', async () => {
    server.use(http.post(route('/auth/register'), () => HttpResponse.error()));
    const user = userEvent.setup();
    await open();
    await fill(user);
    await submit(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(/No pudimos conectar/);
  });

  it('mientras envía deshabilita el botón', async () => {
    let release;
    server.use(
      http.post(route('/auth/register'), async () => {
        await new Promise((resolve) => {
          release = resolve;
        });
        return apiError(422, 'VALIDATION_ERROR');
      }),
    );
    const user = userEvent.setup();
    await open();
    await fill(user);
    await submit(user);
    expect(await screen.findByRole('button', { name: 'Creando tu cuenta…' })).toBeDisabled();
    release();
    await screen.findByRole('alert');
  });

  it('quien ya tiene sesión sale de la pantalla de registro', async () => {
    signInMock(buyer);
    const { router } = renderApp('/registro');
    await waitFor(() => expect(location(router)).toBe('/'));
  });

  it('la cuenta creada puede volver a ingresar después de cerrar sesión', async () => {
    const user = userEvent.setup();
    await open();
    await fill(user);
    await submit(user);
    await user.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));
    await user.click(
      await within(screen.getByRole('banner')).findByRole('link', { name: 'Ingresar' }),
    );
    await user.type(await screen.findByLabelText('Correo electrónico'), 'laura@ejemplo.com');
    await user.type(screen.getByLabelText('Contraseña'), NEW_PASSWORD);
    await user.click(screen.getByRole('button', { name: /^Ingresar$/ }));
    expect(await screen.findByRole('link', { name: 'Mi cuenta' })).toBeInTheDocument();
  });
});
