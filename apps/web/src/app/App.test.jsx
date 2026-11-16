import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../test/utils.jsx';

describe('App', () => {
  it('muestra el inicio en la raíz', () => {
    renderApp('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Arma tu PC sin errores de compatibilidad',
    );
  });

  it.each([
    ['/armador', 'Arma tu PC'],
    ['/catalogo', 'Catálogo'],
    ['/producto/abc', 'Ficha técnica'],
    ['/vendedor/verificacion', 'Estado de verificación'],
    ['/atribucion', 'Atribución de datos'],
  ])('la ruta %s existe y muestra su pantalla', (path, title) => {
    renderApp(path);
    expect(screen.getByRole('heading', { level: 1, name: title })).toBeInTheDocument();
  });

  it('una ruta inexistente muestra la página de no encontrado con salida al inicio', () => {
    renderApp('/ruta-que-no-existe');
    expect(
      screen.getByRole('heading', { level: 1, name: 'No encontramos esa página' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir al inicio' })).toHaveAttribute('href', '/');
  });

  it('todas las pantallas llevan el pie con la atribución de BuildCores (CC BY-NC-SA 4.0)', () => {
    renderApp('/armador');
    const footer = screen.getByRole('contentinfo');
    expect(footer).toHaveTextContent('BuildCores OpenDB (CC BY-NC-SA 4.0)');
    expect(footer).toHaveTextContent('© 2026');
    expect(screen.getByRole('link', { name: 'Atribución de datos' })).toHaveAttribute(
      'href',
      '/atribucion',
    );
  });

  it('ofrece un enlace para saltar al contenido', () => {
    renderApp('/');
    expect(screen.getByRole('link', { name: 'Saltar al contenido' })).toHaveAttribute(
      'href',
      '#contenido',
    );
    expect(screen.getByRole('main')).toHaveAttribute('id', 'contenido');
  });
});
