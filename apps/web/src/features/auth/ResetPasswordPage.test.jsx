import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoUsers, getMockResetToken } from '../../mocks/auth.js';
import { server } from '../../mocks/node.js';
import { renderApp } from '../../test/utils.jsx';

const [buyer] = demoUsers;
const route = (path) => `*/api/v1${path}`;
const api = (path) => `${window.location.origin}/api/v1${path}`;
const location = (router) => router.state.location.pathname + router.state.location.search;

beforeEach(() => vi.stubEnv('VITE_USE_MOCKS', 'false'));
afterEach(() => vi.unstubAllEnvs());

const post = (path, body) =>
  fetch(api(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

/** Pide el enlace como lo haría la pantalla anterior y devuelve el token que llegaría al correo. */
const issueToken = async (email = buyer.email) => {
  await post('/auth/forgot', { email });
  return getMockResetToken(email);
};

const open = async (token) => {
  const utils = renderApp(`/restablecer${token === undefined ? '' : `?token=${token}`}`);
  await screen.findByRole('heading', { level: 1 });
  return { ...utils, user: userEvent.setup() };
};
const fill = async (user, password, confirm = password) => {
  await user.type(screen.getByLabelText('Contraseña nueva'), password);
  await user.type(screen.getByLabelText('Confirmar contraseña nueva'), confirm);
};
const submit = (user) =>
  user.click(screen.getByRole('button', { name: 'Guardar contraseña nueva' }));

describe('Restablecer contraseña: formulario', () => {
  it('muestra los dos campos, los requisitos y el enlace para volver', async () => {
    await open(await issueToken());
    expect(
      screen.getByRole('heading', { level: 1, name: 'Crea tu nueva contraseña' }),
    ).toBeInTheDocument();
    expect(document.title).toBe('Nueva contraseña · PcBuilder');
    expect(screen.getByLabelText('Contraseña nueva')).toHaveAttribute('type', 'password');
    expect(screen.getByLabelText('Confirmar contraseña nueva')).toHaveAttribute('type', 'password');
    const rules = within(screen.getByRole('list', { name: 'Requisitos de la contraseña' }));
    expect(rules.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByRole('link', { name: /Volver al inicio de sesión/ })).toHaveAttribute(
      'href',
      '/ingresar',
    );
  });

  it('los requisitos se marcan al escribir', async () => {
    const { user } = await open(await issueToken());
    const rules = () => within(screen.getByRole('list', { name: 'Requisitos de la contraseña' }));
    expect(rules().getAllByText('(pendiente)')).toHaveLength(4);
    await fill(user, 'Clave12345');
    expect(rules().getAllByText('(cumplido)')).toHaveLength(4);
  });

  it('con los campos vacíos avisa y no llama a la API', async () => {
    let calls = 0;
    server.use(
      http.post(route('/auth/reset'), () => {
        calls += 1;
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await open(await issueToken());
    await submit(user);
    expect(await screen.findByText('Escribe una contraseña')).toBeInTheDocument();
    expect(screen.getByText('Confirma tu contraseña')).toBeInTheDocument();
    expect(calls).toBe(0);
  });

  it('rechaza una contraseña débil con el motivo', async () => {
    const { user } = await open(await issueToken());
    await fill(user, 'solo letras');
    await submit(user);
    expect(await screen.findByText('Debe incluir al menos un número')).toBeInTheDocument();
  });

  it('avisa cuando las dos contraseñas no coinciden', async () => {
    const { user } = await open(await issueToken());
    await fill(user, 'Clave12345', 'Clave54321');
    await submit(user);
    expect(await screen.findByText('Las contraseñas no coinciden')).toBeInTheDocument();
  });
});

describe('Restablecer contraseña: resultado', () => {
  it('guarda la contraseña nueva, no manda la confirmación y se puede ingresar con ella', async () => {
    const bodies = [];
    server.use(
      http.post(route('/auth/reset'), async ({ request }) => {
        bodies.push(await request.clone().json());
        return undefined;
      }),
    );
    const token = await issueToken();
    const { user } = await open(token);
    await fill(user, 'Nueva12345');
    await submit(user);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Contraseña actualizada' }),
    ).toBeInTheDocument();
    expect(bodies).toEqual([{ token, password: 'Nueva12345' }]);
    expect(
      within(screen.getByRole('main')).getByRole('link', { name: /^Ingresar/ }),
    ).toHaveAttribute('href', '/ingresar');
    // La contraseña vieja ya no sirve y la nueva sí
    const old = await post('/auth/login', { email: buyer.email, password: buyer.password });
    expect(old.status).toBe(401);
    const fresh = await post('/auth/login', { email: buyer.email, password: 'Nueva12345' });
    expect(fresh.status).toBe(200);
  });

  it('el enlace es de un solo uso', async () => {
    const token = await issueToken();
    const { user } = await open(token);
    await fill(user, 'Nueva12345');
    await submit(user);
    await screen.findByRole('heading', { name: 'Contraseña actualizada' });
    const again = await post('/auth/reset', { token, password: 'Otra12345' });
    expect(again.status).toBe(400);
  });

  it('un enlace nuevo deja sin efecto el anterior', async () => {
    const first = await issueToken();
    const second = await issueToken();
    expect(second).not.toBe(first);
    const { user } = await open(first);
    await fill(user, 'Nueva12345');
    await submit(user);
    expect(
      await screen.findByRole('heading', { name: 'El enlace no es válido' }),
    ).toBeInTheDocument();
  });

  it('si el servidor dice que el enlace no sirve ofrece pedir otro', async () => {
    const { user, router } = await open('token-que-no-existe');
    await fill(user, 'Nueva12345');
    await submit(user);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'El enlace no es válido' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: /Pedir un enlace nuevo/ }));
    await waitFor(() => expect(location(router)).toBe('/recuperar'));
  });

  it('si el servidor falla muestra el error y deja reintentar', async () => {
    server.use(
      http.post(route('/auth/reset'), () =>
        HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: 'x', details: null, requestId: 'r' },
          { status: 500 },
        ),
      ),
    );
    const { user } = await open(await issueToken());
    await fill(user, 'Nueva12345');
    await submit(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrió un error inesperado');
    expect(screen.getByRole('button', { name: 'Guardar contraseña nueva' })).toBeEnabled();
  });

  it('mientras guarda deshabilita el botón', async () => {
    let release;
    server.use(
      http.post(route('/auth/reset'), async () => {
        await new Promise((resolve) => {
          release = resolve;
        });
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await open(await issueToken());
    await fill(user, 'Nueva12345');
    await submit(user);
    expect(await screen.findByRole('button', { name: 'Guardando…' })).toBeDisabled();
    release();
    await screen.findByRole('heading', { name: 'Contraseña actualizada' });
  });
});

describe('Restablecer contraseña: enlace sin token', () => {
  it('sin token explica el problema y lleva a pedir otro enlace', async () => {
    await open();
    expect(
      screen.getByRole('heading', { level: 1, name: 'El enlace no es válido' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Pedir un enlace nuevo/ })).toHaveAttribute(
      'href',
      '/recuperar',
    );
    expect(screen.queryByLabelText('Contraseña nueva')).not.toBeInTheDocument();
  });

  it('un token en blanco cuenta como sin token', async () => {
    await open('%20');
    expect(
      screen.getByRole('heading', { level: 1, name: 'El enlace no es válido' }),
    ).toBeInTheDocument();
  });
});

describe('Recuperar y restablecer: flujo completo', () => {
  it('pide el enlace, abre el enlace de desarrollo y cambia la contraseña', async () => {
    vi.stubEnv('VITE_USE_MOCKS', 'true');
    const user = userEvent.setup();
    renderApp('/recuperar');
    await screen.findByRole('heading', { level: 1, name: 'Recuperar contraseña' });
    await user.type(screen.getByLabelText('Correo electrónico'), buyer.email);
    await user.click(screen.getByRole('button', { name: /Enviar enlace de recuperación/ }));
    await user.click(await screen.findByRole('link', { name: /Abrir enlace de restablecimiento/ }));
    await screen.findByRole('heading', { level: 1, name: 'Crea tu nueva contraseña' });
    await fill(user, 'Nueva12345');
    await submit(user);
    expect(
      await screen.findByRole('heading', { name: 'Contraseña actualizada' }),
    ).toBeInTheDocument();
  });
});
