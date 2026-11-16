import { AppError } from '../../kernel/errors.js';

/** Une la cabecera del componente con sus especificaciones planas. */
function toComponent(row, specsRow) {
  if (!specsRow) {
    throw new Error(`El componente ${row.id} (${row.category}) no tiene fila de especificaciones.`);
  }
  const { componentId: _componentId, ...specs } = specsRow;
  return {
    id: row.id,
    category: row.category,
    brand: row.brand,
    model: row.model,
    displayName: row.displayName,
    releaseYear: row.releaseYear,
    version: row.version,
    updatedAt: new Date(row.updatedAt).toISOString(),
    source: row.sourceName
      ? { name: row.sourceName, license: row.sourceLicense, attributionText: row.sourceAttribution }
      : null,
    specs,
  };
}

/** @param {{ repository: ReturnType<import('./repository.js').createCatalogRepository> }} deps */
export function createCatalogService({ repository }) {
  /** Carga componentes con sus especificaciones: 1 consulta de cabeceras + 1 por categoría presente. */
  async function loadComponents(ids) {
    if (ids.length === 0) return [];
    const rows = await repository.findComponents(ids);

    const idsByCategory = new Map();
    for (const row of rows) {
      if (!idsByCategory.has(row.category)) idsByCategory.set(row.category, []);
      idsByCategory.get(row.category).push(row.id);
    }

    const specsById = new Map();
    for (const [category, categoryIds] of idsByCategory) {
      for (const specsRow of await repository.findSpecs(category, categoryIds)) {
        specsById.set(specsRow.componentId, specsRow);
      }
    }
    return rows.map((row) => toComponent(row, specsById.get(row.id)));
  }

  return {
    /** Ficha técnica de un componente activo. */
    async getComponent(id) {
      const [component] = await loadComponents([id]);
      if (!component) throw new AppError('COMPONENT_NOT_FOUND');
      return component;
    },

    /** Varios componentes a la vez. Devuelve un Map id → componente (omite los inexistentes). */
    async getSpecs(ids) {
      const components = await loadComponents([...new Set(ids)]);
      return new Map(components.map((component) => [component.id, component]));
    },

    async exists(id) {
      const rows = await repository.findComponents([id]);
      return rows.length > 0;
    },

    /** Buscador global con precio mínimo y número de ofertas activas. */
    async search(term, limit = 8) {
      const rows = await repository.search(term.trim(), limit);
      return rows.map((row) => ({
        id: row.id,
        category: row.category,
        brand: row.brand,
        model: row.model,
        displayName: row.displayName,
        minPriceCop: row.minPriceCop ?? null,
        offersCount: row.offersCount,
      }));
    },
  };
}
