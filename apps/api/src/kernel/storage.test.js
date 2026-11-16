import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createLocalStorage, isValidStorageKey } from './storage.js';

describe('isValidStorageKey', () => {
  it('acepta rutas con segmentos simples y extensión', () => {
    expect(isValidStorageKey('offers/abc-123/foto_1.jpg')).toBe(true);
    expect(isValidStorageKey('logo.png')).toBe(true);
  });

  it.each([
    ['../secreto'],
    ['offers/../../etc/passwd'],
    ['/absoluta/foto.jpg'],
    ['offers//foto.jpg'],
    ['offers\\foto.jpg'],
    ['Mayusculas/foto.jpg'],
    ['offers/foto.jpg/'],
    ['con espacio.jpg'],
    [''],
    [undefined],
    ['a'.repeat(301)],
  ])('rechaza %s', (key) => {
    expect(isValidStorageKey(key)).toBe(false);
  });
});

describe('createLocalStorage', () => {
  let dir;
  let storage;

  beforeAll(async () => {
    dir = await mkdtemp(join(tmpdir(), 'hw-storage-'));
    storage = createLocalStorage({ dir });
  });
  afterAll(() => rm(dir, { recursive: true, force: true }));

  it('guarda, consulta, lee y borra un archivo (creando las carpetas)', async () => {
    const key = 'offers/tienda-1/foto.png';
    expect(await storage.exists(key)).toBe(false);
    await storage.put(key, Buffer.from('contenido'));
    expect(await storage.exists(key)).toBe(true);
    expect((await storage.read(key)).toString()).toBe('contenido');
    await storage.remove(key);
    expect(await storage.exists(key)).toBe(false);
  });

  it('borrar algo que no existe no es un error', async () => {
    await expect(storage.remove('offers/no/existe.jpg')).resolves.toBeUndefined();
  });

  it('una clave que intenta salirse de la carpeta lanza error y no escribe', async () => {
    await expect(storage.put('../fuera.txt', Buffer.from('x'))).rejects.toThrow(/no válida/);
    await expect(storage.read('../fuera.txt')).rejects.toThrow(/no válida/);
    expect(await storage.exists('../fuera.txt')).toBe(false);
  });
});
