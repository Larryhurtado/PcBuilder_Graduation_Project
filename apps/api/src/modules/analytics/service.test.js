import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../../kernel/errors.js';
import { DEDUPE_WINDOW_SECONDS, createAnalyticsService } from './service.js';

const OFFER = '6b03b443-7b22-491c-b301-7e2a285359df';
const STORE = '11111111-1111-4111-8111-111111111111';

function setup({ inserted = true, offerError = null } = {}) {
  const repository = {
    insertEvent: vi.fn(async () => inserted),
    ensureMonthPartition: vi.fn(async () => {}),
  };
  const offers = {
    getOffer: vi.fn(async () => {
      if (offerError) throw offerError;
      return { store: { id: STORE } };
    }),
  };
  const hashSession = vi.fn(() => 'h'.repeat(64));
  return {
    repository,
    offers,
    hashSession,
    service: createAnalyticsService({ repository, offers, hashSession }),
  };
}

describe('analytics service: record', () => {
  it('guarda el evento con la tienda de la oferta y un hash en lugar de la IP', async () => {
    const { service, repository, hashSession } = setup();
    const result = await service.record(
      { offerId: OFFER, type: 'whatsapp_click' },
      { ip: '203.0.113.7', userAgent: 'Firefox' },
    );
    expect(result).toEqual({ recorded: true });
    expect(hashSession).toHaveBeenCalledWith('203.0.113.7', 'Firefox');
    const saved = repository.insertEvent.mock.calls[0][0];
    expect(saved).toEqual({
      offerId: OFFER,
      storeId: STORE,
      type: 'whatsapp_click',
      sessionHash: 'h'.repeat(64),
      windowSeconds: DEDUPE_WINDOW_SECONDS.whatsapp_click,
    });
    expect(JSON.stringify(saved)).not.toContain('203.0.113.7');
  });

  it('las vistas y los clics usan ventanas de descarte distintas', async () => {
    const { service, repository } = setup();
    await service.record({ offerId: OFFER, type: 'view' });
    expect(repository.insertEvent.mock.calls[0][0].windowSeconds).toBe(30 * 60);
    expect(DEDUPE_WINDOW_SECONDS.whatsapp_click).toBe(10 * 60);
  });

  it('un evento repetido se descarta y se informa como no registrado', async () => {
    const { service } = setup({ inserted: false });
    expect(await service.record({ offerId: OFFER, type: 'view' })).toEqual({ recorded: false });
  });

  it('una oferta que no es pública lanza 404 y no guarda nada', async () => {
    const { service, repository } = setup({ offerError: new AppError('NOT_FOUND') });
    await expect(service.record({ offerId: OFFER, type: 'view' })).rejects.toMatchObject({
      status: 404,
    });
    expect(repository.insertEvent).not.toHaveBeenCalled();
  });
});

describe('analytics service: ensurePartitions', () => {
  it('crea la partición del mes actual y la del siguiente', async () => {
    const { service, repository } = setup();
    await service.ensurePartitions(new Date('2026-11-16T12:00:00Z'));
    expect(repository.ensureMonthPartition.mock.calls.map((c) => c[0])).toEqual([
      '2026-11-01',
      '2026-12-01',
    ]);
  });

  it('en diciembre el mes siguiente es enero del año siguiente', async () => {
    const { service, repository } = setup();
    await service.ensurePartitions(new Date('2026-12-20T12:00:00Z'));
    expect(repository.ensureMonthPartition.mock.calls.map((c) => c[0])).toEqual([
      '2026-12-01',
      '2027-01-01',
    ]);
  });
});
