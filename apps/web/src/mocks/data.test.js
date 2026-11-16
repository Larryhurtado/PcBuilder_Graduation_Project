import { offerListItemSchema, publicStoreSchema, specsSchemaByCategory } from '@hw/contracts';
import { describe, expect, it } from 'vitest';
import { offers, publicStores } from './data.js';

// Los datos simulados deben cumplir los mismos esquemas que usará la API real.
describe('datos simulados', () => {
  it.each(offers.map((offer) => [offer.component.displayName, offer]))(
    'la oferta %s cumple el esquema',
    (_name, offer) => {
      expect(offerListItemSchema.safeParse(offer).success).toBe(true);
      // las especificaciones cumplen el esquema estricto de @hw/contracts para su categoría
      const result = specsSchemaByCategory[offer.component.category].safeParse(
        offer.component.specs,
      );
      expect(result.error?.issues ?? []).toEqual([]);
    },
  );

  it.each(publicStores.map((store) => [store.name, store]))(
    'la tienda %s cumple el esquema público de GET /stores',
    (_name, store) => {
      expect(publicStoreSchema.safeParse(store).success).toBe(true);
    },
  );

  it('cada tienda cuenta sus ofertas activas', () => {
    expect(publicStores.map((store) => store.offersCount)).toEqual(
      publicStores.map((store) => offers.filter((offer) => offer.store.id === store.id).length),
    );
    expect(publicStores.every((store) => store.offersCount > 0)).toBe(true);
  });

  it('los precios son enteros en COP y los identificadores no se repiten', () => {
    expect(offers.every((offer) => Number.isInteger(offer.priceCop) && offer.priceCop > 0)).toBe(
      true,
    );
    expect(new Set(offers.map((offer) => offer.offerId)).size).toBe(offers.length);
  });

  it('las tiendas tienen WhatsApp en formato E.164', () => {
    expect(publicStores.every((store) => /^\+573\d{9}$/.test(store.whatsappE164))).toBe(true);
  });
});
