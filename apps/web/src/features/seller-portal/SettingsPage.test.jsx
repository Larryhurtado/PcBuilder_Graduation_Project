import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { demoUsers, signInMock } from '../../mocks/auth.js';
import { stores } from '../../mocks/data.js';
import { server } from '../../mocks/node.js';
import { renderApp } from '../../test/utils.jsx';

const [, seller] = demoUsers;
const route = (path) => `*/api/v1${path}`;

const status = (value) =>
  server.use(
    http.get(route('/seller/verification/status'), () =>
      HttpResponse.json({
        status: value,
        submittedAt: null,
        reviewerNote: null,
        deadlineAt: null,
        canReapplyAt: null,
      }),
    ),
  );
const capturePatch = () => {
  const calls = [];
  server.use(
    http.patch(route('/seller/store'), async ({ request }) => {
      calls.push(await request.clone().json());
      return undefined;
    }),
  );
  return calls;
};

const open = async () => {
  signInMock(seller);
  const utils = renderApp('/vendedor/negocio');
  await screen.findByRole('heading', { level: 1, name: 'Ajustes de tienda' });
  await screen.findByLabelText('Nombre comercial');
  return { ...utils, user: userEvent.setup() };
};
const field = (name) => screen.getByLabelText(name);
const saveButtons = () => screen.getAllByRole('button', { name: /Guardar cambios|Guardando/ });
const rename = async (user, value = 'Tienda Nueva') => {
  await user.clear(field('Nombre comercial'));
  await user.type(field('Nombre comercial'), value);
};

