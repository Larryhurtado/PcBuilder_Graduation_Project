import { describe, expect, it, vi } from 'vitest';
import { escapeLike } from '../../kernel/sql.js';
import { createCatalogRepository } from './repository.js';

describe('escapeLike', () => {
  it('escapa los comodines de ILIKE', () => {
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\');
    expect(escapeLike('ryzen')).toBe('ryzen');
  });
});

describe('createCatalogRepository', () => {
  it('findSpecs rechaza una categoría desconocida sin consultar', async () => {
    const db = { query: vi.fn() };
    await expect(createCatalogRepository(db).findSpecs('monitor', [])).rejects.toThrow(
      /Categoría desconocida/,
    );
    expect(db.query).not.toHaveBeenCalled();
  });

  it('search pasa el texto, el patrón escapado y el límite como parámetros', async () => {
    const db = { query: vi.fn(async () => ({ rows: [] })) };
    await createCatalogRepository(db).search('50%', 8);
    const [sql, params] = db.query.mock.calls[0];
    expect(params).toEqual(['50%', '%50\\%%', 8]);
    expect(sql).not.toContain('50%'); // el texto del usuario nunca se concatena en el SQL
  });

  it('findComponents pasa la lista de ids como un solo parámetro', async () => {
    const db = { query: vi.fn(async () => ({ rows: [{ id: 'a' }] })) };
    const rows = await createCatalogRepository(db).findComponents(['a', 'b']);
    expect(db.query.mock.calls[0][1]).toEqual([['a', 'b']]);
    expect(rows).toEqual([{ id: 'a' }]);
  });
});
