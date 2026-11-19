import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { demoUsers, signInMock } from '../mocks/auth.js';
import { ApiError } from '../shared/api/client.js';
import ErrorScreen from '../shared/ui/ErrorScreen.jsx';
import { renderApp, renderWithProviders } from '../test/utils.jsx';
import AppLayout from './AppLayout.jsx';
import ErrorPage, { RootErrorPage, variantFor } from './ErrorPage.jsx';

const [buyer, seller] = demoUsers;

/** Una pantalla que falla al dibujarse, como haría un error de programación. */
function Broken({ error }) {
  throw error;
}

const renderBroken = (error, { frame = true } = {}) => {
  const children = [{ path: '/', element: <Broken error={error} /> }];
  const routes = frame
    ? [{ element: <AppLayout />, children: [{ errorElement: <ErrorPage />, children }] }]
    : [{ errorElement: <RootErrorPage />, children }];
  const router = createMemoryRouter(routes, { initialEntries: ['/'] });
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
};

const setOnline = (value) =>
  vi.spyOn(Object.getPrototypeOf(navigator), 'onLine', 'get').mockReturnValue(value);
const silenceReactErrors = () => vi.spyOn(console, 'error').mockImplementation(() => {});
const routeError = (status) => ({ status, statusText: '', internal: true, data: null });

afterEach(() => vi.restoreAllMocks());

describe('ErrorScreen: variantes', () => {
  it.each([
    ['notFound', 'Error 404', 'No encontramos esa página', 'Ir al inicio'],
    ['forbidden', 'Error 403', 'Esta sección no es para tu tipo de cuenta', 'Ir al inicio'],
    ['unexpected', 'Error inesperado', 'Algo salió mal', 'Recargar la página'],
    ['offline', 'Sin conexión', 'No hay conexión a internet', 'Reintentar'],
  ])('%s muestra su etiqueta, su título y su acción principal', (variant, code, title, action) => {
    renderWithProviders(<ErrorScreen variant={variant} />);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
    expect(screen.getByText(code)).toBeInTheDocument();
    expect(screen.getByText(action)).toBeInTheDocument();
    expect(document.title).toBe(`${title} · PcBuilder`);
  });

  it('el 404 ofrece ir al inicio y al catálogo', () => {
    renderWithProviders(<ErrorScreen variant="notFound" />);
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: 'Ver el catálogo' })).toHaveAttribute(
      'href',
      '/catalogo',
    );
  });

  it('el 403 usa el mensaje oficial de la API y ofrece Mi cuenta', () => {
    renderWithProviders(<ErrorScreen variant="forbidden" />);
    expect(screen.getByText('No tienes permiso para esta acción.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Mi cuenta' })).toHaveAttribute('href', '/cuenta');
  });

  it('acepta acciones propias', () => {
    renderWithProviders(
      <ErrorScreen
        variant="notFound"
        actions={[
          { label: 'Ir al dashboard', to: '/vendedor' },
          { label: 'Ver inventario', to: '/vendedor/inventario' },
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: 'Ir al dashboard' })).toHaveAttribute(
      'href',
      '/vendedor',
    );
    expect(screen.queryByRole('link', { name: 'Ver el catálogo' })).not.toBeInTheDocument();
  });

  it('"Recargar la página" recarga', async () => {
    const reload = vi.fn();
    vi.stubGlobal('location', { ...window.location, reload });
    renderWithProviders(<ErrorScreen variant="unexpected" />);
    await userEvent.click(screen.getByRole('button', { name: 'Recargar la página' }));
    expect(reload).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it('el detalle técnico solo se ve en desarrollo', () => {
    const { unmount } = renderWithProviders(
      <ErrorScreen variant="unexpected" detail="Error: boom" />,
    );
    expect(screen.getByText('Error: boom')).toBeInTheDocument();
    expect(screen.getByText('Detalles técnicos (solo en desarrollo)')).toBeInTheDocument();
    unmount();
    vi.stubEnv('DEV', false);
    renderWithProviders(<ErrorScreen variant="unexpected" detail="Error: boom" />);
    expect(screen.queryByText('Error: boom')).not.toBeInTheDocument();
    vi.unstubAllEnvs();
  });
});

describe('variantFor', () => {
  it('sin conexión o con un fallo de red es "offline"', () => {
    expect(variantFor(new Error('x'), false)).toBe('offline');
    expect(variantFor(new ApiError({ status: 0, code: 'NETWORK_ERROR' }), true)).toBe('offline');
  });

  it('un 404 o un 403 del router son su propia pantalla', () => {
    expect(variantFor(routeError(404), true)).toBe('notFound');
    expect(variantFor(routeError(403), true)).toBe('forbidden');
  });

  it('cualquier otro error es inesperado', () => {
    expect(variantFor(new Error('boom'), true)).toBe('unexpected');
    expect(variantFor(routeError(500), true)).toBe('unexpected');
    expect(variantFor('texto', true)).toBe('unexpected');
  });
});

