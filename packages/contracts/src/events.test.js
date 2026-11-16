import { describe, expect, it } from 'vitest';
import { eventBodySchema, eventTypeValues } from './index.js';

const ID = '6b03b443-7b22-491c-b301-7e2a285359df';

describe('eventBodySchema', () => {
  it('acepta una vista y un clic a WhatsApp', () => {
    for (const type of eventTypeValues) {
      expect(eventBodySchema.safeParse({ offerId: ID, type }).success).toBe(true);
    }
    expect(eventTypeValues).toEqual(['view', 'whatsapp_click']);
  });

  it('rechaza tipos desconocidos, ids inválidos y campos extra', () => {
    expect(eventBodySchema.safeParse({ offerId: ID, type: 'compra' }).success).toBe(false);
    expect(eventBodySchema.safeParse({ offerId: 'abc', type: 'view' }).success).toBe(false);
    expect(eventBodySchema.safeParse({ offerId: ID, type: 'view', extra: 1 }).success).toBe(false);
  });
});
