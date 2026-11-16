import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Carpeta por defecto: `storage/` en la raíz del repositorio (ignorada por git). */
export const DEFAULT_STORAGE_DIR = fileURLToPath(new URL('../../../../storage', import.meta.url));

/** Una clave válida son segmentos de letras minúsculas, números, guion y punto, separados por `/`. */
const KEY_PATTERN = /^[a-z0-9_-]+(\/[a-z0-9_-]+)*(\.[a-z0-9]+)?$/;

export const isValidStorageKey = (key) =>
  typeof key === 'string' && key.length <= 300 && KEY_PATTERN.test(key);

/**
 * Almacenamiento de archivos en disco local (puerto de almacenamiento: en producción lo
 * reemplazaría un almacenamiento de objetos con la misma interfaz).
 * @param {{ dir?: string }} [options]
 */
export function createLocalStorage({ dir = DEFAULT_STORAGE_DIR } = {}) {
  const root = resolve(dir);

  function pathFor(key) {
    if (!isValidStorageKey(key)) throw new Error(`Clave de almacenamiento no válida: ${key}`);
    const full = resolve(join(root, key));
    // Defensa extra contra rutas que se escapen de la carpeta
    if (!full.startsWith(root + sep)) throw new Error(`Clave de almacenamiento no válida: ${key}`);
    return full;
  }

  return {
    root,
    async put(key, buffer) {
      const file = pathFor(key);
      await mkdir(dirname(file), { recursive: true });
      await writeFile(file, buffer);
    },
    async exists(key) {
      try {
        return (await stat(pathFor(key))).isFile();
      } catch {
        return false;
      }
    },
    async read(key) {
      return readFile(pathFor(key));
    },
    async remove(key) {
      await rm(pathFor(key), { force: true });
    },
  };
}
