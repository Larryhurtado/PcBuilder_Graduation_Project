import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/utils.jsx';

describe('Navbar', () => {
  it('muestra la navegación principal y marca la página actual', async () => {
    renderApp('/catalogo');
    const nav = screen.getByRole('navigation', { name: 'Principal' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['Inicio', 'Asistente', 'Catálogo', 'Tiendas']);
    expect(within(nav).getByRole('link', { name: 'Catálogo' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Inicio' })).not.toHaveAttribute('aria-current');
  });

  it('permanece visible en todas las vistas', () => {
    const { unmount } = renderApp('/');
    expect(screen.getByRole('banner')).toBeInTheDocument();
    unmount();
    renderApp('/armador');
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('un visitante ve el acceso para ingresar', () => {
    renderApp('/');
    expect(screen.getByRole('link', { name: 'Ingresar' })).toHaveAttribute('href', '/ingresar');
  });

  it('el buscador lleva al catálogo con la consulta', async () => {
    const { router } = renderApp('/');
    const user = userEvent.setup();
    await user.type(screen.getByRole('searchbox', { name: /buscar/i }), 'ryzen 7{Enter}');
    expect(router.state.location.pathname).toBe('/catalogo');
    expect(router.state.location.search).toBe('?q=ryzen+7');
  });

  it('no busca con el campo vacío', async () => {
    const { router } = renderApp('/');
    const user = userEvent.setup();
    await user.type(screen.getByRole('searchbox', { name: /buscar/i }), '   {Enter}');
    expect(router.state.location.pathname).toBe('/');
  });

  it('la tecla / enfoca el buscador', async () => {
    renderApp('/');
    const user = userEvent.setup();
    await user.keyboard('/');
    expect(screen.getByRole('searchbox', { name: /buscar/i })).toHaveFocus();
  });

  it('en móvil el menú se abre, navega y se cierra', async () => {
    const { router } = renderApp('/');
    const user = userEvent.setup();
    const toggle = screen.getByRole('button', { name: 'Abrir menú' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await user.click(toggle);
    expect(screen.getByRole('button', { name: 'Cerrar menú' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    const mobile = screen.getByRole('navigation', { name: 'Principal móvil' });

    await user.click(within(mobile).getByRole('link', { name: 'Tiendas' }));
    expect(router.state.location.pathname).toBe('/tiendas');
    expect(screen.queryByRole('navigation', { name: 'Principal móvil' })).not.toBeInTheDocument();
  });

  it('Escape cierra el menú móvil', async () => {
    renderApp('/');
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Abrir menú' }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('navigation', { name: 'Principal móvil' })).not.toBeInTheDocument();
  });
});
