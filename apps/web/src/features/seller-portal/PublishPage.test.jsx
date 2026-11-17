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
const png = (name = 'caja.png', size = 1000) =>
  new File([new Uint8Array(size)], name, { type: 'image/png' });

const open = async () => {
  signInMock(seller);
  const utils = renderApp('/vendedor/publicar');
  await screen.findByRole('heading', { level: 1, name: 'Publicar nueva oferta' });
  return { ...utils, user: userEvent.setup({ applyAccept: false }) };
};
const main = () => within(screen.getByRole('main'));
const progress = () => screen.getByRole('progressbar');
const stepHeading = (name) => screen.findByRole('heading', { level: 2, name });

const pickComponent = async (user, component = ryzen) => {
  await user.selectOptions(screen.getByLabelText('Categoría'), component.category);
  await screen.findByRole('option', { name: component.brand });
  await user.selectOptions(screen.getByLabelText('Marca'), component.brand);
  await screen.findByRole('option', { name: component.displayName });
  await user.selectOptions(screen.getByLabelText('Modelo'), component.componentId ?? component.id);
};
const toConditions = async (user, component = ryzen) => {
  await pickComponent(user, component);
  await user.click(screen.getByRole('button', { name: 'Confirmar componente y continuar' }));
  await stepHeading('Condiciones comerciales');
};
const toPhotos = async (user, price = '1.100.000') => {
  await toConditions(user);
  await user.type(screen.getByLabelText('Precio de venta al público (COP)'), price);
  await user.click(screen.getByRole('button', { name: 'Continuar a galería de fotos' }));
  await stepHeading('Fotografías reales del producto');
};
const toReview = async (user, price) => {
  await toPhotos(user, price);
  await user.click(screen.getByRole('button', { name: 'Revisar resumen y publicar' }));
  await stepHeading('Confirmación de publicación');
};

const unverified = () =>
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

describe('Publicar: encabezado y progreso', () => {
  it('muestra el título, la ruta, el chip de verificación y la atribución', async () => {
    await open();
    expect(document.title).toBe('Publicar producto · PcBuilder');
    expect(await main().findByRole('link', { name: /Verificado/ })).toHaveAttribute(
      'href',
      '/vendedor/verificacion',
    );
    expect(screen.getByRole('main')).toHaveTextContent('BuildCores OpenDB (CC BY-NC-SA 4.0)');
  });

  it('empieza en el paso 1 con 0 % y solo ese paso se puede abrir', async () => {
    await open();
    expect(progress()).toHaveAttribute('aria-valuenow', '0');
    expect(screen.getByText('0% completado')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Paso 01/ })).toHaveAttribute('aria-current', 'step');
    expect(screen.getByRole('button', { name: /Paso 02/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Paso 04/ })).toBeDisabled();
  });

  it('no inventa cifras del prototipo', async () => {
    await open();
    expect(document.body).not.toHaveTextContent(
      /142 placas|Comisión|latencia|HASH|v2\.4|Simular tienda|320 impresiones/i,
    );
  });
});

