import {
  analyticsSummarySchema,
  presignResponseSchema,
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

/** Marcas con componentes activos en una categoría (GET /catalog/brands), para el paso 1. */
export async function getCatalogBrands(category, { signal } = {}) {
  const data = await apiFetch('/catalog/brands', { query: { category }, signal });
  return data.items;
}

/** Modelos activos de una marca en una categoría (GET /catalog/models), para el paso 1. */
export async function getCatalogModels(category, brandId, { signal } = {}) {
  const data = await apiFetch('/catalog/models', { query: { category, brandId }, signal });
  return data.items;
}

/** Publica una oferta (POST /seller/offers). */
export async function createSellerOffer(body) {
  return sellerOfferResponseSchema.parse(await apiFetch('/seller/offers', { method: 'POST', body }))
    .offer;
}

/**
 * Sube una foto en dos pasos, como en producción: pide a dónde enviarla (presign) y la envía cruda.
 * Devuelve la clave que luego va en `imageKeys` al publicar.
 * @param {File} file
 */
export async function uploadOfferImage(file) {
  const { uploadUrl, storageKey } = presignResponseSchema.parse(
    await apiFetch('/seller/offers/images/presign', {
      method: 'POST',
      body: { fileName: file.name, mimeType: file.type, sizeBytes: file.size },
    }),
  );
  await apiFetch(uploadUrl.replace(/^\/api\/v1/, ''), { method: 'PUT', rawBody: file });
  return storageKey;
}
