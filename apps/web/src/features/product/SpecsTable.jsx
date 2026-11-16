import { formatDate } from '../../shared/lib/format.js';
import { specRows } from '../../shared/lib/specs.js';
import Icon from '../../shared/ui/Icon.jsx';

/**
 * Tabla de especificaciones con la versión del dato y la atribución de la fuente (obligatoria por
 * la licencia de BuildCores). Un dato desconocido se muestra como "No disponible".
 * @param {{ component: import('zod').infer<typeof import('@hw/contracts').componentSchema> }} props
 */
export default function SpecsTable({ component }) {
  const rows = specRows(component.category, component.specs);
  const updated = formatDate(component.updatedAt);

  return (
    <section
      aria-labelledby="specs-title"
      className="overflow-hidden rounded-2xl bg-surface-container"
    >
      <h2
        id="specs-title"
        className="flex items-center gap-2 bg-surface-container-high px-space-md py-space-sm text-label-md text-on-surface"
      >
        <Icon name="memory" className="text-[18px] text-primary" />
        Especificaciones técnicas
      </h2>
      <dl>
        {rows.map((row) => (
          <div
            key={row.key}
            className="grid grid-cols-1 gap-x-space-md gap-y-0.5 border-t border-outline-variant/40 px-space-md py-space-sm first:border-t-0 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]"
          >
            <dt className="text-body-sm text-on-surface-variant">{row.label}</dt>
            <dd
              className={`tnum text-body-sm ${row.value === null ? 'text-outline' : 'text-on-surface'}`}
            >
              {row.value ?? 'No disponible'}
            </dd>
          </div>
        ))}
      </dl>
      <div className="space-y-1 border-t border-outline-variant/40 px-space-md py-space-sm text-[12px] text-outline">
        <p className="tnum">
          Versión del dato: v{component.version}
          {updated && ` • Actualizado el ${updated}`}
          {component.source && ` • Fuente: ${component.source.name}`}
        </p>
        {component.source && <p>{component.source.attributionText}</p>}
      </div>
    </section>
  );
}
