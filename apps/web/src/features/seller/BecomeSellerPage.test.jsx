import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { demoUsers, signInMock } from '../../mocks/auth.js';
import { publicStores } from '../../mocks/data.js';
import { server } from '../../mocks/node.js';
import { renderApp } from '../../test/utils.jsx';

const [buyer, seller] = demoUsers;
const route = (path) => `*/api/v1${path}`;

const open = async (account) => {
  if (account) signInMock(account);
  const utils = renderApp('/vender');
  await screen.findByRole('heading', { level: 1, name: /Impulsa tus ventas de hardware/ });
  return { ...utils, user: userEvent.setup() };
};
const form = () =>
  within(screen.getByRole('region', { name: 'Comienza la auditoría de tu establecimiento' }));

const fill = async (user, overrides = {}) => {
  const values = {
    legalName: 'Soluciones Informáticas SAS',
    tradeName: 'InfoSol',
    nit: '900.234.567-8',
    whatsapp: '310 123 4567',
    address: 'Local 77, C.C. Unilago',
    location: 'bogota-unilago',
    certify: true,
    ...overrides,
  };
  const f = form();
  if (values.legalName)
    await user.type(f.getByLabelText('Razón social de la empresa'), values.legalName);
  if (values.tradeName)
    await user.type(f.getByLabelText('Nombre comercial de la tienda'), values.tradeName);
  if (values.nit) await user.type(f.getByLabelText('NIT (con dígito de verificación)'), values.nit);
  if (values.whatsapp)
    await user.type(f.getByLabelText('WhatsApp comercial de ventas (+57)'), values.whatsapp);
  if (values.address)
    await user.type(f.getByLabelText('Dirección o número de local'), values.address);
  if (values.location)
    await user.selectOptions(
      f.getByLabelText('Ciudad principal y centro comercial'),
      values.location,
    );
  if (values.certify) await user.click(f.getByRole('checkbox'));
};
const submit = (user) =>
  user.click(form().getByRole('button', { name: /Radicar solicitud de vendedor/ }));

