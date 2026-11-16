import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../mocks/node.js';
import { renderApp } from '../../test/utils.jsx';

const failure = () =>
  HttpResponse.json(
    { code: 'INTERNAL_ERROR', message: 'fallo', details: null, requestId: 'req-1' },
    { status: 500 },
  );

describe('Inicio', () => {
  it('HU-01: el botón principal lleva al asistente sin pedir sesión', () => {
    renderApp('/');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Arma tu PC sin errores de compatibilidad' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Empezar a armar/ })).toHaveAttribute(
      'href',
      '/armador',
    );
    expect(screen.getByRole('link', { name: 'Explorar catálogo' })).toHaveAttribute(
      'href',
      '/catalogo',
    );
  });

  it('no afirma datos que la plataforma no puede respaldar', () => {
    renderApp('/');
    expect(document.body).not.toHaveTextContent(/12\.400/);
    expect(document.body).not.toHaveTextContent(/sin intermediarios/i);
    expect(document.body).not.toHaveTextContent(/env[ií]os? /i);
    expect(document.body).not.toHaveTextContent(/Medellín/);
  });

  it('muestra las 8 categorías del MVP con enlace al catálogo filtrado', () => {
    renderApp('/');
    const section = screen.getByRole('region', { name: 'Explora por Componentes' });
    const links = within(section)
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href').includes('category='));
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/catalogo?category=cpu',
      '/catalogo?category=gpu',
      '/catalogo?category=motherboard',
      '/catalogo?category=ram',
      '/catalogo?category=storage',
      '/catalogo?category=psu',
      '/catalogo?category=cooler',
      '/catalogo?category=case',
    ]);
    expect(within(section).queryByText('Periféricos')).not.toBeInTheDocument();
  });

  it('HU-02: carga las ofertas con foto, modelo, precio en COP y tienda', async () => {
    renderApp('/');
    const section = screen.getByRole('region', { name: 'Ofertas Destacadas en Colombia' });
    expect(within(section).getAllByRole('status')).not.toHaveLength(0); // esqueletos mientras carga

    expect(
      await within(section).findByRole('heading', { name: 'AMD Ryzen 5 7600' }),
    ).toBeInTheDocument();
    expect(within(section).getByText('$ 849.000 COP')).toBeInTheDocument();
    expect(within(section).getByText('$ 3.050.000 COP')).toBeInTheDocument();
    expect(within(section).getAllByRole('link', { name: 'Contactar por WhatsApp' })).toHaveLength(
      4,
    );
    expect(
      within(section).getAllByText(/TecnoPasarela Cali|Unilago Gaming/).length,
    ).toBeGreaterThan(0);
  });

  it('muestra los comercios verificados con su aviso de verificación', async () => {
    renderApp('/');
    const section = screen.getByRole('region', { name: 'Comercios Verificados' });
    expect(
      await within(section).findByRole('heading', { name: 'TecnoPasarela Cali' }),
    ).toBeInTheDocument();
    expect(within(section).getByRole('heading', { name: 'Unilago Gaming' })).toBeInTheDocument();
    expect(within(section).getAllByText('Comercio Verificado')).toHaveLength(2);
    expect(within(section).getByText(/no garantiza el cumplimiento/i)).toBeInTheDocument();
    expect(
      within(section).getAllByRole('link', { name: /Ver catálogo de tienda/ })[0],
    ).toHaveAttribute('href', expect.stringMatching(/^\/tiendas\/[0-9a-f-]{36}$/));
  });

  it('si fallan las ofertas muestra el error con reintento, y al reintentar las carga', async () => {
    server.use(http.get('*/api/v1/offers', failure));
    renderApp('/');
    const section = screen.getByRole('region', { name: 'Ofertas Destacadas en Colombia' });

    expect(await within(section).findByRole('alert')).toHaveTextContent('error inesperado');

    server.resetHandlers();
    await userEvent.click(within(section).getByRole('button', { name: 'Reintentar' }));
    expect(
      await within(section).findByRole('heading', { name: 'AMD Ryzen 5 7600' }),
    ).toBeInTheDocument();
    expect(within(section).queryByRole('alert')).not.toBeInTheDocument();
  });

  it('un fallo de red se explica sin mostrar detalles técnicos', async () => {
    server.use(http.get('*/api/v1/stores', () => HttpResponse.error()));
    renderApp('/');
    const section = screen.getByRole('region', { name: 'Comercios Verificados' });
    expect(await within(section).findByRole('alert')).toHaveTextContent('Revisa tu conexión');
  });

  it('sin ofertas publicadas muestra un estado vacío', async () => {
    server.use(
      http.get('*/api/v1/offers', () => HttpResponse.json({ items: [], nextCursor: null })),
    );
    renderApp('/');
    expect(await screen.findByText(/Todavía no hay ofertas publicadas/)).toBeInTheDocument();
  });
});
