import { describe, expect, it, vi } from 'vitest';
import { createStoresService } from './service.js';

const ROW = {
  id: 's1',
  legalName: 'Tecno SAS',
  tradeName: 'Tecno',
  nit: null,
  description: null,
  logoKey: null,
  whatsappE164: null,
  department: null,
  city: null,
  address: null,
  commercialCenter: null,
  latitude: null,
  longitude: null,
  openingHours: null,
  isVerified: false,
};

function setup({ role = 'buyer', existing = null, inserted = ROW } = {}) {
  const repository = {
    findByOwner: vi.fn(async () => existing),
    findById: vi.fn(),
    insert: vi.fn(async () => inserted),
    update: vi.fn(async (_id, patch) => ({ ...ROW, ...patch })),
  };
  const identity = {
    getUser: vi.fn(async () => ({ id: 'u1', role })),
    setRole: vi.fn(async () => {}),
    issueAccessToken: vi.fn(async () => ({
      accessToken: 'jwt-seller',
      expiresIn: 900,
      user: { id: 'u1', role: 'seller' },
    })),
  };
  const verification = {
    openRequest: vi.fn(async () => {}),
    getStatus: vi.fn(async () => ({ status: 'not_submitted' })),
  };
  return {
    repository,
    identity,
    verification,
    service: createStoresService({ repository, identity, verification }),
  };
}

describe('convert', () => {
  it('crea el comercio, abre la verificación, cambia el rol y entrega un token nuevo', async () => {
    const { service, repository, identity, verification } = setup();
    const result = await service.convert('u1', { legalName: 'Tecno SAS', tradeName: 'Tecno' });
    expect(repository.insert).toHaveBeenCalledWith({
      ownerUserId: 'u1',
      legalName: 'Tecno SAS',
      tradeName: 'Tecno',
    });
    expect(verification.openRequest).toHaveBeenCalledWith('s1');
    expect(identity.setRole).toHaveBeenCalledWith('u1', 'seller');
    expect(result.accessToken).toBe('jwt-seller');
    expect(result.user.role).toBe('seller');
    expect(result.store).toMatchObject({
      id: 's1',
      tradeName: 'Tecno',
      isVerified: false,
      logoUrl: null,
    });
  });

  it('si el comercio ya existía (intento anterior a medias) lo reutiliza y termina el trabajo', async () => {
    const { service, repository, identity } = setup({ inserted: null, existing: ROW });
    const result = await service.convert('u1', { legalName: 'X X', tradeName: 'Y Y' });
    expect(repository.findByOwner).toHaveBeenCalled();
    expect(identity.setRole).toHaveBeenCalled();
    expect(result.store.id).toBe('s1');
  });

  it.each(['seller', 'admin'])('una cuenta %s no puede convertirse: 409', async (role) => {
    const { service, repository } = setup({ role });
    await expect(
      service.convert('u1', { legalName: 'X X', tradeName: 'Y Y' }),
    ).rejects.toMatchObject({
      status: 409,
    });
    expect(repository.insert).not.toHaveBeenCalled();
  });
});

describe('perfil y verificación', () => {
  it('getStore devuelve la forma pública; la foto del logo se convierte en URL', async () => {
    const { service } = setup({ existing: { ...ROW, logoKey: 'logos/a.png', isVerified: true } });
    expect(await service.getStore('u1')).toMatchObject({
      logoUrl: '/storage/logos/a.png',
      isVerified: true,
    });
  });

  it('sin comercio responde 404', async () => {
    const { service } = setup({ existing: null });
    await expect(service.getStore('u1')).rejects.toMatchObject({ status: 404 });
    await expect(service.updateStore('u1', { city: 'Cali' })).rejects.toMatchObject({
      status: 404,
    });
    await expect(service.getVerificationStatus('u1')).rejects.toMatchObject({ status: 404 });
  });

  it('updateStore actualiza solo el comercio del usuario', async () => {
    const { service, repository } = setup({ existing: ROW });
    const store = await service.updateStore('u1', { city: 'Cali', whatsappE164: '+573001112233' });
    expect(repository.update).toHaveBeenCalledWith('s1', {
      city: 'Cali',
      whatsappE164: '+573001112233',
    });
    expect(store.city).toBe('Cali');
  });

  it('el estado de verificación sale del módulo verification', async () => {
    const { service, verification } = setup({ existing: ROW });
    expect(await service.getVerificationStatus('u1')).toEqual({ status: 'not_submitted' });
    expect(verification.getStatus).toHaveBeenCalledWith('s1');
  });

  it('getStoreByOwner expone solo id y si está verificado', async () => {
    const { service } = setup({ existing: { ...ROW, isVerified: true } });
    expect(await service.getStoreByOwner('u1')).toEqual({ id: 's1', isVerified: true });
    expect(await setup({ existing: null }).service.getStoreByOwner('u1')).toBeNull();
  });
});
