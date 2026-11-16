import { describe, expect, it, vi } from 'vitest';
import { createVerificationModule } from './index.js';
import { createVerificationRepository } from './repository.js';

describe('verification', () => {
  it('sin solicitud el estado es not_submitted, con todo lo demás en null', async () => {
    const db = { query: vi.fn(async () => ({ rows: [] })) };
    const { facade } = createVerificationModule({ db });
    expect(await facade.getStatus('s1')).toEqual({
      status: 'not_submitted',
      submittedAt: null,
      reviewerNote: null,
      deadlineAt: null,
      canReapplyAt: null,
    });
  });

  it('con solicitud devuelve el estado y las fechas en ISO', async () => {
    const row = {
      status: 'correction_requested',
      submittedAt: new Date('2026-11-01T10:00:00Z'),
      reviewerNote: 'Falta el RUT',
      deadlineAt: new Date('2026-11-16T10:00:00Z'),
      canReapplyAt: null,
    };
    const db = { query: vi.fn(async () => ({ rows: [row] })) };
    expect(await createVerificationModule({ db }).facade.getStatus('s1')).toEqual({
      status: 'correction_requested',
      submittedAt: '2026-11-01T10:00:00.000Z',
      reviewerNote: 'Falta el RUT',
      deadlineAt: '2026-11-16T10:00:00.000Z',
      canReapplyAt: null,
    });
  });

  it('openRequest es idempotente (ON CONFLICT DO NOTHING)', async () => {
    const db = { query: vi.fn(async () => ({ rows: [] })) };
    await createVerificationRepository(db).ensureRequest('s1');
    expect(db.query.mock.calls[0][0]).toContain('ON CONFLICT (store_id) DO NOTHING');
    expect(db.query.mock.calls[0][1]).toEqual(['s1']);
  });
});
