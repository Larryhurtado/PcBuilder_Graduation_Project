import { AppError } from '../../kernel/errors.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/;

const invalid = () => new AppError('VALIDATION_ERROR', { message: 'El cursor no es válido.' });

/**
 * Cursor opaco de paginación por claves (keyset): guarda el orden, el valor del último elemento
 * y su id. Para `newest` el valor es la fecha como texto de PostgreSQL (conserva los
 * microsegundos; una fecha de JavaScript los perdería y saltaría o repetiría ofertas).
 * @param {'price_asc' | 'price_desc' | 'newest'} sort
 * @param {{ offerId: string, priceCop: number, publishedAtRaw: string }} row
 */
export function encodeCursor(sort, row) {
  const value = sort === 'newest' ? row.publishedAtRaw : row.priceCop;
  return Buffer.from(JSON.stringify({ s: sort, v: value, id: row.offerId })).toString('base64url');
}

/**
 * @param {string} text
 * @param {'price_asc' | 'price_desc' | 'newest'} sort
 * @returns {{ value: string | number, id: string }}
 */
export function decodeCursor(text, sort) {
  let data;
  try {
    data = JSON.parse(Buffer.from(text, 'base64url').toString('utf8'));
  } catch {
    throw invalid();
  }
  if (!data || data.s !== sort || typeof data.id !== 'string' || !UUID.test(data.id))
    throw invalid();
  const valueOk =
    sort === 'newest'
      ? typeof data.v === 'string' && TIMESTAMP.test(data.v)
      : Number.isFinite(data.v);
  if (!valueOk) throw invalid();
  return { value: data.v, id: data.id };
}
