import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { demoUsers, signInMock } from '../../mocks/auth.js';
import { publicStores } from '../../mocks/data.js';
import { server } from '../../mocks/node.js';
import { renderApp } from '../../test/utils.jsx';

const [, seller] = demoUsers;
const route = (path) => `*/api/v1${path}`;
const store = publicStores.find((item) => item.name === 'TecnoPasarela Cali');

const status = (patch) =>
  server.use(
    http.get(route('/seller/verification/status'), () =>
      HttpResponse.json({
        status: 'not_submitted',
        submittedAt: null,
        reviewerNote: null,
        deadlineAt: null,
        canReapplyAt: null,
        ...patch,
      }),
    ),
  );

const open = async () => {
  signInMock(seller);
  const utils = renderApp('/vendedor/verificacion');
  await screen.findByRole('heading', { level: 1, name: 'Verificación del vendedor' });
  await screen.findByRole('region', { name: 'Estado de la verificación' });
  return { ...utils, user: userEvent.setup() };
};
const panel = () => within(screen.getByRole('region', { name: 'Estado de la verificación' }));
const inFuture = (days) => new Date(Date.now() + days * 86_400_000).toISOString();

beforeEach(() => vi.stubEnv('VITE_USE_MOCKS', 'false'));
afterEach(() => vi.unstubAllEnvs());