describe('Error al dibujar una pantalla', () => {
  it('muestra el aviso dentro del marco: la barra y el pie siguen puestos', async () => {
    silenceReactErrors();
    renderBroken(new Error('boom'));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Algo salió mal' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recargar la página' })).toBeInTheDocument();
    expect(screen.getByText(/boom/)).toBeInTheDocument();
  });

  it('con el navegador sin conexión dice que no hay conexión', async () => {
    silenceReactErrors();
    setOnline(false);
    renderBroken(new Error('boom'));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'No hay conexión a internet' }),
    ).toBeInTheDocument();
  });

  it('un fallo de red de la API también se muestra como sin conexión', async () => {
    silenceReactErrors();
    renderBroken(new ApiError({ status: 0, code: 'NETWORK_ERROR' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'No hay conexión a internet' }),
    ).toBeInTheDocument();
  });

  it('un error fuera de los marcos usa el respaldo, sin barra ni pie', async () => {
    silenceReactErrors();
    renderBroken(new Error('boom'), { frame: false });
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Algo salió mal' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument();
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });
});

describe('404 y 403 dentro de los marcos', () => {
  it('una ruta pública inexistente se ve con la barra y el pie públicos', () => {
    renderApp('/ruta-que-no-existe');
    expect(
      screen.getByRole('heading', { level: 1, name: 'No encontramos esa página' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver el catálogo' })).toBeInTheDocument();
  });

  it('una ruta inexistente del portal se ve con el menú del vendedor, no con la barra pública', async () => {
    signInMock(seller);
    renderApp('/vendedor/ruta-que-no-existe');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'No encontramos esa página' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Panel comercial' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Principal' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir al dashboard' })).toHaveAttribute(
      'href',
      '/vendedor',
    );
    expect(screen.getByRole('link', { name: 'Ver inventario' })).toHaveAttribute(
      'href',
      '/vendedor/inventario',
    );
  });

  it('la pantalla de cuenta equivocada lleva la barra y el pie públicos', async () => {
    signInMock(buyer);
    renderApp('/vendedor');
    expect(
      await screen.findByRole('heading', {
        level: 1,
        name: 'Esta sección no es para tu tipo de cuenta',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Principal' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    expect(
      within(screen.getByRole('main')).getByRole('link', { name: 'Mi cuenta' }),
    ).toHaveAttribute('href', '/cuenta');
  });
});

describe('Aviso de sin conexión', () => {
  it('aparece al perder la conexión y se va al recuperarla (sitio público)', async () => {
    renderApp('/');
    expect(screen.queryByText(/Sin conexión: algunas acciones/)).not.toBeInTheDocument();
    setOnline(false);
    act(() => window.dispatchEvent(new Event('offline')));
    expect(
      await screen.findByText(/Sin conexión: algunas acciones no funcionarán/),
    ).toBeInTheDocument();
    setOnline(true);
    act(() => window.dispatchEvent(new Event('online')));
    await waitFor(() =>
      expect(screen.queryByText(/Sin conexión: algunas acciones/)).not.toBeInTheDocument(),
    );
  });

  it('también aparece en el portal del vendedor', async () => {
    signInMock(seller);
    renderApp('/vendedor/inventario');
    await screen.findByRole('navigation', { name: 'Panel comercial' });
    setOnline(false);
    act(() => window.dispatchEvent(new Event('offline')));
    await screen.findByText(/Sin conexión: algunas acciones no funcionarán/);
    expect(
      within(screen.getByRole('main')).getByText(/Sin conexión: algunas acciones/),
    ).toBeInTheDocument();
  });
});

describe('Ingresar pedido por una guarda', () => {
  it('con un destino pendiente explica que hay que iniciar sesión', async () => {
    renderApp('/ingresar?next=%2Fcuenta%2Ffavoritos');
    expect(await screen.findByRole('note')).toHaveTextContent('Inicia sesión para continuar.');
  });

  it('sin destino no muestra la nota', async () => {
    renderApp('/ingresar');
    await screen.findByRole('heading', { level: 1, name: 'Ingresar a tu cuenta' });
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });

  it('una página protegida lleva a Ingresar con la nota', async () => {
    renderApp('/cuenta/favoritos');
    expect(await screen.findByRole('note')).toHaveTextContent('Inicia sesión para continuar.');
  });
});
