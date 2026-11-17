import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { demoUsers, signInMock } from '../../mocks/auth.js';
import { findOffer } from '../../mocks/data.js';
import { server } from '../../mocks/node.js';
import { renderApp } from '../../test/utils.jsx';
import { useBuildStore } from './store.js';

const [buyer] = demoUsers;
const route = (path) => `*/api/v1${path}`;

// Armado compatible (AM5 + DDR5) y otro con conflicto (CPU AM4 con placa AM5)
const compatible = ['AMD Ryzen 7 7800X3D', 'B650 GAMING PLUS', 'Trident Z5'];
const conflicting = ['Ryzen 5 5600', 'MSI PRO B650M-P'];

const fillBuild = (names) => {
  useBuildStore.setState({ parts: {} });
  for (const name of names) useBuildStore.getState().setPart(findOffer(name));
};
const open = async (names = compatible, { signedIn = true } = {}) => {
  fillBuild(names);
  if (signedIn) signInMock(buyer);
  const utils = renderApp('/armador');
  const user = userEvent.setup();
  await user.click(await screen.findByRole('button', { name: 'Guardar' }));
  const dialog = within(await screen.findByRole('dialog'));
  return { ...utils, user, dialog };
};

beforeEach(() => useBuildStore.setState({ parts: {} }));

describe('Guardar armado: botón', () => {
  it('está deshabilitado mientras no haya piezas', async () => {
    renderApp('/armador');
    expect(await screen.findByRole('button', { name: 'Guardar' })).toBeDisabled();
  });

  it('con piezas abre el formulario con el nombre por defecto', async () => {
    const { dialog } = await open();
    expect(dialog.getByRole('heading', { name: 'Guardar armado' })).toBeInTheDocument();
    expect(dialog.getByLabelText('Nombre del armado')).toHaveValue('Mi configuración');
  });

  it('"Cancelar" cierra el formulario sin guardar', async () => {
    let calls = 0;
    server.use(
      http.post(route('/builds'), () => {
        calls += 1;
        return HttpResponse.json({});
      }),
    );
    const { user, dialog } = await open();
    await user.click(dialog.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('heading', { name: 'Guardar armado' })).not.toBeInTheDocument();
    expect(calls).toBe(0);
  });
});

describe('Guardar armado: con sesión', () => {
  it('guarda las piezas y las ofertas elegidas y muestra el enlace', async () => {
    let body;
    server.use(
      http.post(route('/builds'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json(
          {
            build: {
              id: 'e0000000-0000-4000-8000-000000000999',
              name: body.name,
              shareCode: 'Abc1234567',
              estimatedWatts: 300,
              totalPriceCop: 1,
              createdAt: '2026-11-16T10:00:00.000Z',
              updatedAt: '2026-11-16T10:00:00.000Z',
              isOwner: true,
              items: [],
            },
            evaluation: {
              results: [],
              summary: { incompatible: 0, unknown: 0, ok: 0 },
              estimatedWatts: 300,
              recommendedPsuW: 450,
            },
          },
          { status: 201 },
        );
      }),
    );
    const { user, dialog } = await open();
    const name = dialog.getByLabelText('Nombre del armado');
    await user.clear(name);
    await user.type(name, '  Mi PC de trabajo ');
    await user.click(dialog.getByRole('button', { name: 'Guardar armado' }));

    expect(await dialog.findByRole('heading', { name: 'Armado guardado' })).toBeInTheDocument();
    expect(body.name).toBe('Mi PC de trabajo');
    expect(body.draft).toBe(false);
    expect(body.items).toHaveLength(3);
    expect(body.items).toContainEqual(
      expect.objectContaining({
        category: 'cpu',
        componentId: findOffer('AMD Ryzen 7 7800X3D').component.id,
        offerId: findOffer('AMD Ryzen 7 7800X3D').offerId,
      }),
    );
    expect(dialog.getByLabelText('Enlace para compartir')).toHaveValue(
      `${window.location.origin}/armado/Abc1234567`,
    );
    expect(dialog.getByRole('link', { name: 'Ver mis armados' })).toHaveAttribute(
      'href',
      '/cuenta/armados',
    );
    expect(dialog.queryByText(/única forma de abrir/)).not.toBeInTheDocument();
  });

  it('el armado guardado aparece en la lista de la cuenta', async () => {
    const { user, dialog } = await open();
    await user.click(dialog.getByRole('button', { name: 'Guardar armado' }));
    await dialog.findByRole('heading', { name: 'Armado guardado' });
    await user.click(dialog.getByRole('link', { name: 'Ver mis armados' }));
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Mi configuración' }),
    ).toBeInTheDocument();
  });

  it('el botón "Copiar" copia el enlace al portapapeles', async () => {
    const { user, dialog } = await open();
    await user.click(dialog.getByRole('button', { name: 'Guardar armado' }));
    await dialog.findByRole('heading', { name: 'Armado guardado' });
    await user.click(dialog.getByRole('button', { name: 'Copiar' }));
    expect(await dialog.findByText('Enlace copiado.')).toBeInTheDocument();
    expect(await navigator.clipboard.readText()).toMatch(/\/armado\/[A-Za-z0-9]{10}$/);
  });

  it('con conflictos avisa y lo guarda como borrador', async () => {
    let body;
    server.use(
      http.post(route('/builds'), async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({}, { status: 500 });
      }),
    );
    const { user, dialog } = await open(conflicting);
    expect(dialog.getByText(/se guardará como borrador/)).toBeInTheDocument();
    await user.click(dialog.getByRole('button', { name: 'Guardar armado' }));
    await dialog.findByRole('alert');
    expect(body.draft).toBe(true);
  });

  it('sin conflictos no habla de borrador', async () => {
    const { dialog } = await open();
    expect(dialog.queryByText(/borrador/)).not.toBeInTheDocument();
  });
});

