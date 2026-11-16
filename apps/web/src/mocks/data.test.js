import { specsSchemaByCategory } from '@hw/contracts';
import { describe, expect, it } from 'vitest';
import { offerSchema, storeCardSchema } from '../shared/api/schemas.js';
import { offers, stores } from './data.js';

// Los datos simulados deben cumplir los mismos esquemas que usará la API real.
describe('datos simulados', () => {
  it.each(offers.map((offer) => [offer.component.displayName, offer]))(
    'la oferta %s cumple el esquema',
    (_name, offer) => {
      expect(offerSchema.safeParse(offer).success).toBe(true);
      // las especificaciones cumplen el esquema estricto de @hw/contracts para su categoría
      const result = specsSchemaByCategory[offer.component.category].safeParse(
        offer.component.specs,
      );
      expect(result.error?.issues ?? []).toEqual([]);
    },
  );

  it.each(stores.map((store) => [store.tradeName, store]))(
    'la tienda %s cumple el esquema',
    (_name, store) => {
      expect(storeCardSchema.safeParse(store).success).toBe(true);
    },
  );

  it('los precios son enteros en COP y los identificadores no se repiten', () => {
    expect(offers.every((offer) => Number.isInteger(offer.priceCop) && offer.priceCop > 0)).toBe(
      true,
    );
    expect(new Set(offers.map((offer) => offer.offerId)).size).toBe(offers.length);
  });

  it('solo hay tiendas verificadas con WhatsApp en formato E.164', () => {
    expect(
      stores.every((store) => store.isVerified && /^\+57\d{10}$/.test(store.whatsappE164)),
    ).toBe(true);
  });
});
