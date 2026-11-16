import { describe, expect, it } from 'vitest';
import { buildStoreWhatsAppUrl, buildWhatsAppMessage, buildWhatsAppUrl } from './whatsapp.js';

describe('buildStoreWhatsAppUrl', () => {
  it('arma un enlace de consulta general a la tienda', () => {
    const url = buildStoreWhatsAppUrl({
      phoneE164: '+573000000001',
      storeName: 'TecnoPasarela Cali',
    });
    expect(url).toMatch(/^https:\/\/wa\.me\/573000000001\?text=/);
    expect(decodeURIComponent(url.split('text=')[1])).toBe(
      'Hola, vi TecnoPasarela Cali en PcBuilder. Quisiera consultar por sus componentes.',
    );
  });

  it('devuelve null con un número inválido o ausente', () => {
    expect(buildStoreWhatsAppUrl({ phoneE164: null, storeName: 'X' })).toBeNull();
    expect(buildStoreWhatsAppUrl({ phoneE164: '3000000001', storeName: 'X' })).toBeNull();
  });
});

const offer = { productName: 'AMD Ryzen 5 7600', priceCop: 849000 };

describe('buildWhatsAppMessage', () => {
  it('incluye el producto, el precio en COP y la plataforma', () => {
    expect(buildWhatsAppMessage(offer)).toBe(
      'Hola, vi tu publicación de AMD Ryzen 5 7600 a 849.000 COP en PcBuilder. ¿Sigue disponible?',
    );
  });

  it('permite cambiar el nombre de la plataforma', () => {
    expect(buildWhatsAppMessage({ ...offer, platformName: 'Otra' })).toContain('en Otra.');
  });

  it('omite el precio si no es válido, sin escribir NaN', () => {
    const message = buildWhatsAppMessage({ productName: 'Fuente 750 W', priceCop: Number.NaN });
    expect(message).toBe(
      'Hola, vi tu publicación de Fuente 750 W en PcBuilder. ¿Sigue disponible?',
    );
  });
});

describe('buildWhatsAppUrl', () => {
  it('arma el enlace wa.me con el número sin el signo + y el mensaje codificado', () => {
    const url = buildWhatsAppUrl({ phoneE164: '+573000000001', ...offer });
    expect(url).toBe(
      `https://wa.me/573000000001?text=${encodeURIComponent(buildWhatsAppMessage(offer))}`,
    );
    expect(url).not.toContain('+');
  });

  it('el mensaje se puede recuperar del enlace', () => {
    const url = new URL(buildWhatsAppUrl({ phoneE164: '+573000000002', ...offer }));
    expect(url.host).toBe('wa.me');
    expect(url.pathname).toBe('/573000000002');
    expect(url.searchParams.get('text')).toBe(buildWhatsAppMessage(offer));
  });

  it.each([null, undefined, '', '3000000001', '+57 300', 'abc', '+0123456789'])(
    'devuelve null con un número inválido (%s)',
    (phoneE164) => {
      expect(buildWhatsAppUrl({ phoneE164, ...offer })).toBeNull();
    },
  );
});
