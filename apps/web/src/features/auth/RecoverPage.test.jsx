import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoUsers } from '../../mocks/auth.js';
import { server } from '../../mocks/node.js';
import { renderApp, renderWithProviders } from '../../test/utils.jsx';
import RecoverPage from './RecoverPage.jsx';

const [buyer] = demoUsers;
const route = (path) => `*/api/v1${path}`;

beforeEach(() => vi.stubEnv('VITE_USE_MOCKS', 'false'));
afterEach(() => vi.unstubAllEnvs());

const captureForgot = () => {
  const bodies = [];
  server.use(
    http.post(route('/auth/forgot'), async ({ request }) => {
      bodies.push(await request.clone().json());
      return undefined;
    }),
  );
  return bodies;
};

const open = async () => {
  renderApp('/recuperar');
  await screen.findByRole('heading', { level: 1, name: 'Recuperar contraseña' });
  return userEvent.setup();
};
const send = async (user, email = buyer.email) => {
  await user.type(screen.getByLabelText('Correo electrónico'), email);
  await user.click(screen.getByRole('button', { name: /Enviar enlace de recuperación/ }));
};

describe('Recuperar contraseña: formulario', () => {
  it('muestra el formulario, los enlaces y la nota de datos', async () => {
    await open();
    expect(document.title).toBe('Recuperar contraseña · PcBuilder');
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('type', 'email');
    expect(
      screen.getByRole('link', { name: /¿Recordaste tu contraseña\? Ingresar/ }),
    ).toHaveAttribute('href', '/ingresar');
    expect(screen.getByRole('link', { name: /Crear cuenta nueva/ })).toHaveAttribute(
      'href',
      '/registro',
    );
    expect(screen.getByText(/Ley 1581 de 2012/)).toBeInTheDocument();
  });

  it('no inventa datos de infraestructura ni de plazos del prototipo', async () => {
    await open();
    expect(document.body).not.toHaveTextContent(
      /SMTP|DKIM|OWASP|RFC 5322|SHA-256|NOC|15 minutos|seguridad@pcbuilder|Simulador/i,
    );
  });

  it('con el correo vacío avisa y no llama a la API', async () => {
    const bodies = captureForgot();
    const user = await open();
    await user.click(screen.getByRole('button', { name: /Enviar enlace de recuperación/ }));
    expect(await screen.findByText('Escribe tu correo electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toHaveAttribute('aria-invalid', 'true');
    expect(bodies).toHaveLength(0);
  });

  it('con un correo mal escrito lo dice junto al campo', async () => {
    const user = await open();
    await send(user, 'no-es-correo');
    expect(await screen.findByText('Correo electrónico no válido')).toBeInTheDocument();
  });

  it('envía el correo normalizado (sin espacios ni mayúsculas)', async () => {
    const bodies = captureForgot();
    const user = await open();
    await send(user, '  Comprador@Demo.PcBuilder.co ');
    await screen.findByRole('heading', { name: 'Revisa tu correo' });
    expect(bodies).toEqual([{ email: 'comprador@demo.pcbuilder.co' }]);
  });
});

describe('Recuperar contraseña: confirmación neutral', () => {
  it('con una cuenta existente muestra la confirmación con el correo y los consejos', async () => {
    const user = await open();
    await send(user);
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Revisa tu correo' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(`Si existe una cuenta con ${buyer.email}`)),
    ).toBeInTheDocument();
    const tips = within(screen.getByRole('list', { name: 'Si no te llega el correo' }));
    expect(tips.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByRole('link', { name: /Volver al inicio de sesión/ })).toHaveAttribute(
      'href',
      '/ingresar',
    );
  });

  it('con un correo sin cuenta muestra exactamente lo mismo (no revela qué correos existen)', async () => {
    const user = await open();
    await send(user, 'nadie@ejemplo.com');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Revisa tu correo' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Si existe una cuenta con nadie@ejemplo\.com/)).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent(/no existe|no encontramos|no está registrado/i);
  });

  it('"Cambiar correo" vuelve al formulario con el correo que se había escrito', async () => {
    const user = await open();
    await send(user);
    await screen.findByRole('heading', { name: 'Revisa tu correo' });
    await user.click(screen.getByRole('button', { name: 'Cambiar correo' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Recuperar contraseña' }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Correo electrónico')).toHaveValue(buyer.email);
  });

  it('el reenvío espera 60 segundos antes de habilitarse', async () => {
    const user = await open();
    await send(user);
    const resend = await screen.findByRole('button', { name: /Reenviar enlace \(espera 60 s\)/ });
    expect(resend).toBeDisabled();
  });
});

describe('Recuperar contraseña: reenvío', () => {
  it('pasada la espera permite pedir otro enlace y lo avisa', async () => {
    const bodies = captureForgot();
    const user = userEvent.setup();
    renderWithProviders(<RecoverPage resendSeconds={1} />);
    await send(user);
    const resend = await screen.findByRole('button', { name: /Reenviar enlace/ });
    await waitFor(() => expect(resend).toBeEnabled(), { timeout: 3000 });
    expect(resend).toHaveTextContent('Reenviar enlace');
    await user.click(resend);
    expect(await screen.findByText('Enviamos otro enlace.')).toBeInTheDocument();
    expect(bodies).toHaveLength(2);
    // Vuelve a esperar antes de otro reenvío
    expect(screen.getByRole('button', { name: /Reenviar enlace \(espera 1 s\)/ })).toBeDisabled();
  });
});

describe('Recuperar contraseña: errores', () => {
  it('si hay demasiados intentos muestra el aviso y deja intentar de nuevo', async () => {
    server.use(
      http.post(route('/auth/forgot'), () =>
        HttpResponse.json(
          { code: 'RATE_LIMITED', message: 'x', details: null, requestId: 'r' },
          { status: 429 },
        ),
      ),
    );
    const user = await open();
    await send(user);
    expect(await screen.findByRole('alert')).toHaveTextContent('Demasiados intentos');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Recuperar contraseña' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enviar enlace de recuperación/ })).toBeEnabled();
  });

  it('un fallo de red avisa que no se pudo conectar', async () => {
    server.use(http.post(route('/auth/forgot'), () => HttpResponse.error()));
    const user = await open();
    await send(user);
    expect(await screen.findByRole('alert')).toHaveTextContent(/No pudimos conectar/);
  });

  it('mientras envía deshabilita el botón', async () => {
    let release;
    server.use(
      http.post(route('/auth/forgot'), async () => {
        await new Promise((resolve) => {
          release = resolve;
        });
        return HttpResponse.json({});
      }),
    );
    const user = await open();
    await send(user);
    expect(await screen.findByRole('button', { name: 'Enviando…' })).toBeDisabled();
    release();
    await screen.findByRole('heading', { name: 'Revisa tu correo' });
  });
});

describe('Recuperar contraseña: enlace de desarrollo', () => {
  it('con datos simulados muestra el enlace de restablecimiento de una cuenta existente', async () => {
    vi.stubEnv('VITE_USE_MOCKS', 'true');
    const user = await open();
    await send(user);
    const link = await screen.findByRole('link', { name: /Abrir enlace de restablecimiento/ });
    expect(link.getAttribute('href')).toMatch(/^\/restablecer\?token=mock-reset-/);
    expect(screen.getByText(/Solo desarrollo/)).toBeInTheDocument();
  });

  it('no muestra enlace si el correo no tiene cuenta', async () => {
    vi.stubEnv('VITE_USE_MOCKS', 'true');
    const user = await open();
    await send(user, 'nadie@ejemplo.com');
    await screen.findByRole('heading', { name: 'Revisa tu correo' });
    expect(
      screen.queryByRole('link', { name: /Abrir enlace de restablecimiento/ }),
    ).not.toBeInTheDocument();
  });

  it('fuera del modo simulado no existe el recuadro', async () => {
    const user = await open();
    await send(user);
    await screen.findByRole('heading', { name: 'Revisa tu correo' });
    expect(screen.queryByText(/Solo desarrollo/)).not.toBeInTheDocument();
  });
});