describe('Guardar armado: sin sesión', () => {
  it('avisa que quedará sin cuenta y guarda con enlace', async () => {
    const { user, dialog } = await open(compatible, { signedIn: false });
    expect(dialog.getByText(/se guardará sin cuenta/)).toBeInTheDocument();
    expect(dialog.getByRole('link', { name: 'Ingresa' })).toHaveAttribute(
      'href',
      '/ingresar?next=%2Farmador',
    );
    await user.click(dialog.getByRole('button', { name: 'Guardar armado' }));
    expect(await dialog.findByRole('heading', { name: 'Armado guardado' })).toBeInTheDocument();
    expect(dialog.getByText(/única forma de abrir el armado/)).toBeInTheDocument();
    expect(dialog.queryByRole('link', { name: 'Ver mis armados' })).not.toBeInTheDocument();
  });
});

describe('Guardar armado: errores', () => {
  it('sin nombre avisa y no llama a la API', async () => {
    let calls = 0;
    server.use(
      http.post(route('/builds'), () => {
        calls += 1;
        return HttpResponse.json({});
      }),
    );
    const { user, dialog } = await open();
    await user.clear(dialog.getByLabelText('Nombre del armado'));
    await user.click(dialog.getByRole('button', { name: 'Guardar armado' }));
    expect(await dialog.findByText('Escribe un nombre para tu armado')).toBeInTheDocument();
    expect(dialog.getByLabelText('Nombre del armado')).toHaveAttribute('aria-invalid', 'true');
    expect(calls).toBe(0);
  });

  it.each([
    [429, 'RATE_LIMITED', /Demasiados intentos/],
    [422, 'VALIDATION_ERROR', 'Hay datos que no son válidos.'],
  ])('muestra el mensaje del código %s %s y deja reintentar', async (status, code, message) => {
    server.use(
      http.post(route('/builds'), () =>
        HttpResponse.json({ code, message: 'x', details: null, requestId: 'r' }, { status }),
      ),
    );
    const { user, dialog } = await open();
    await user.click(dialog.getByRole('button', { name: 'Guardar armado' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent(message);
    expect(dialog.getByRole('button', { name: 'Guardar armado' })).toBeEnabled();
  });

  it('un fallo de red avisa que no se pudo conectar', async () => {
    server.use(http.post(route('/builds'), () => HttpResponse.error()));
    const { user, dialog } = await open();
    await user.click(dialog.getByRole('button', { name: 'Guardar armado' }));
    expect(await dialog.findByRole('alert')).toHaveTextContent(/No pudimos conectar/);
  });
});
