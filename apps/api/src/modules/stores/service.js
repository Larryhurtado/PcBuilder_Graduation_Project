import { AppError } from '../../kernel/errors.js';

const logoUrl = (key) => (key ? `/storage/${key}` : null);

export function toStore(row) {
  return {
    id: row.id,
    legalName: row.legalName,
    tradeName: row.tradeName,
    nit: row.nit ?? null,
    description: row.description ?? null,
    logoUrl: logoUrl(row.logoKey),
    whatsappE164: row.whatsappE164 ?? null,
    department: row.department ?? null,
    city: row.city ?? null,
    address: row.address ?? null,
    commercialCenter: row.commercialCenter ?? null,
    latitude: row.latitude ?? null,
    longitude: row.longitude ?? null,
    openingHours: row.openingHours ?? null,
    isVerified: row.isVerified,
  };
}

/**
 * @param {{
 *   repository: ReturnType<import('./repository.js').createStoresRepository>,
 *   identity: { setRole: Function, issueAccessToken: Function },
 *   verification: { openRequest: Function, getStatus: Function },
 * }} deps `identity` y `verification` son las fachadas públicas de esos módulos (regla M-1)
 */
export function createStoresService({ repository, identity, verification }) {
  async function requireStore(userId) {
    const store = await repository.findByOwner(userId);
    if (!store)
      throw new AppError('NOT_FOUND', { message: 'Aún no tienes un negocio registrado.' });
    return store;
  }

  return {
    /**
     * Convierte a un comprador en vendedor. Cada paso es idempotente: si algo falla a la mitad,
     * repetir la petición termina el trabajo sin duplicar nada.
     */
    async convert(userId, { legalName, tradeName }) {
      const current = await identity.getUser(userId);
      if (current.role === 'seller' || current.role === 'admin') {
        throw new AppError('VALIDATION_ERROR', {
          status: 409,
          message: 'Esta cuenta ya es de vendedor.',
        });
      }
      const store =
        (await repository.insert({ ownerUserId: userId, legalName, tradeName })) ??
        (await repository.findByOwner(userId));
      await verification.openRequest(store.id);
      await identity.setRole(userId, 'seller');
      const session = await identity.issueAccessToken(userId);
      return { ...session, store: toStore(store) };
    },

    /** Directorio público: solo comercios verificados y solo datos de contacto comercial. */
    async listPublic(query) {
      const rows = await repository.listVerified(query);
      return rows.map((row) => ({
        id: row.id,
        name: row.tradeName,
        description: row.description ?? null,
        logoUrl: logoUrl(row.logoKey),
        department: row.department ?? null,
        city: row.city ?? null,
        commercialCenter: row.commercialCenter ?? null,
        address: row.address ?? null,
        whatsappE164: row.whatsappE164 ?? null,
        offersCount: row.offersCount,
      }));
    },

    async getStore(userId) {
      return toStore(await requireStore(userId));
    },

    async updateStore(userId, patch) {
      const store = await requireStore(userId);
      return toStore(await repository.update(store.id, patch));
    },

    async getVerificationStatus(userId) {
      const store = await requireStore(userId);
      return verification.getStatus(store.id);
    },

    /** Para otros módulos: el comercio del vendedor con el dato que importa para publicar. */
    async getStoreByOwner(userId) {
      const store = await repository.findByOwner(userId);
      return store ? { id: store.id, isVerified: store.isVerified } : null;
    },
  };
}
