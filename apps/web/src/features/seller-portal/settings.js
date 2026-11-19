import { LOCATIONS, OTHER_LOCATION, resolveLocation } from '../seller/locations.js';

const NIT_PATTERN = /^[0-9]{8,10}-[0-9]$/;

/** Razón social y NIT no se editan mientras la verificación está en curso, aprobada o suspendida. */
export function identityLocked(status) {
  return ['pending_review', 'approved', 'suspended'].includes(status);
}

/** Qué ubicación del selector corresponde a lo guardado en la tienda ('' si aún no hay ciudad). */
function locationOf(store) {
  if (!store.city) return '';
  const found = LOCATIONS.find(
    (item) =>
      item.city === store.city &&
      item.department === store.department &&
      item.commercialCenter === store.commercialCenter,
  );
  return found ? found.id : OTHER_LOCATION;
}

/** Borrador del formulario con lo que hoy tiene guardado la tienda. */
export function draftFromStore(store) {
  const location = locationOf(store);
  return {
    tradeName: store.tradeName ?? '',
    legalName: store.legalName ?? '',
    nit: store.nit ?? '',
    description: store.description ?? '',
    // Los 10 dígitos del celular, sin el +57
    whatsapp: store.whatsappE164 ? store.whatsappE164.replace(/^\+57/, '') : '',
    location,
    otherCity: location === OTHER_LOCATION ? (store.city ?? '') : '',
    otherDepartment: location === OTHER_LOCATION ? (store.department ?? '') : '',
    address: store.address ?? '',
  };
}

const clean = (text) => text.trim();
const normalizeNit = (text) => text.trim().replace(/[.\s]/g, '');
const normalizePhone = (text) => text.trim().replace(/[\s-]/g, '');

/**
 * Errores de cada campo (objeto vacío = se puede guardar). Mismas reglas del contrato de la API.
 * @param {ReturnType<typeof draftFromStore>} draft
 * @param {{ lockedIdentity: boolean }} options con la identidad bloqueada no se validan razón social ni NIT
 */
export function validateDraft(draft, { lockedIdentity }) {
  const errors = {};
  const trade = clean(draft.tradeName);
  if (trade.length < 2) errors.tradeName = 'Escribe el nombre comercial de tu tienda';
  else if (trade.length > 120) errors.tradeName = 'Máximo 120 caracteres';

  if (!lockedIdentity) {
    const legal = clean(draft.legalName);
    if (legal.length < 2) errors.legalName = 'Escribe la razón social de la empresa';
    else if (legal.length > 200) errors.legalName = 'Máximo 200 caracteres';
    const nit = normalizeNit(draft.nit);
    // El NIT es opcional hasta que se llene: se exige solo si el negocio ya lo tenía o se escribe algo
    if (nit !== '' && !NIT_PATTERN.test(nit)) {
      errors.nit = 'NIT con dígito de verificación, p. ej. 900234567-8';
    }
  }

  if (clean(draft.description).length > 1000) errors.description = 'Máximo 1000 caracteres';

  const phone = normalizePhone(draft.whatsapp);
  if (phone !== '' && !/^3[0-9]{9}$/.test(phone)) {
    errors.whatsapp = 'Celular colombiano: 10 dígitos que empiezan en 3';
  }

  const address = clean(draft.address);
  if (address !== '' && (address.length < 3 || address.length > 200)) {
    errors.address = 'Escribe la dirección o el número de local (3 a 200 caracteres)';
  }

  if (draft.location === OTHER_LOCATION) {
    if (clean(draft.otherCity).length < 2) errors.otherCity = 'Escribe la ciudad';
    if (clean(draft.otherDepartment).length < 2) errors.otherDepartment = 'Escribe el departamento';
  }
  return errors;
}

/**
 * Solo los campos que cambiaron respecto de la tienda guardada, listos para PATCH /seller/store.
 * Los datos que la API no acepta vacíos (NIT, WhatsApp, dirección, ciudad…) no se envían si están
 * en blanco.
 */
export function toPatch(draft, store, { lockedIdentity }) {
  const patch = {};
  const trade = clean(draft.tradeName);
  if (trade !== store.tradeName) patch.tradeName = trade;

  if (!lockedIdentity) {
    const legal = clean(draft.legalName);
    if (legal !== store.legalName) patch.legalName = legal;
    const nit = normalizeNit(draft.nit);
    if (nit !== '' && nit !== (store.nit ?? '')) patch.nit = nit;
  }

  const description = clean(draft.description) || null;
  if (description !== (store.description ?? null)) patch.description = description;

  const phone = normalizePhone(draft.whatsapp);
  if (phone !== '' && `+57${phone}` !== store.whatsappE164) patch.whatsappE164 = `+57${phone}`;

  const address = clean(draft.address);
  if (address !== '' && address !== (store.address ?? '')) patch.address = address;

  if (draft.location !== '') {
    const place = resolveLocation(draft);
    if (place.city !== (store.city ?? '')) patch.city = place.city;
    if (place.department !== (store.department ?? '')) patch.department = place.department;
    if (place.commercialCenter !== (store.commercialCenter ?? null)) {
      patch.commercialCenter = place.commercialCenter;
    }
  }
  return patch;
}

/** Datos que la verificación exige y todavía faltan en la tienda. */
export function missingForVerification(store) {
  const missing = [];
  if (!store.nit) missing.push('NIT');
  if (!store.whatsappE164) missing.push('WhatsApp de ventas');
  if (!store.city || !store.department) missing.push('Ciudad y departamento');
  if (!store.address) missing.push('Dirección');
  return missing;
}