describe('Verificación: estructura', () => {
  it('muestra el título, el aviso de confianza y el ítem del menú', async () => {
    await open();
    expect(document.title).toBe('Verificación · PcBuilder');
    expect(
      screen.getByText(
        /confirma que el negocio existe; no garantiza el cumplimiento de sus ofertas/,
      ),
    ).toBeInTheDocument();
    const menu = within(screen.getByRole('navigation', { name: 'Panel comercial' }));
    expect(menu.getByRole('link', { name: /Verificación/ })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('no inventa datos del prototipo', async () => {
    status({ status: 'pending_review', submittedAt: '2026-10-18T14:15:00.000Z' });
    await open();
    await panel().findByText('Tu solicitud está en revisión');
    expect(document.body).not.toHaveTextContent(
      /COL-VERIF|Auditoría Tributaria|SHA-256|Morales|RUES|DIAN|v2\.4|Simulador/i,
    );
  });

  it('mientras carga muestra un marcador y si falla ofrece reintentar', async () => {
    server.use(http.get(route('/seller/verification/status'), () => HttpResponse.error()));
    signInMock(seller);
    renderApp('/vendedor/verificacion');
    expect(await screen.findByRole('button', { name: 'Reintentar' })).toBeInTheDocument();
  });
});

describe('Verificación: cada estado', () => {
  it('aprobado: confirma y lleva a publicar y al perfil público', async () => {
    await open();
    expect(await panel().findByText('Negocio verificado')).toBeInTheDocument();
    expect(panel().getByRole('link', { name: 'Publicar producto' })).toHaveAttribute(
      'href',
      '/vendedor/publicar',
    );
    await waitFor(() =>
      expect(panel().getByRole('link', { name: 'Ver mi perfil público' })).toHaveAttribute(
        'href',
        `/tiendas/${store.id}`,
      ),
    );
  });

  it('sin enviar: lista los 3 documentos, deshabilitados, y avisa que la verificación es demostrativa', async () => {
    status({ status: 'not_submitted' });
    await open();
    expect(
      await panel().findByRole('heading', { name: 'Verificación pendiente' }),
    ).toBeInTheDocument();
    const docs = within(panel().getByRole('list', { name: 'Documentos requeridos' }));
    expect(docs.getAllByRole('listitem')).toHaveLength(3);
    expect(docs.getByText('RUT o NIT actualizado')).toBeInTheDocument();
    expect(docs.getByText('Certificado de existencia')).toBeInTheDocument();
    expect(docs.getByText('Cédula del representante legal')).toBeInTheDocument();
    for (const button of docs.getAllByRole('button')) expect(button).toBeDisabled();
    expect(panel().getByRole('button', { name: /Enviar a revisión/ })).toBeDisabled();
    expect(panel().getByRole('note')).toHaveTextContent('modo demostración');
  });

  it('en revisión: muestra la fecha de radicación y la sede reales', async () => {
    status({ status: 'pending_review', submittedAt: '2026-10-18T14:15:00.000Z' });
    await open();
    expect(await panel().findByText('Tu solicitud está en revisión')).toBeInTheDocument();
    expect(panel().getByText('18 de octubre de 2026')).toBeInTheDocument();
    expect(await panel().findByText(/C\.C\. Pasarela · Cali/)).toBeInTheDocument();
    expect(panel().getByText(/Tiempo estimado: 3 a 5 días hábiles/)).toBeInTheDocument();
    expect(panel().queryByRole('list', { name: 'Documentos requeridos' })).not.toBeInTheDocument();
  });

  it('corrección: muestra la observación, el contador y deshabilita reemplazar y enviar', async () => {
    status({
      status: 'correction_requested',
      submittedAt: '2026-10-18T14:15:00.000Z',
      reviewerNote: 'La cédula tiene reflejos.',
      deadlineAt: inFuture(10),
    });
    await open();
    expect(await panel().findByText('El administrador pidió una corrección')).toBeInTheDocument();
    expect(panel().getByText('Observación del administrador')).toBeInTheDocument();
    expect(panel().getAllByText(/La cédula tiene reflejos/).length).toBeGreaterThan(0);
    expect(panel().getByText(/\b9 días/)).toBeInTheDocument();
    const docs = within(panel().getByRole('list', { name: 'Documentos requeridos' }));
    for (const button of docs.getAllByRole('button')) {
      expect(button).toBeDisabled();
      expect(button).toHaveAccessibleName(/Reemplazar documento/);
    }
    expect(panel().getByRole('button', { name: /Enviar correcciones/ })).toBeDisabled();
  });

  it('corrección con el plazo vencido lo dice', async () => {
    status({
      status: 'correction_requested',
      reviewerNote: 'Falta algo.',
      deadlineAt: '2020-01-01T00:00:00.000Z',
    });
    await open();
    expect(await panel().findByText('El plazo venció')).toBeInTheDocument();
  });

  it('rechazado: muestra el motivo y cuándo puede volver a solicitar', async () => {
    status({
      status: 'rejected',
      reviewerNote: 'No se pudo validar el negocio.',
      canReapplyAt: '2026-12-20T00:00:00.000Z',
    });
    await open();
    expect(await panel().findByText('Tu solicitud fue rechazada')).toBeInTheDocument();
    expect(panel().getAllByText(/No se pudo validar el negocio/).length).toBeGreaterThan(0);
    expect(panel().getAllByText(/20 de diciembre de 2026/).length).toBeGreaterThan(0);
  });

  it('suspendido: avisa que la cuenta está deshabilitada', async () => {
    status({ status: 'suspended', canReapplyAt: '2026-12-20T00:00:00.000Z' });
    await open();
    expect(await panel().findByText('Cuenta suspendida')).toBeInTheDocument();
    expect(panel().getByText(/Tu cuenta de vendedor está deshabilitada/)).toBeInTheDocument();
    expect(panel().getAllByText(/20 de diciembre de 2026/).length).toBeGreaterThan(0);
  });
});

describe('Verificación: punto de alerta del menú', () => {
  const menu = () => within(screen.getByRole('navigation', { name: 'Panel comercial' }));

  it('aparece mientras el negocio no esté aprobado', async () => {
    status({ status: 'pending_review' });
    await open();
    await waitFor(() =>
      expect(menu().getByRole('link', { name: /Verificación/ })).toContainElement(
        screen.getAllByRole('img', { name: 'Pendiente' })[0],
      ),
    );
  });

  it('no aparece con el negocio aprobado', async () => {
    await open();
    await panel().findByText('Negocio verificado');
    expect(screen.queryByRole('img', { name: 'Pendiente' })).not.toBeInTheDocument();
  });
});

describe('Verificación: simulador solo de desarrollo', () => {
  it('no existe fuera del modo con datos simulados', async () => {
    await open();
    expect(
      screen.queryByRole('group', { name: 'Simular estado de verificación' }),
    ).not.toBeInTheDocument();
  });

  it('con VITE_USE_MOCKS=true permite ver cada estado y volver al real', async () => {
    vi.stubEnv('VITE_USE_MOCKS', 'true');
    const { user } = await open();
    const group = within(screen.getByRole('group', { name: 'Simular estado de verificación' }));
    expect(await panel().findByText('Negocio verificado')).toBeInTheDocument();

    await user.click(group.getByRole('button', { name: 'Rechazado' }));
    expect(panel().getByText('Tu solicitud fue rechazada')).toBeInTheDocument();
    expect(group.getByRole('button', { name: 'Rechazado' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(group.getByRole('button', { name: 'Corrección solicitada' }));
    expect(panel().getByText('El administrador pidió una corrección')).toBeInTheDocument();
    expect(panel().getByText(/\b14 días/)).toBeInTheDocument();

    await user.click(group.getByRole('button', { name: 'Sin enviar' }));
    expect(panel().getByRole('list', { name: 'Documentos requeridos' })).toBeInTheDocument();

    await user.click(group.getByRole('button', { name: 'Estado real' }));
    expect(panel().getByText('Negocio verificado')).toBeInTheDocument();
  });
});
