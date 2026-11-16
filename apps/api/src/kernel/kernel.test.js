import { describe, expect, it, vi } from 'vitest';
import { loadConfig } from './config.js';
import { AppError } from './errors.js';
import { createEventBus } from './event-bus.js';

describe('loadConfig', () => {
  it('aplica valores por defecto', () => {
    const config = loadConfig({});
    expect(config.PORT).toBe(3000);
    expect(config.NODE_ENV).toBe('development');
    expect(config.CORS_ORIGIN).toBe('http://localhost:5173');
    expect(config.DATABASE_URL).toBeUndefined();
  });

  it('convierte PORT a número', () => {
    expect(loadConfig({ PORT: '4100' }).PORT).toBe(4100);
  });

  it('rechaza un PORT inválido', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow();
  });
});

describe('AppError', () => {
  it('toma estado y mensaje del código de negocio', () => {
    const error = new AppError('STORE_NOT_VERIFIED');
    expect(error.status).toBe(403);
    expect(error.message).toContain('Aún no puedes publicar');
    expect(error.details).toBeNull();
  });

  it('permite sobrescribir mensaje, estado y detalles', () => {
    const error = new AppError('VALIDATION_ERROR', {
      message: 'Precio inválido',
      status: 400,
      details: { field: 'priceCop' },
    });
    expect(error.status).toBe(400);
    expect(error.message).toBe('Precio inválido');
    expect(error.details).toEqual({ field: 'priceCop' });
  });
});

describe('createEventBus', () => {
  it('entrega el evento a todos los suscriptores', async () => {
    const bus = createEventBus();
    const a = vi.fn();
    const b = vi.fn();
    bus.on('verification.approved', a);
    bus.on('verification.approved', b);
    await bus.emit('verification.approved', { storeId: 's1' });
    expect(a).toHaveBeenCalledWith({ storeId: 's1' });
    expect(b).toHaveBeenCalledWith({ storeId: 's1' });
  });

  it('un manejador que falla no impide a los demás ni al publicador', async () => {
    const onError = vi.fn();
    const bus = createEventBus({ onError });
    const despues = vi.fn();
    bus.on('x', () => {
      throw new Error('falla');
    });
    bus.on('x', despues);
    await expect(bus.emit('x', 1)).resolves.toBeUndefined();
    expect(despues).toHaveBeenCalledWith(1);
    expect(onError).toHaveBeenCalledOnce();
  });

  it('permite cancelar una suscripción', async () => {
    const bus = createEventBus();
    const handler = vi.fn();
    const off = bus.on('x', handler);
    off();
    await bus.emit('x', 1);
    expect(handler).not.toHaveBeenCalled();
  });
});