describe('Ser vendedor: contenido', () => {
  it('muestra la promesa, los accesos y el ejemplo rotulado como ilustrativo', async () => {
    await open();
    expect(document.title).toBe('Ser vendedor · PcBuilder');
    expect(screen.getByText('0% de comisión por transacción')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Quiero vender/ })[0]).toHaveAttribute(
      'href',
      '#postulacion',
    );
    expect(screen.getByRole('link', { name: /Conoce los requisitos legales/ })).toHaveAttribute(
      'href',
      '#requisitos',
    );
    const example = within(
      screen.getByRole('complementary', { name: 'Ejemplo ilustrativo de una cotización' }),
    );
    expect(example.getByText('Ejemplo ilustrativo')).toBeInTheDocument();
    expect(example.getByText(/no corresponden a una venta real/)).toBeInTheDocument();
  });

  it('incluye las ventajas, los cuatro requisitos y los cuatro pasos', async () => {
    await open();
    expect(
      screen.getByRole('heading', { name: /Diseñado para maximizar el margen/ }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(
      expect.arrayContaining([
        'Publica tus ofertas en el catálogo',
        'Contacto directo por WhatsApp y mostrador',
        '0 % de comisión por venta (cero intermediarios)',
        'RUT actualizado (DIAN)',
        'Cámara de Comercio vigente',
        'Cédula del representante legal',
        'Facturación DIAN y garantía real',
        'Diligenciamiento de datos',
        'Carga de documentos',
        'Revisión por un administrador',
        'Activación del perfil de tienda',
      ]),
    );
    expect(screen.getByText(/no se admiten personas naturales/i)).toBeInTheDocument();
  });

  it('la carga de documentos se marca como "Próximamente"', async () => {
    await open();
    const step = screen.getByRole('heading', { name: 'Carga de documentos' }).closest('li');
    expect(within(step).getByText('Próximamente')).toBeInTheDocument();
  });

  it('no afirma cifras, plazos ni testimonios inventados', async () => {
    await open();
    expect(document.body).not.toHaveTextContent(
      /120\.000|99[.,]4|SpeedLogic|menos de 24|< ?35 min|TLS 1\.3|Vigencia 2025|Lead cualificado|alianzas@pcbuilder/i,
    );
  });

  it('las cifras reales salen de las tiendas verificadas', async () => {
    await open();
    const offers = publicStores.reduce((sum, store) => sum + store.offersCount, 0);
    expect(await screen.findByText(String(publicStores.length))).toBeInTheDocument();
    expect(screen.getByText('tiendas verificadas')).toBeInTheDocument();
    expect(screen.getByText(String(offers))).toBeInTheDocument();
    expect(screen.getByText('cobrados en comisiones de venta')).toBeInTheDocument();
  });

  it('muestra una tienda verificada real con enlace a su perfil', async () => {
    await open();
    const card = within(await screen.findByRole('article', { name: 'Una tienda verificada' }));
    expect(card.getByRole('link', { name: /Ver su perfil/ })).toHaveAttribute(
      'href',
      expect.stringMatching(/^\/tiendas\//),
    );
    expect(card.getByText('Comercio verificado')).toBeInTheDocument();
  });

  it('si fallan las cifras avisa y deja la de comisiones', async () => {
    server.use(http.get(route('/stores'), () => HttpResponse.error()));
    await open();
    expect(await screen.findByText(/No pudimos cargar las cifras/)).toBeInTheDocument();
    expect(screen.getByText('cobrados en comisiones de venta')).toBeInTheDocument();
  });
});

describe('Ser vendedor: según quién entra', () => {
  it('sin sesión el formulario está deshabilitado y pide ingresar o crear cuenta', async () => {
    await open();
    const f = form();
    expect(f.getByLabelText('Razón social de la empresa')).toBeDisabled();
    expect(f.getByRole('button', { name: /Radicar solicitud/ })).toBeDisabled();
    expect(f.getByRole('link', { name: 'Ingresa' })).toHaveAttribute(
      'href',
      '/ingresar?next=%2Fvender',
    );
    expect(f.getByRole('link', { name: 'crea una cuenta' })).toHaveAttribute(
      'href',
      '/registro?next=%2Fvender',
    );
  });

  it('un comprador ve el formulario activo', async () => {
    await open(buyer);
    await waitFor(() => expect(form().getByLabelText('Razón social de la empresa')).toBeEnabled());
    expect(form().queryByText(/necesitas una cuenta/)).not.toBeInTheDocument();
  });

  it('el correo corporativo y el sitio web están deshabilitados como "Próximamente"', async () => {
    await open(buyer);
    expect(form().getByLabelText('Correo electrónico corporativo')).toBeDisabled();
    expect(form().getByLabelText('Sitio web o catálogo actual (opcional)')).toBeDisabled();
    expect(form().getAllByText('Próximamente')).toHaveLength(2);
  });

  it('un vendedor ve que ya lo es y enlaces a su panel', async () => {
    await open(seller);
    expect(
      await form().findByRole('heading', { name: 'Tu cuenta ya es de vendedor' }),
    ).toBeInTheDocument();
    expect(form().getByRole('link', { name: 'Ir a mi panel' })).toHaveAttribute(
      'href',
      '/vendedor',
    );
    expect(form().queryByLabelText('Razón social de la empresa')).not.toBeInTheDocument();
  });
});

describe('Ser vendedor: validación', () => {
  it('con todo vacío avisa campo por campo y no llama a la API', async () => {
    let calls = 0;
    server.use(
      http.post(route('/seller/convert'), () => {
        calls += 1;
        return HttpResponse.json({});
      }),
    );
    const { user } = await open(buyer);
    await waitFor(() => expect(form().getByLabelText('Razón social de la empresa')).toBeEnabled());
    await submit(user);
    expect(await form().findByText('Escribe la razón social de la empresa')).toBeInTheDocument();
    expect(form().getByText('Escribe el nombre comercial de tu tienda')).toBeInTheDocument();
    expect(form().getByText('Escribe el NIT con su dígito de verificación')).toBeInTheDocument();
    expect(form().getByText('Escribe el WhatsApp comercial de ventas')).toBeInTheDocument();
    expect(form().getByText('Elige tu ciudad y centro comercial')).toBeInTheDocument();
    expect(
      form().getByText('Debes certificar que representas a una persona jurídica'),
    ).toBeInTheDocument();
    expect(calls).toBe(0);
  });

  it('un NIT sin dígito de verificación o un celular que no empieza en 3 se rechazan', async () => {
    const { user } = await open(buyer);
    await waitFor(() => expect(form().getByLabelText('Razón social de la empresa')).toBeEnabled());
    await fill(user, { nit: '900234567', whatsapp: '2101234567' });
    await submit(user);
    expect(await form().findByText(/NIT con dígito de verificación, p\. ej\./)).toBeInTheDocument();
    expect(
      form().getByText('Celular colombiano: 10 dígitos que empiezan en 3'),
    ).toBeInTheDocument();
  });

  it('"Otra ubicación" pide la ciudad y el departamento', async () => {
    const { user } = await open(buyer);
    await waitFor(() => expect(form().getByLabelText('Razón social de la empresa')).toBeEnabled());
    expect(form().queryByLabelText('Ciudad')).not.toBeInTheDocument();
    await fill(user, { location: 'other' });
    expect(form().getByLabelText('Ciudad')).toBeInTheDocument();
    await submit(user);
    expect(await form().findByText('Escribe la ciudad')).toBeInTheDocument();
    expect(form().getByText('Escribe el departamento')).toBeInTheDocument();
  });
});

describe('Ser vendedor: enviar la solicitud', () => {
  it('convierte la cuenta, guarda el negocio y muestra los siguientes pasos', async () => {
    const calls = [];
    server.events.on('request:start', ({ request }) => {
      if (request.url.includes('/seller/'))
        calls.push(`${request.method} ${new URL(request.url).pathname}`);
    });
    let patch;
    server.use(
      http.patch(route('/seller/store'), async ({ request }) => {
        patch = await request.clone().json();
        return undefined;
      }),
    );
    const { user } = await open(buyer);
    await waitFor(() => expect(form().getByLabelText('Razón social de la empresa')).toBeEnabled());
    await fill(user);
    await submit(user);

    expect(
      await form().findByRole('heading', { name: '¡Solicitud radicada!' }),
    ).toBeInTheDocument();
    expect(form().getByRole('link', { name: 'Ver el estado de verificación' })).toHaveAttribute(
      'href',
      '/vendedor/verificacion',
    );
    expect(form().getByRole('link', { name: 'Completar mi negocio' })).toHaveAttribute(
      'href',
      '/vendedor/negocio',
    );
    expect(calls).toEqual(['POST /api/v1/seller/convert', 'PATCH /api/v1/seller/store']);
    expect(patch).toEqual({
      nit: '900234567-8',
      whatsappE164: '+573101234567',
      address: 'Local 77, C.C. Unilago',
      city: 'Bogotá',
      department: 'Bogotá D.C.',
      commercialCenter: 'C.C. Unilago',
    });
    server.events.removeAllListeners();
  });

  it('tras convertirse la sesión pasa a vendedor (token nuevo)', async () => {
    const { user } = await open(buyer);
    await waitFor(() => expect(form().getByLabelText('Razón social de la empresa')).toBeEnabled());
    await fill(user);
    await submit(user);
    await form().findByRole('heading', { name: '¡Solicitud radicada!' });
    // Con la sesión de vendedor, el panel del vendedor deja de estar bloqueado
    await user.click(form().getByRole('link', { name: 'Completar mi negocio' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Ajustes de tienda' }),
    ).toBeInTheDocument();
  });

  it('con "Otra ubicación" envía la ciudad y el departamento escritos', async () => {
    let patch;
    server.use(
      http.patch(route('/seller/store'), async ({ request }) => {
        patch = await request.clone().json();
        return undefined;
      }),
    );
    const { user } = await open(buyer);
    await waitFor(() => expect(form().getByLabelText('Razón social de la empresa')).toBeEnabled());
    await fill(user, { location: 'other' });
    await user.type(form().getByLabelText('Ciudad'), 'Bucaramanga');
    await user.type(form().getByLabelText('Departamento'), 'Santander');
    await submit(user);
    await form().findByRole('heading', { name: '¡Solicitud radicada!' });
    expect(patch).toMatchObject({
      city: 'Bucaramanga',
      department: 'Santander',
      commercialCenter: null,
    });
  });

  it('si la conversión falla muestra el error y deja corregir', async () => {
    server.use(
      http.post(route('/seller/convert'), () =>
        HttpResponse.json(
          { code: 'ROLE_FORBIDDEN', message: 'x', details: null, requestId: 'r' },
          { status: 403 },
        ),
      ),
    );
    const { user } = await open(buyer);
    await waitFor(() => expect(form().getByLabelText('Razón social de la empresa')).toBeEnabled());
    await fill(user);
    await submit(user);
    expect(await form().findByRole('alert')).toHaveTextContent(
      'No tienes permiso para esta acción.',
    );
    expect(form().getByLabelText('Razón social de la empresa')).toHaveValue(
      'Soluciones Informáticas SAS',
    );
  });

  it('si guardar el negocio falla avisa que la cuenta ya es de vendedor', async () => {
    server.use(
      http.patch(route('/seller/store'), () =>
        HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'x', details: null, requestId: 'r' },
          { status: 422 },
        ),
      ),
    );
    const { user } = await open(buyer);
    await waitFor(() => expect(form().getByLabelText('Razón social de la empresa')).toBeEnabled());
    await fill(user);
    await submit(user);
    expect(
      await form().findByRole('heading', {
        name: 'Tu cuenta ya es de vendedor, pero faltan datos',
      }),
    ).toBeInTheDocument();
    expect(form().getByText(/Hay datos que no son válidos/)).toBeInTheDocument();
    expect(form().getByRole('link', { name: 'Completar mi negocio' })).toBeInTheDocument();
  });

  it('un fallo de red al convertir avisa que no se pudo conectar', async () => {
    server.use(http.post(route('/seller/convert'), () => HttpResponse.error()));
    const { user } = await open(buyer);
    await waitFor(() => expect(form().getByLabelText('Razón social de la empresa')).toBeEnabled());
    await fill(user);
    await submit(user);
    expect(await form().findByRole('alert')).toHaveTextContent(/No pudimos conectar/);
  });

  it('mientras envía deshabilita el botón', async () => {
    let release;
    server.use(
      http.post(route('/seller/convert'), async () => {
        await new Promise((resolve) => {
          release = resolve;
        });
        return HttpResponse.json(
          { code: 'VALIDATION_ERROR', message: 'x', details: null, requestId: 'r' },
          { status: 422 },
        );
      }),
    );
    const { user } = await open(buyer);
    await waitFor(() => expect(form().getByLabelText('Razón social de la empresa')).toBeEnabled());
    await fill(user);
    await submit(user);
    expect(await form().findByRole('button', { name: 'Radicando tu solicitud…' })).toBeDisabled();
    release();
    await form().findByRole('alert');
  });
});
