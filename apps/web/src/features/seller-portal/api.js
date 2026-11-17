import {
  analyticsSummarySchema,
  sellerOfferResponseSchema,
  sellerOffersResponseSchema,
  storeResponseSchema,
  verificationStatusSchema,
} from '@hw/contracts';
import { apiFetch } from '../../shared/api/client.js';

/** El comercio del vendedor (GET /seller/store). */
export async function getMyStore({ signal } = {}) {
  return storeResponseSchema.parse(await apiFetch('/seller/store', { signal })).store;
}

/** Estado de la verificación del comercio (GET /seller/verification/status). */
export async function getVerificationStatus({ signal } = {}) {
  return verificationStatusSchema.parse(await apiFetch('/seller/verification/status', { signal }));
}

/** Todas las ofertas del comercio (GET /seller/offers), activas y pausadas. */
export async function getSellerOffers({ signal } = {}) {
  return sellerOffersResponseSchema.parse(await apiFetch('/seller/offers', { signal })).items;
}

/** Cambia precio, garantía o descripción de una oferta (PATCH /seller/offers/{id}). */
export async function updateSellerOffer(id, body) {
  return sellerOfferResponseSchema.parse(
    await apiFetch(`/seller/offers/${id}`, { method: 'PATCH', body }),
  ).offer;
}

/** Activa o pausa una oferta (PATCH /seller/offers/{id}/visibility). */
export async function setSellerOfferStatus(id, status) {
  return sellerOfferResponseSchema.parse(
    await apiFetch(`/seller/offers/${id}/visibility`, { method: 'PATCH', body: { status } }),
  ).offer;
}

/** Elimina una oferta (DELETE /seller/offers/{id}); es una baja lógica. */
export async function deleteSellerOffer(id) {
  await apiFetch(`/seller/offers/${id}`, { method: 'DELETE' });
}

/** Visitas, clics a WhatsApp y ofertas del rango `from`–`to` (GET /seller/analytics/summary). */
export async function getAnalyticsSummary({ from, to, signal }) {
  return analyticsSummarySchema.parse(
    await apiFetch('/seller/analytics/summary', { query: { from, to }, signal }),
  );
}
