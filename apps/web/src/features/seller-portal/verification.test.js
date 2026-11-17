import { describe, expect, it } from 'vitest';
import { describeVerification, PUBLISH_BLOCKED_MESSAGE } from './verification.js';

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
