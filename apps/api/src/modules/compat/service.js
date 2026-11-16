import { constraintsFor, evaluate, slotForCategory } from '@hw/compat-engine';
import { AppError } from '../../kernel/errors.js';

/**
 * Validación de autoridad del armado en el servidor (Diseño Integral, 4.5): las especificaciones
 * salen siempre del catálogo, nunca del cliente.
 * @param {{ catalog: { getSpecs: (ids: string[]) => Promise<Map<string, any>> } }} deps
 *   `catalog` es la fachada pública del módulo catalog (regla M-1)
 */
export function createCompatService({ catalog }) {
  /**
   * Convierte [{ category, componentId }] en las ranuras del motor y en el resumen de piezas.
   * Un componente inexistente (o inactivo) es 404; uno que no es de la categoría indicada, 422.
   */
  async function loadBuild(items) {
    const components = await catalog.getSpecs(items.map((item) => item.componentId));
    const build = {};
    const summaries = [];
    for (const item of items) {
      const component = components.get(item.componentId);
      if (!component) {
        throw new AppError('COMPONENT_NOT_FOUND', { details: { componentId: item.componentId } });
      }
      if (component.category !== item.category) {
        throw new AppError('VALIDATION_ERROR', {
          message: `El componente ${component.displayName} no es de la categoría ${item.category}.`,
          details: { componentId: item.componentId, category: item.category },
        });
      }
      build[slotForCategory(item.category)] = component.specs;
      summaries.push({
        category: item.category,
        componentId: component.id,
        brand: component.brand,
        model: component.model,
        displayName: component.displayName,
      });
    }
    return { build, items: summaries };
  }

  return {
    /** Evalúa las reglas RC-01 a RC-08, el consumo y la fuente recomendada. */
    async validate(items) {
      const { build, items: summaries } = await loadBuild(items);
      return { ...evaluate(build), items: summaries };
    },

    /** Restricciones que las piezas ya elegidas imponen a la siguiente (HU-06). */
    async constraints(category, items) {
      const { build } = await loadBuild(items);
      return { category, constraints: constraintsFor(category, build) };
    },
  };
}
