import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { server } from '../../mocks/node.js';
import { renderApp } from '../../test/utils.jsx';

const route = (path) => `*/api/v1${path}`;
const shortcut = () =>
  screen.queryByRole('button', { name: 'Entrar como vendedor de demostración' });

afterEach(() => vi.unstubAllEnvs());

describe('Atajo temporal al portal del vendedor', () => {
  it('no existe cuando la app no usa datos simulados', async () => {
    vi.stubEnv('VITE_USE_MOCKS', 'false');
    renderApp('/ingresar');
    await screen.findByRole('heading', { level: 1, name: 'Ingresar a tu cuenta' });
    expect(shortcut()).not.toBeInTheDocument();
    expect(screen.queryByText(/Solo desarrollo/)).not.toBeInTheDocument();
  });

  it('tampoco existe si la variable no está definida', async () => {
    vi.stubEnv('VITE_USE_MOCKS', '');
    renderApp('/ingresar');
    await screen.findByRole('heading', { level: 1, name: 'Ingresar a tu cuenta' });
    expect(shortcut()).not.toBeInTheDocument();
  });

  it('con datos simulados aparece rotulado como temporal y solo de desarrollo', async () => {
    vi.stubEnv('VITE_USE_MOCKS', 'true');
    renderApp('/ingresar');
    expect(await screen.findByText('Solo desarrollo · temporal')).toBeInTheDocument();
    expect(shortcut()).toBeInTheDocument();
  });

  it('entra con la cuenta de vendedor de demostración y lleva al dashboard', async () => {
    vi.stubEnv('VITE_USE_MOCKS', 'true');
    const user = userEvent.setup();
    renderApp('/ingresar');
    await user.click(
      await screen.findByRole('button', { name: 'Entrar como vendedor de demostración' }),
    );
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    // La sesión es de verdad (token y rol de vendedor), no un salto sin autenticar
    expect(screen.getByRole('link', { name: 'Mi cuenta' })).toHaveTextContent('VV');
  });

  it('si el inicio de sesión falla avisa y deja volver a intentar', async () => {
    vi.stubEnv('VITE_USE_MOCKS', 'true');
    server.use(
      http.post(route('/auth/login'), () =>
        HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: 'x', details: null, requestId: 'r' },
          { status: 500 },
        ),
      ),
    );
    const user = userEvent.setup();
    renderApp('/ingresar');
    await user.click(
      await screen.findByRole('button', { name: 'Entrar como vendedor de demostración' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrió un error inesperado');
    expect(shortcut()).toBeEnabled();
  });
});
