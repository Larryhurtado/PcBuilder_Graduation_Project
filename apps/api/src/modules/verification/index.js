// Fachada pública del módulo `verification` (regla M-1).
// En esta entrega la revisión de documentos queda fuera: la aprobación se simula con
// `npm run dev:approve-store`. Aquí solo se abre la solicitud y se consulta su estado.
import { createVerificationRepository } from './repository.js';

const iso = (value) => (value ? new Date(value).toISOString() : null);

/** @param {{ db: { query: Function } }} deps */
export function createVerificationModule({ db }) {
  const repository = createVerificationRepository(db);
  return {
    facade: {
      openRequest: (storeId) => repository.ensureRequest(storeId),

      /** Estado de verificación del comercio; sin solicitud equivale a `not_submitted`. */
      async getStatus(storeId) {
        const row = await repository.findByStore(storeId);
        return {
          status: row?.status ?? 'not_submitted',
          submittedAt: iso(row?.submittedAt),
          reviewerNote: row?.reviewerNote ?? null,
          deadlineAt: iso(row?.deadlineAt),
          canReapplyAt: iso(row?.canReapplyAt),
        };
      },
    },
  };
}