describe('Publicar: paso 1, componente', () => {
  it('las marcas y los modelos dependen de la categoría y la marca elegidas', async () => {
    const { user } = await open();
    expect(screen.getByLabelText('Marca')).toBeDisabled();
    expect(screen.getByLabelText('Modelo')).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('Categoría'), 'cpu');
    await screen.findByRole('option', { name: 'AMD' });
    expect(screen.getByLabelText('Modelo')).toBeDisabled();
    await user.selectOptions(screen.getByLabelText('Marca'), 'AMD');
    await screen.findByRole('option', { name: ryzen.displayName });
    const models = within(screen.getByLabelText('Modelo')).getAllByRole('option');
    for (const option of models.slice(1)) expect(option).toHaveTextContent(/AMD/);
  });

  it('cambiar la categoría borra la marca y el modelo elegidos', async () => {
    const { user } = await open();
    await pickComponent(user);
    await user.selectOptions(screen.getByLabelText('Categoría'), 'gpu');
    expect(screen.getByLabelText('Marca')).toHaveValue('');
    expect(screen.queryByRole('article', { name: 'Componente elegido' })).not.toBeInTheDocument();
  });

  it('al elegir el modelo muestra la ficha con datos técnicos reales', async () => {
    const { user } = await open();
    await pickComponent(user);
    const card = within(await screen.findByRole('article', { name: 'Componente elegido' }));
    expect(card.getByText(ryzen.displayName)).toBeInTheDocument();
    expect(card.getByText('Base verificada')).toBeInTheDocument();
    expect(card.getByText(ryzen.specs.socket)).toBeInTheDocument();
  });

  it('sin elegir nada avisa por dónde empezar y no avanza', async () => {
    const { user } = await open();
    await user.click(screen.getByRole('button', { name: 'Confirmar componente y continuar' }));
    expect(await screen.findByText('Elige la categoría del componente')).toBeInTheDocument();
    expect(screen.getByLabelText('Categoría')).toHaveAttribute('aria-invalid', 'true');
    expect(progress()).toHaveAttribute('aria-valuenow', '0');
  });

  it('con la categoría y sin marca pide la marca', async () => {
    const { user } = await open();
    await user.selectOptions(screen.getByLabelText('Categoría'), 'cpu');
    await user.click(screen.getByRole('button', { name: 'Confirmar componente y continuar' }));
    expect(await screen.findByText('Elige la marca')).toBeInTheDocument();
  });

  it('si falla la carga de marcas muestra el error con reintento', async () => {
    server.use(http.get(route('/catalog/brands'), () => HttpResponse.error()));
    const { user } = await open();
    await user.selectOptions(screen.getByLabelText('Categoría'), 'cpu');
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});

describe('Publicar: paso 2, condiciones', () => {
  it('avanza con 33 %, formatea el precio con puntos y muestra la referencia real', async () => {
    const { user } = await open();
    await toConditions(user);
    expect(progress()).toHaveAttribute('aria-valuenow', '33');
    const price = screen.getByLabelText('Precio de venta al público (COP)');
    await user.type(price, '849000');
    expect(price).toHaveValue('849.000');
    const reference = within(
      await screen.findByRole('complementary', { name: 'Referencia de mercado' }),
    );
    // Dos ofertas del Ryzen 5 7600: 849.000 y 879.000
    expect(await reference.findByText(formatCOP(864_000))).toBeInTheDocument();
    expect(reference.getByText(/Mín: .*849\.000.* Máx: .*879\.000/)).toBeInTheDocument();
    expect(reference.getByText(/1,7\s?% por debajo del promedio/)).toBeInTheDocument();
  });

  it('sin 2 ofertas del producto no inventa referencia', async () => {
    server.use(
      http.get(route('/offers'), () => HttpResponse.json({ items: [], nextCursor: null })),
    );
    const { user } = await open();
    await toConditions(user);
    expect(await screen.findByText(/Aún no hay referencia/)).toBeInTheDocument();
  });

  it('la condición es "Nuevo" por defecto y se puede cambiar', async () => {
    const { user } = await open();
    await toConditions(user);
    expect(screen.getByRole('radio', { name: /Nuevo/ })).toBeChecked();
    await user.click(screen.getByRole('radio', { name: /Usado/ }));
    expect(screen.getByRole('radio', { name: /Usado/ })).toBeChecked();
  });

  it('stock y SKU están deshabilitados como "Próximamente"', async () => {
    const { user } = await open();
    await toConditions(user);
    expect(screen.getByLabelText(/Stock en sede/)).toBeDisabled();
    expect(screen.getByLabelText(/SKU interno/)).toBeDisabled();
  });

  it('valida precio, garantía y largo de las notas', async () => {
    const { user } = await open();
    await toConditions(user);
    await user.clear(screen.getByLabelText('Garantía (meses)'));
    await user.type(screen.getByLabelText('Garantía (meses)'), '200');
    await user.click(screen.getByRole('button', { name: 'Continuar a galería de fotos' }));
    expect(await screen.findByText(/precio entero mayor que 0/)).toBeInTheDocument();
    expect(screen.getByText('Escribe los meses de garantía, entre 0 y 120')).toBeInTheDocument();
    expect(screen.getByLabelText('Precio de venta al público (COP)')).toHaveAttribute(
      'aria-invalid',
      'true',
    );
    expect(progress()).toHaveAttribute('aria-valuenow', '33');
  });

  it('"Paso anterior" vuelve al componente conservando lo elegido', async () => {
    const { user } = await open();
    await toConditions(user);
    await user.click(screen.getByRole('button', { name: 'Paso anterior' }));
    await stepHeading('Selección del componente canónico');
    expect(screen.getByLabelText('Modelo')).toHaveValue(ryzen.id);
  });

  it('el título del paso recibe el foco al cambiar de paso', async () => {
    const { user } = await open();
    await toConditions(user);
    expect(await stepHeading('Condiciones comerciales')).toHaveFocus();
  });
});

describe('Publicar: paso 3, fotos', () => {
  it('sube fotos válidas, la primera es la principal y se pueden quitar', async () => {
    const { user } = await open();
    await toPhotos(user);
    expect(screen.getByText('0 de 5 fotos cargadas')).toBeInTheDocument();
    await user.upload(screen.getByLabelText('Seleccionar fotos'), [png('uno.png'), png('dos.png')]);
    expect(await screen.findByText('2 de 5 fotos cargadas')).toBeInTheDocument();
    const list = within(screen.getByRole('list', { name: 'Fotos listas para publicar' }));
    const items = list.getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Foto principal');
    expect(items[1]).not.toHaveTextContent('Foto principal');
    await user.click(list.getByRole('button', { name: 'Hacer principal dos.png' }));
    expect(list.getAllByRole('listitem')[0]).toHaveTextContent('dos.png');
    await user.click(list.getByRole('button', { name: 'Quitar dos.png' }));
    expect(await screen.findByText('1 de 5 fotos cargadas')).toBeInTheDocument();
  });

  it('rechaza formatos que la API no acepta y archivos de más de 5 MB', async () => {
    const { user } = await open();
    await toPhotos(user);
    await user.upload(screen.getByLabelText('Seleccionar fotos'), [
      new File(['x'], 'raro.webp', { type: 'image/webp' }),
      png('enorme.png', 5 * 1024 * 1024 + 1),
    ]);
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('raro.webp: Solo se aceptan fotos JPG o PNG');
    expect(alert).toHaveTextContent('enorme.png: Cada foto puede pesar hasta 5 MB');
    expect(screen.getByText('0 de 5 fotos cargadas')).toBeInTheDocument();
  });

  it('no deja pasar de 5 fotos', async () => {
    const { user } = await open();
    await toPhotos(user);
    await user.upload(
      screen.getByLabelText('Seleccionar fotos'),
      ['a', 'b', 'c', 'd', 'e', 'f'].map((name) => png(`${name}.png`)),
    );
    expect(await screen.findByText('5 de 5 fotos cargadas')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('f.png: ya tienes 5 fotos');
    expect(screen.getByRole('button', { name: 'Seleccionar archivos locales' })).toBeDisabled();
  });

  it('las fotos son opcionales', async () => {
    const { user } = await open();
    await toReview(user);
    expect(progress()).toHaveAttribute('aria-valuenow', '100');
    expect(screen.getByText('Sin fotos')).toBeInTheDocument();
  });
});

describe('Publicar: paso 4, resumen y publicación', () => {
  it('muestra los datos reales, la vista previa y el borrador como "Próximamente"', async () => {
    const { user } = await open();
    await toReview(user);
    const summary = main();
    expect(summary.getByText(`${ryzen.displayName} · Procesadores`)).toBeInTheDocument();
    expect(summary.getAllByText(formatCOP(1_100_000)).length).toBeGreaterThan(0);
    expect(summary.getByText('Garantía 12 meses')).toBeInTheDocument();
    const preview = within(
      summary.getByRole('complementary', { name: 'Vista previa para el usuario' }),
    );
    expect(preview.getByText(ryzen.displayName)).toBeInTheDocument();
    expect(await preview.findByText('TecnoPasarela Cali')).toBeInTheDocument();
    expect(summary.getByRole('button', { name: /Guardar borrador/ })).toBeDisabled();
    expect(document.body).not.toHaveTextContent(/impresiones|intenciones de clic/i);
  });

  it('"Modificar" vuelve al primer paso y se puede saltar de nuevo al resumen', async () => {
    const { user } = await open();
    await toReview(user);
    await user.click(screen.getByRole('button', { name: 'Modificar' }));
    await stepHeading('Selección del componente canónico');
    await user.click(screen.getByRole('button', { name: /Paso 04/ }));
    await stepHeading('Confirmación de publicación');
  });

  it('publica con fotos, avisa y lleva al inventario donde aparece la oferta', async () => {
    let created;
    server.use(
      http.post(route('/seller/offers'), async ({ request }) => {
        created = await request.clone().json();
        return undefined;
      }),
    );
    const { user, router } = await open();
    await toConditions(user);
    await user.click(screen.getByRole('radio', { name: /Usado/ }));
    await user.type(screen.getByLabelText('Precio de venta al público (COP)'), '1.100.000');
    await user.click(screen.getByRole('button', { name: 'Continuar a galería de fotos' }));
    await stepHeading('Fotografías reales del producto');
    await user.upload(screen.getByLabelText('Seleccionar fotos'), [png('uno.png')]);
    await user.click(screen.getByRole('button', { name: 'Revisar resumen y publicar' }));
    await stepHeading('Confirmación de publicación');
    await user.click(screen.getByRole('button', { name: 'Publicar oferta ahora' }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/vendedor/inventario'));
    expect(created.imageKeys).toHaveLength(1);
    expect(created).toMatchObject({ componentId: ryzen.id, priceCop: 1_100_000 });
    expect(
      await screen.findByText(`${ryzen.displayName} se publicó en tu inventario.`),
    ).toBeInTheDocument();
  });

  it('un producto ya publicado en ese estado da el aviso de duplicado con enlace al inventario', async () => {
    const { user } = await open();
    await toReview(user);
    // El Ryzen 5 7600 nuevo ya está en el inventario de TecnoPasarela
    expect(inStock.condition).toBe('new');
    await user.click(screen.getByRole('button', { name: 'Publicar oferta ahora' }));
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Ya tienes publicado este producto en ese estado.');
    expect(within(alert).getByRole('link', { name: 'Ver mi inventario' })).toHaveAttribute(
      'href',
      '/vendedor/inventario',
    );
    expect(screen.getByRole('button', { name: 'Publicar oferta ahora' })).toBeEnabled();
  });

  it('si falla la subida de una foto conserva los datos y reintenta solo esa foto', async () => {
    let puts = 0;
    server.use(
      http.put(route('/seller/offers/images/:name'), () => {
        puts += 1;
        return puts === 2
          ? HttpResponse.json(
              { code: 'FILE_REJECTED', message: 'x', details: null, requestId: 'r' },
              { status: 422 },
            )
          : new HttpResponse(null, { status: 204 });
      }),
    );
    const { user } = await open();
    await toConditions(user);
    await user.click(screen.getByRole('radio', { name: /Usado/ }));
    await user.type(screen.getByLabelText('Precio de venta al público (COP)'), '900000');
    await user.click(screen.getByRole('button', { name: 'Continuar a galería de fotos' }));
    await stepHeading('Fotografías reales del producto');
    await user.upload(screen.getByLabelText('Seleccionar fotos'), [png('uno.png'), png('dos.png')]);
    await user.click(screen.getByRole('button', { name: 'Revisar resumen y publicar' }));
    await user.click(await screen.findByRole('button', { name: 'Publicar oferta ahora' }));
    const status = within(await screen.findByRole('list', { name: 'Estado de las fotos' }));
    await waitFor(() => expect(status.getByText('Falló')).toBeInTheDocument());
    expect(status.getByText('Subida')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('El archivo debe ser PDF, JPG o PNG');
    expect(screen.getByText(/Usado \(garantizado\)/)).toBeInTheDocument();
    // Reintento: solo se vuelve a subir la que falló (1 foto, no 2)
    await user.click(screen.getByRole('button', { name: 'Publicar oferta ahora' }));
    await waitFor(() => expect(puts).toBe(3));
  });

  it('mientras publica deshabilita el botón', async () => {
    let release;
    server.use(
      http.post(route('/seller/offers'), async () => {
        await new Promise((resolve) => {
          release = resolve;
        });
        return HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: 'x', details: null, requestId: 'r' },
          { status: 500 },
        );
      }),
    );
    const { user } = await open();
    await toReview(user);
    await user.click(screen.getByRole('button', { name: 'Publicar oferta ahora' }));
    expect(await screen.findByRole('button', { name: 'Publicando…' })).toBeDisabled();
    release();
    expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrió un error inesperado');
  });
});

describe('Publicar: negocio sin verificar', () => {
  it('muestra el aviso exacto, bloquea el formulario y enlaza a la verificación', async () => {
    unverified();
    await open();
    const note = await screen.findByRole('note');
    expect(note).toHaveTextContent(
      'Aún no puedes publicar productos hasta que tu negocio sea verificado',
    );
    expect(within(note).getByRole('link', { name: /Ver estado de verificación/ })).toHaveAttribute(
      'href',
      '/vendedor/verificacion',
    );
    expect(screen.getByLabelText('Categoría')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Confirmar componente y continuar' })).toBeDisabled();
    expect(main().getByRole('link', { name: /En revisión/ })).toBeInTheDocument();
  });
});
