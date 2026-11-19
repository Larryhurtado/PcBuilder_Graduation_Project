import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, it } from 'vitest';
import { findOffer } from '../../mocks/data.js';
import { server } from '../../mocks/node.js';
import { renderApp } from '../../test/utils.jsx';
import { useBuildStore } from './store.js';
import { resetQuickShare } from './quickShare.js';

const route = (path) => `*/api/v1${path}`;
const cpu = () => findOffer('Ryzen 7 7800X3D');
const am4Cpu = () => findOffer('Ryzen 5 5600');
const board = () => findOffer('B650 GAMING PLUS');

/** Cuenta cuántos armados se crean y guarda el cuerpo de cada uno. */
const captureCreates = () => {
  const bodies = [];
  server.use(
    http.post(route('/builds'), async ({ request }) => {
      bodies.push(await request.clone().json());
      return undefined;
    }),
  );
  return bodies;
};

const open = async (parts = { cpu: cpu() }) => {
  useBuildStore.setState({ parts });
  const utils = renderApp('/armador');
  await screen.findByRole('heading', { level: 1, name: 'Arma tu PC' });
  return { ...utils, user: userEvent.setup() };
};
const copyLink = () => screen.getByRole('button', { name: /Copiar enlace|Creando enlace/ });
const exportId = () => screen.getByRole('button', { name: /Exportar ID|Creando enlace/ });

beforeEach(() => {
  resetQuickShare();
  useBuildStore.setState({ parts: {} });
});

describe('Asistente: compartir sin sesión', () => {
  it('"Copiar enlace" crea el armado sin cuenta y copia su enlace', async () => {
    const bodies = captureCreates();
    const { user } = await open();
    await user.click(copyLink());
    expect(await screen.findByText(/Enlace copiado\. Código/)).toBeInTheDocument();
    expect(bodies).toHaveLength(1);
    expect(bodies[0].items).toEqual([
      { category: 'cpu', componentId: cpu().component.id, offerId: cpu().offerId },
    ]);
    const link = await navigator.clipboard.readText();
    expect(link).toMatch(new RegExp(`/armado/[A-Za-z0-9]{10}$`));
  });

  it('"Exportar ID" hace lo mismo que "Copiar enlace"', async () => {
    const bodies = captureCreates();
    const { user } = await open();
    await user.click(exportId());
    expect(await screen.findByText(/Enlace copiado\. Código/)).toBeInTheDocument();
    expect(bodies).toHaveLength(1);
    const link = await navigator.clipboard.readText();
    expect(link).toMatch(/\/armado\/[A-Za-z0-9]{10}$/);
  });

  it('si el armado no cambió, reutiliza el mismo enlace y no crea otro', async () => {
    const bodies = captureCreates();
    const { user } = await open();
    await user.click(copyLink());
    await screen.findByText(/Enlace copiado\. Código/);
    const first = await navigator.clipboard.readText();
    await user.click(exportId());
    await screen.findByText(/Enlace copiado\. Código/);
    expect(bodies).toHaveLength(1);
    expect(await navigator.clipboard.readText()).toBe(first);
  });

  it('si cambian las piezas crea un enlace nuevo', async () => {
    const bodies = captureCreates();
    const { user } = await open();
    await user.click(copyLink());
    await screen.findByText(/Enlace copiado\. Código/);
    const first = await navigator.clipboard.readText();
    useBuildStore.getState().setPart(board());
    await user.click(await screen.findByRole('button', { name: 'Copiar enlace' }));
    await waitFor(() => expect(bodies).toHaveLength(2));
    expect(bodies[1].items).toHaveLength(2);
    await waitFor(async () => expect(await navigator.clipboard.readText()).not.toBe(first));
  });

  it('un armado con incompatibilidades se comparte como borrador', async () => {
    const bodies = captureCreates();
    // Procesador AM5 con placa AM4 (incompatible a propósito)
    const { user } = await open({ cpu: am4Cpu(), motherboard: findOffer('MSI PRO B650M-P') });
    await user.click(copyLink());
    await screen.findByText(/Enlace copiado|No se pudo copiar/);
    expect(bodies[0].draft).toBe(true);
  });

  it('con un armado compatible no se marca como borrador', async () => {
    const bodies = captureCreates();
    const { user } = await open({ cpu: cpu(), motherboard: board() });
    await user.click(copyLink());
    await screen.findByText(/Enlace copiado/);
    expect(bodies[0].draft).toBe(false);
  });

  it('sin piezas los dos botones están deshabilitados', async () => {
    await open({});
    expect(copyLink()).toBeDisabled();
    expect(exportId()).toBeDisabled();
  });

  it('si el servidor limita las creaciones muestra el motivo', async () => {
    server.use(
      http.post(route('/builds'), () =>
        HttpResponse.json(
          { code: 'RATE_LIMITED', message: 'x', details: null, requestId: 'r' },
          { status: 429 },
        ),
      ),
    );
    const { user } = await open();
    await user.click(copyLink());
    expect(await screen.findByText(/Demasiados intentos/)).toBeInTheDocument();
    expect(copyLink()).toBeEnabled();
  });
});
