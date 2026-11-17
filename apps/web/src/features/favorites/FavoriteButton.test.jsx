import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { demoUsers, signInMock } from '../../mocks/auth.js';
import { findOffer } from '../../mocks/data.js';
import { server } from '../../mocks/node.js';
import { renderApp } from '../../test/utils.jsx';

const [buyer] = demoUsers;
const route = (path) => `*/api/v1${path}`;

// En la cuenta de demostración ya son favoritos el Ryzen 7 7800X3D, la RTX 4070 SUPER y la 4000D
const ryzen5 = findOffer('AMD Ryzen 5 7600').component;
const ryzen7 = findOffer('AMD Ryzen 7 7800X3D').component;

const openCatalog = async () => {
  signInMock(buyer);
  const utils = renderApp('/catalogo');
  const user = userEvent.setup();
  await screen.findAllByRole('heading', { level: 3 });
  return { ...utils, user };
};
/** El primer corazón de la pieza (una pieza con varias ofertas sale en varias tarjetas). */
const heart = async (name) =>
  (await screen.findAllByRole('button', { name: `Guardar ${name} en favoritos` }))[0];

describe('Corazón de favoritos: con sesión', () => {
  it('marca como activos los que ya son favoritos y como inactivos el resto', async () => {
    await openCatalog();
    await waitFor(async () =>
      expect(await heart(ryzen7.displayName)).toHaveAttribute('aria-pressed', 'true'),
    );
    expect(await heart(ryzen5.displayName)).toHaveAttribute('aria-pressed', 'false');
  });

  it('guardar activa el corazón, avisa y ofrece ir a la lista', async () => {
    const { user } = await openCatalog();
    const button = await heart(ryzen5.displayName);
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'));
    await user.click(button);
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'));
    expect(
      await screen.findByText(`${ryzen5.displayName} se guardó en tus favoritos.`),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ver favoritos' })).toHaveAttribute(
      'href',
      '/cuenta/favoritos',
    );
  });

  it('quitar lo desactiva y "Deshacer" lo vuelve a guardar', async () => {
    const { user } = await openCatalog();
    const button = await heart(ryzen7.displayName);
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'));
    await user.click(button);
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'));
    expect(
      await screen.findByText(`${ryzen7.displayName} se quitó de tus favoritos.`),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Deshacer' }));
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'));
    expect(
      await screen.findByText(`${ryzen7.displayName} se guardó en tus favoritos.`),
    ).toBeInTheDocument();
  });

  it('si el servidor falla revierte el cambio y avisa', async () => {
    server.use(
      http.put(route('/me/wishlist/:componentId'), () =>
        HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: 'x', details: null, requestId: 'r' },
          { status: 500 },
        ),
      ),
    );
    const { user } = await openCatalog();
    const button = await heart(ryzen5.displayName);
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'));
    await user.click(button);
    expect(await screen.findByText(/No pudimos actualizar tus favoritos/)).toBeInTheDocument();
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'));
  });

  it('un doble clic rápido manda una sola petición', async () => {
    let calls = 0;
    server.use(
      http.put(route('/me/wishlist/:componentId'), async () => {
        calls += 1;
        await new Promise((resolve) => setTimeout(resolve, 150));
        return new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await openCatalog();
    const button = await heart(ryzen5.displayName);
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'));
    await user.dblClick(button);
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'));
    expect(calls).toBe(1);
  });

  it('en la vista compacta el corazón también funciona', async () => {
    const { user } = await openCatalog();
    await user.click(screen.getByRole('button', { name: 'Vista compacta' }));
    const button = await heart(ryzen5.displayName);
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'));
    await user.click(button);
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'));
  });

  it('en la ficha del producto refleja si ya es favorito', async () => {
    signInMock(buyer);
    renderApp(`/producto/${ryzen7.id}`);
    const button = await heart(ryzen7.displayName);
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'));
  });

  it('en la ficha se puede guardar y el aviso ofrece ir a la lista', async () => {
    const user = userEvent.setup();
    signInMock(buyer);
    renderApp(`/producto/${ryzen5.id}`);
    const button = await heart(ryzen5.displayName);
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'false'));
    await user.click(button);
    await waitFor(() => expect(button).toHaveAttribute('aria-pressed', 'true'));
    expect(await screen.findByRole('link', { name: 'Ver favoritos' })).toHaveAttribute(
      'href',
      '/cuenta/favoritos',
    );
  });
});

describe('Corazón de favoritos: sin sesión', () => {
  it('lleva a ingresar y vuelve a la misma página', async () => {
    renderApp(`/producto/${ryzen5.id}`);
    const link = await screen.findByRole('link', {
      name: `Ingresa para guardar ${ryzen5.displayName} en favoritos`,
    });
    expect(link).toHaveAttribute(
      'href',
      `/ingresar?next=${encodeURIComponent(`/producto/${ryzen5.id}`)}`,
    );
  });
});