describe('Ajustes de tienda: pantalla', () => {
  it('muestra los datos guardados del negocio', async () => {
    await open();
    expect(document.title).toBe('Ajustes de tienda · PcBuilder');
    expect(field('Nombre comercial')).toHaveValue('TecnoPasarela Cali');
    expect(field('Razón social')).toHaveValue('TecnoPasarela Cali SAS');
    expect(field('NIT')).toHaveValue('900542189-1');
    expect(field('Ciudad y centro comercial')).toHaveValue('cali-pasarela');
    expect(field('Línea móvil de cotizaciones')).toHaveValue(
      stores[0].whatsappE164.replace('+57', ''),
    );
    expect(
      await within(screen.getByRole('main')).findByRole('link', { name: /Verificado/ }),
    ).toHaveAttribute('href', '/vendedor/verificacion');
  });

  it('no inventa datos del prototipo', async () => {
    await open();
    expect(document.body).not.toHaveTextContent(
      /Street View|#9041|Forzar Sync|cada 30 segundos|Sede Validada|Unilago hace|v2\.4/i,
    );
  });

  it('la barra de secciones enlaza a cada bloque', async () => {
    await open();
    const nav = within(screen.getByRole('navigation', { name: 'Secciones' }));
    expect(nav.getByRole('link', { name: /Perfil comercial/ })).toHaveAttribute('href', '#perfil');
    expect(nav.getByRole('link', { name: /Ubicación/ })).toHaveAttribute('href', '#ubicacion');
    expect(nav.getByRole('link', { name: /WhatsApp y horario/ })).toHaveAttribute(
      'href',
      '#whatsapp',
    );
    expect(nav.getByRole('link', { name: /Preferencias de inventario/ })).toHaveAttribute(
      'href',
      '#inventario',
    );
    expect(nav.getByRole('button', { name: /Seguridad y accesos/ })).toBeDisabled();
  });

  it('lo que aún no existe está deshabilitado como "Próximamente"', async () => {
    await open();
    expect(screen.getByRole('button', { name: /Cambiar logo/ })).toBeDisabled();
    expect(screen.getByLabelText(/Plantilla del mensaje de WhatsApp/)).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Editar horario' })).toBeDisabled();
    expect(
      screen.getByRole('switch', { name: /Alertas de bajo stock.*próximamente/i }),
    ).toBeDisabled();
    expect(screen.getByRole('switch', { name: /Pausar catálogo.*próximamente/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Contactar' })).toBeDisabled();
  });

  it('si no carga el negocio ofrece reintentar', async () => {
    server.use(http.get(route('/seller/store'), () => HttpResponse.error()));
    signInMock(seller);
    renderApp('/vendedor/negocio');
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});

describe('Ajustes de tienda: razón social y NIT', () => {
  it('con el negocio verificado están bloqueados y lo explican', async () => {
    await open();
    expect(field('Razón social')).toBeDisabled();
    expect(field('NIT')).toBeDisabled();
    expect(screen.getByText(/contacta a soporte/)).toBeInTheDocument();
  });

  it('sin enviar la verificación se pueden editar', async () => {
    status('not_submitted');
    await open();
    await waitFor(() => expect(field('NIT')).toBeEnabled());
    expect(field('Razón social')).toBeEnabled();
  });
});

describe('Ajustes de tienda: guardar', () => {
  it('sin cambios no deja guardar ni descartar', async () => {
    await open();
    for (const button of saveButtons()) expect(button).toBeDisabled();
    expect(screen.getAllByRole('button', { name: 'Descartar' })[0]).toBeDisabled();
    expect(screen.getByText('No hay cambios por guardar.')).toBeInTheDocument();
  });

  it('guarda solo el campo cambiado y avisa', async () => {
    const calls = capturePatch();
    const { user } = await open();
    await rename(user);
    expect(screen.getByText('Tienes cambios sin guardar.')).toBeInTheDocument();
    await user.click(saveButtons()[0]);
    expect(await screen.findByText('Cambios guardados.')).toBeInTheDocument();
    expect(calls).toEqual([{ tradeName: 'Tienda Nueva' }]);
    await waitFor(() =>
      expect(screen.getByText('No hay cambios por guardar.')).toBeInTheDocument(),
    );
    expect(field('Nombre comercial')).toHaveValue('Tienda Nueva');
  });

  it('el botón de abajo también guarda', async () => {
    const calls = capturePatch();
    const { user } = await open();
    await user.clear(field('Descripción'));
    await user.type(field('Descripción'), 'Especialistas en ensamble');
    await user.click(saveButtons().at(-1));
    await screen.findByText('Cambios guardados.');
    expect(calls).toEqual([{ description: 'Especialistas en ensamble' }]);
  });

  it('el celular se envía con +57 y la ubicación cambia ciudad y centro comercial', async () => {
    const calls = capturePatch();
    const { user } = await open();
    await user.clear(field('Línea móvil de cotizaciones'));
    await user.type(field('Línea móvil de cotizaciones'), '310 845 9201');
    await user.selectOptions(field('Ciudad y centro comercial'), 'bogota-unilago');
    await user.click(saveButtons()[0]);
    await screen.findByText('Cambios guardados.');
    expect(calls).toEqual([
      {
        whatsappE164: '+573108459201',
        city: 'Bogotá',
        department: 'Bogotá D.C.',
        commercialCenter: 'C.C. Unilago',
      },
    ]);
  });

  it('"Otra ubicación" pide ciudad y departamento', async () => {
    const calls = capturePatch();
    const { user } = await open();
    await user.selectOptions(field('Ciudad y centro comercial'), 'other');
    await user.click(saveButtons()[0]);
    expect(await screen.findByText('Escribe la ciudad')).toBeInTheDocument();
    expect(screen.getByText('Escribe el departamento')).toBeInTheDocument();
    expect(calls).toHaveLength(0);
    await user.type(field('Ciudad'), 'Pereira');
    await user.type(field('Departamento'), 'Risaralda');
    await user.click(saveButtons()[0]);
    await screen.findByText('Cambios guardados.');
    expect(calls).toEqual([{ city: 'Pereira', department: 'Risaralda', commercialCenter: null }]);
  });

  it('valida antes de enviar y marca los campos con error', async () => {
    const calls = capturePatch();
    const { user } = await open();
    await user.clear(field('Nombre comercial'));
    await user.clear(field('Línea móvil de cotizaciones'));
    await user.type(field('Línea móvil de cotizaciones'), '123');
    await user.click(saveButtons()[0]);
    expect(await screen.findByText('Escribe el nombre comercial de tu tienda')).toBeInTheDocument();
    expect(
      screen.getByText('Celular colombiano: 10 dígitos que empiezan en 3'),
    ).toBeInTheDocument();
    expect(field('Nombre comercial')).toHaveAttribute('aria-invalid', 'true');
    expect(calls).toHaveLength(0);
  });

  it('Descartar devuelve el formulario a lo guardado', async () => {
    const { user } = await open();
    await rename(user);
    await user.click(screen.getAllByRole('button', { name: 'Descartar' })[0]);
    expect(field('Nombre comercial')).toHaveValue('TecnoPasarela Cali');
    expect(screen.getByText('No hay cambios por guardar.')).toBeInTheDocument();
  });

  it('si el servidor falla muestra el error y deja reintentar', async () => {
    server.use(
      http.patch(route('/seller/store'), () =>
        HttpResponse.json(
          { code: 'INTERNAL_ERROR', message: 'x', details: null, requestId: 'r' },
          { status: 500 },
        ),
      ),
    );
    const { user } = await open();
    await rename(user);
    await user.click(saveButtons()[0]);
    expect(await screen.findByRole('alert')).toHaveTextContent('Ocurrió un error inesperado');
    expect(saveButtons()[0]).toBeEnabled();
    expect(field('Nombre comercial')).toHaveValue('Tienda Nueva');
  });

  it('mientras guarda deshabilita los botones', async () => {
    let release;
    server.use(
      http.patch(route('/seller/store'), async () => {
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
    await rename(user);
    await user.click(saveButtons()[0]);
    await waitFor(() => expect(saveButtons()[0]).toBeDisabled());
    expect(saveButtons()[0]).toHaveTextContent('Guardando…');
    release();
    await screen.findByRole('alert');
  });
});

describe('Ajustes de tienda: datos que faltan para verificar', () => {
  const incompleteStore = (patch) =>
    server.use(
      http.get(route('/seller/store'), () =>
        HttpResponse.json({
          store: {
            id: 'f0000000-0000-4000-8000-000000000009',
            legalName: 'Mi Empresa SAS',
            tradeName: 'Mi Empresa',
            nit: null,
            description: null,
            logoUrl: null,
            whatsappE164: null,
            department: null,
            city: null,
            address: null,
            commercialCenter: null,
            latitude: null,
            longitude: null,
            openingHours: null,
            isVerified: false,
            ...patch,
          },
        }),
      ),
    );

  it('avisa qué falta y enlaza a la verificación', async () => {
    incompleteStore({});
    status('not_submitted');
    await open();
    const note = await screen.findByRole('note');
    expect(note).toHaveTextContent('NIT, WhatsApp de ventas, Ciudad y departamento, Dirección');
    expect(within(note).getByRole('link', { name: /Ver estado de verificación/ })).toHaveAttribute(
      'href',
      '/vendedor/verificacion',
    );
    expect(field('Ciudad y centro comercial')).toHaveValue('');
  });

  it('no avisa con el negocio completo', async () => {
    await open();
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});
