import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { demoUsers, signInMock } from '../../mocks/auth.js';
import { components, offers as dataOffers, stores } from '../../mocks/data.js';
import { server } from '../../mocks/node.js';
import { formatCOP } from '../../shared/lib/format.js';
import { renderApp } from '../../test/utils.jsx';

const [, seller] = demoUsers;
const route = (path) => `*/api/v1${path}`;

const ryzen = components.find((item) => item.displayName.includes('Ryzen 5 7600'));
const inStock = dataOffers.find(
  (offer) => offer.store.id === stores[0].id && offer.component.id === ryzen.id,
);
const png = (name) => new File([new Uint8Array(1000)], name, { type: 'image/png' });

const component = {
  id: ryzen.id,
  category: ryzen.category,
  brand: ryzen.brand,
  model: ryzen.model,
  displayName: ryzen.displayName,
};
const stored = (images = []) => ({
  offerId: inStock.offerId,
  status: 'active',
  priceCop: inStock.priceCop,
  condition: inStock.condition,
  warrantyMonths: inStock.warrantyMonths,
  description: 'Caja sellada',
  publishedAt: inStock.publishedAt,
  updatedAt: inStock.publishedAt,
  component,
  images,
});
const withImages = () =>
  server.use(
    http.get(route('/seller/offers'), () =>
      HttpResponse.json({
        items: [
          stored([
            { key: 'offers/s/a.png', url: '/storage/offers/s/a.png', position: 0 },
            { key: 'offers/s/b.png', url: '/storage/offers/s/b.png', position: 1 },
          ]),
        ],
      }),
    ),
  );
const capturePatch = () => {
  const calls = [];
  server.use(
    http.patch(route('/seller/offers/:id'), async ({ request }) => {
      calls.push(await request.clone().json());
      return HttpResponse.json({ offer: stored() });
    }),
  );
  return calls;
};

const stepHeading = (name) => screen.findByRole('heading', { level: 2, name });
const progress = () => screen.getByRole('progressbar');
const openEdit = async (id = inStock.offerId) => {
  signInMock(seller);
  const utils = renderApp(`/vendedor/publicar?editar=${id}`);
  await stepHeading('Condiciones comerciales');
  return { ...utils, user: userEvent.setup({ applyAccept: false }) };
};
const toPhotos = async (user) => {
  await user.click(screen.getByRole('button', { name: 'Continuar a galería de fotos' }));
  await stepHeading('Fotografías reales del producto');
};
const toReview = async (user) => {
  await toPhotos(user);
  await user.click(screen.getByRole('button', { name: 'Revisar resumen y publicar' }));
  await stepHeading('Confirmación de publicación');
};
const setPrice = async (user, value) => {
  const price = screen.getByLabelText('Precio de venta al público (COP)');
  await user.clear(price);
  await user.type(price, value);
};
const goesToInventory = (router) =>
  waitFor(() => expect(router.state.location.pathname).toBe('/vendedor/inventario'));

