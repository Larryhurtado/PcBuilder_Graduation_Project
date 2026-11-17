import {
  analyticsSummarySchema,
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

/** Visitas, clics a WhatsApp y ofertas del rango `from`–`to` (GET /seller/analytics/summary). */
export async function getAnalyticsSummary({ from, to, signal }) {
  return analyticsSummarySchema.parse(
    await apiFetch('/seller/analytics/summary', { query: { from, to }, signal }),
  );
}
