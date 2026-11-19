import { describe, expect, it } from 'vitest';
import {
  describeVerification,
  PUBLISH_BLOCKED_MESSAGE,
  REQUIRED_DOCUMENTS,
  sampleVerification,
  timeLeft,
  TRUST_MESSAGE,
} from './verification.js';

const NOW = Date.UTC(2026, 10, 18, 12, 0, 0);

describe('timeLeft', () => {
  it('separa días, horas y minutos', () => {
    const deadline = new Date(NOW + (15 * 1440 + 8 * 60 + 22) * 60_000).toISOString();
    expect(timeLeft(deadline, NOW)).toEqual({ expired: false, days: 15, hours: 8, minutes: 22 });
  });

  it('menos de un día muestra 0 días', () => {
    expect(timeLeft(new Date(NOW + 90 * 60_000).toISOString(), NOW)).toEqual({
      expired: false,
      days: 0,
      hours: 1,
      minutes: 30,
    });
  });

  it('una fecha pasada está vencida', () => {
    expect(timeLeft(new Date(NOW - 1000).toISOString(), NOW)).toMatchObject({ expired: true });
    expect(timeLeft(new Date(NOW).toISOString(), NOW)).toMatchObject({ expired: true });
  });

  it('sin fecha o con una fecha inválida devuelve null', () => {
    expect(timeLeft(null, NOW)).toBeNull();
    expect(timeLeft(undefined, NOW)).toBeNull();
    expect(timeLeft('no-es-fecha', NOW)).toBeNull();
  });
});

describe('sampleVerification', () => {
  it('cada estado trae los datos que su pantalla necesita', () => {
    expect(sampleVerification('not_submitted', NOW).submittedAt).toBeNull();
    expect(sampleVerification('pending_review', NOW).submittedAt).not.toBeNull();
    const correction = sampleVerification('correction_requested', NOW);
    expect(correction.reviewerNote).toBeTruthy();
    expect(timeLeft(correction.deadlineAt, NOW)).toMatchObject({ expired: false, days: 14 });
    expect(sampleVerification('rejected', NOW).canReapplyAt).not.toBeNull();
    expect(sampleVerification('approved', NOW).status).toBe('approved');
    expect(sampleVerification('suspended', NOW).status).toBe('suspended');
  });
});

describe('textos fijos', () => {
  it('pide los 3 documentos y no promete cumplimiento de las ofertas', () => {
    expect(REQUIRED_DOCUMENTS.map((doc) => doc.id)).toEqual(['rut', 'camara', 'cedula']);
    expect(TRUST_MESSAGE).toMatch(/confirma que el negocio existe/);
    expect(TRUST_MESSAGE).toMatch(/no garantiza el cumplimiento de sus ofertas/);
  });
});

describe('describeVerification', () => {
  it('aprobado es verde y confirma que el catálogo es visible', () => {
    const view = describeVerification({ status: 'approved' });
    expect(view).toMatchObject({ tone: 'ok', chip: 'Verificado' });
    expect(view.message).toMatch(/catálogo es visible/);
  });

  it('en revisión da el tiempo estimado', () => {
    const view = describeVerification({ status: 'pending_review' });
    expect(view.tone).toBe('wait');
    expect(view.message).toBe('Tiempo estimado: 3 a 5 días hábiles (máximo 15).');
  });

  it('corrección solicitada muestra la nota y el plazo', () => {
    const view = describeVerification({
      status: 'correction_requested',
      reviewerNote: 'Sube un RUT más reciente.',
      deadlineAt: '2026-12-01T00:00:00.000Z',
    });
    expect(view.chip).toBe('Corrección solicitada');
    expect(view.message).toBe('Sube un RUT más reciente. Plazo hasta el 1 de diciembre de 2026.');
  });

  it('corrección sin nota ni plazo no deja el mensaje con huecos', () => {
    expect(describeVerification({ status: 'correction_requested' }).message).toBe('');
  });

  it('rechazado es rojo, con el motivo y desde cuándo puede volver a solicitar', () => {
    const view = describeVerification({
      status: 'rejected',
      reviewerNote: 'El NIT no coincide.',
      canReapplyAt: '2027-01-10T00:00:00.000Z',
    });
    expect(view.tone).toBe('bad');
    expect(view.message).toBe(
      'El NIT no coincide. Podrás volver a solicitar desde el 10 de enero de 2027.',
    );
  });

  it('suspendido es rojo y dice que la cuenta está deshabilitada', () => {
    const view = describeVerification({ status: 'suspended' });
    expect(view.tone).toBe('bad');
    expect(view.message).toBe('Tu cuenta de vendedor está deshabilitada.');
  });

  it('sin enviar avisa que la aprobación es en modo demostración', () => {
    const view = describeVerification({ status: 'not_submitted' });
    expect(view.chip).toBe('Verificación pendiente');
    expect(view.message).toMatch(/modo demostración/);
  });

  it('el aviso de publicar bloqueado es el exacto de la documentación', () => {
    expect(PUBLISH_BLOCKED_MESSAGE).toBe(
      'Aún no puedes publicar productos hasta que tu negocio sea verificado',
    );
  });
});