describe('Publicar: modo edición (?editar=)', () => {
  it('abre en las condiciones con precio, garantía y notas precargados', async () => {
    withImages();
    await openEdit();
    expect(document.title).toBe('Editar oferta · PcBuilder');
    expect(screen.getByRole('heading', { level: 1, name: 'Editar oferta' })).toBeInTheDocument();
    expect(screen.getByLabelText('Precio de venta al público (COP)')).toHaveValue('849.000');
    expect(screen.getByLabelText('Garantía (meses)')).toHaveValue('12');
    expect(screen.getByLabelText(/Notas comerciales/)).toHaveValue('Caja sellada');
    expect(progress()).toHaveAttribute('aria-valuenow', '33');
    expect(screen.getByRole('button', { name: /Paso 04/ })).toBeEnabled();
  });

  it('el producto y la condición no se pueden cambiar', async () => {
    const { user } = await openEdit();
    expect(screen.getByRole('radio', { name: /Nuevo/ })).toBeDisabled();
    expect(screen.getByRole('radio', { name: /Usado/ })).toBeDisabled();
    expect(screen.getByText(/La condición no se puede cambiar/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Paso 01/ }));
    await stepHeading('Componente de la oferta');
    expect(screen.queryByLabelText('Categoría')).not.toBeInTheDocument();
    expect(screen.getByText(/publica una oferta nueva/)).toBeInTheDocument();
    expect(await screen.findByRole('article', { name: 'Componente elegido' })).toHaveTextContent(
      ryzen.displayName,
    );
    await user.click(screen.getByRole('button', { name: 'Continuar a condiciones' }));
    await stepHeading('Condiciones comerciales');
  });

  it('guarda solo lo que cambió y vuelve al inventario con un aviso', async () => {
    const calls = capturePatch();
    const { user, router } = await openEdit();
    await setPrice(user, '800000');
    await toReview(user);
    expect(screen.getAllByText(formatCOP(800_000)).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Guardar borrador/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await goesToInventory(router);
    expect(calls).toEqual([{ priceCop: 800_000 }]);
    expect(await screen.findByText(`${ryzen.displayName} se actualizó.`)).toBeInTheDocument();
  });

  it('el precio nuevo se ve en el inventario', async () => {
    const { user, router } = await openEdit();
    await setPrice(user, '800000');
    await toReview(user);
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await goesToInventory(router);
    expect(await screen.findByText(formatCOP(800_000))).toBeInTheDocument();
  });

  it('sin cambios no llama a la API', async () => {
    withImages();
    const calls = capturePatch();
    const { user, router } = await openEdit();
    await toReview(user);
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await goesToInventory(router);
    expect(calls).toHaveLength(0);
  });

  it('muestra las fotos guardadas y envía el nuevo orden o las quitadas', async () => {
    withImages();
    const calls = capturePatch();
    const { user, router } = await openEdit();
    await toPhotos(user);
    expect(screen.getByText('2 de 5 fotos cargadas')).toBeInTheDocument();
    const list = within(screen.getByRole('list', { name: 'Fotos listas para publicar' }));
    expect(list.getAllByRole('listitem')[0]).toHaveTextContent('Foto principal');
    await user.click(list.getByRole('button', { name: 'Hacer principal Foto 2' }));
    await user.click(list.getByRole('button', { name: /^Quitar Foto 1/ }));
    await user.click(screen.getByRole('button', { name: 'Revisar resumen y publicar' }));
    await stepHeading('Confirmación de publicación');
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    await goesToInventory(router);
    expect(calls).toEqual([{ imageKeys: ['offers/s/b.png'] }]);
  });

  it('sube las fotos nuevas antes de guardar', async () => {
    const calls = capturePatch();
    const { user, router } = await openEdit();
    await toPhotos(user);
    await user.upload(screen.getByLabelText('Seleccionar fotos'), [png('nueva.png')]);
    await user.click(screen.getByRole('button', { name: 'Revisar resumen y publicar' }));
    await user.click(await screen.findByRole('button', { name: 'Guardar cambios' }));
    await goesToInventory(router);
    expect(calls).toHaveLength(1);
    expect(calls[0].imageKeys).toHaveLength(1);
    expect(calls[0].imageKeys[0]).toMatch(/^offers\/.+\.png$/);
  });

  it('si el servidor falla muestra el error y deja reintentar', async () => {
    server.use(
      http.patch(route('/seller/offers/:id'), () =>
        HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: 'x', details: null, requestId: 'r' },
          { status: 500 },
        ),
      ),
    );
    const { user } = await openEdit();
    await setPrice(user, '800000');
    await toReview(user);
    await user.click(screen.getByRole('button', { name: 'Guardar cambios' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrió un error inesperado');
    expect(screen.getByRole('button', { name: 'Guardar cambios' })).toBeEnabled();
  });

  it('una oferta que no existe ofrece volver al inventario', async () => {
    signInMock(seller);
    renderApp('/vendedor/publicar?editar=00000000-0000-4000-8000-000000000000');
    expect(
      await screen.findByRole('heading', { name: 'No encontramos esa oferta' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Volver al inventario' })).toHaveAttribute(
      'href',
      '/vendedor/inventario',
    );
  });

  it('si no carga la lista de ofertas muestra el error con reintento', async () => {
    server.use(http.get(route('/seller/offers'), () => HttpResponse.error()));
    signInMock(seller);
    renderApp(`/vendedor/publicar?editar=${inStock.offerId}`);
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });

  it('con el negocio sin verificar queda bloqueado como al publicar', async () => {
    server.use(
      http.get(route('/seller/verification/status'), () =>
        HttpResponse.json({
          status: 'pending_review',
          submittedAt: '2026-11-10T10:00:00.000Z',
          reviewerNote: null,
          deadlineAt: null,
          canReapplyAt: null,
        }),
      ),
    );
    await openEdit();
    expect(await screen.findByRole('note')).toHaveTextContent(
      'Aún no puedes publicar productos hasta que tu negocio sea verificado',
    );
    expect(screen.getByLabelText('Precio de venta al público (COP)')).toBeDisabled();
  });
});
