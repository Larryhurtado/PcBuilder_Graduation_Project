import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { routes } from '../app/routes.jsx';

/** Cliente de consultas para pruebas: sin reintentos ni caché compartida. */
export function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
}

/** Renderiza la aplicación completa (router en memoria) en la ruta indicada. */
export function renderApp(initialPath = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] });
  const utils = render(
    <QueryClientProvider client={createTestQueryClient()}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  return { router, ...utils };
}

/** Renderiza un componente suelto con router y consultas, para pruebas de componente. */
export function renderWithProviders(ui, { path = '/' } = {}) {
  const router = createMemoryRouter([{ path: '*', element: ui }], { initialEntries: [path] });
  return {
    router,
    ...render(
      <QueryClientProvider client={createTestQueryClient()}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    ),
  };
}
