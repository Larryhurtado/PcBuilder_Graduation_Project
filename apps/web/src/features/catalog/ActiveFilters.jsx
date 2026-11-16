import Icon from '../../shared/ui/Icon.jsx';
import { activeChips } from './filters.js';

/**
 * Filtros activos como chips que se pueden quitar uno por uno, con "Limpiar todos los filtros".
 * @param {{ filters: ReturnType<typeof import('./filters.js').parseFilters>, update: (patch: object) => void, clear: () => void }} props
 */
export default function ActiveFilters({ filters, update, clear }) {
  const chips = activeChips(filters);
  if (chips.length === 0) return null;

  return (
    <div
      className="flex flex-wrap items-center gap-space-xs"
      aria-label="Filtros activos"
      role="group"
    >
      <span className="text-label-sm uppercase tracking-wider text-outline">Filtros activos:</span>
      {chips.map((chip) => (
        <span
          key={chip.id}
          className="tnum flex items-center gap-1 rounded-lg bg-surface-container py-0.5 pl-3 text-code-metric text-on-surface"
        >
          <span>{chip.label}</span>
          <button
            type="button"
            onClick={() => update(chip.patch)}
            aria-label={`Quitar filtro: ${chip.label}`}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-outline transition-colors hover:text-on-surface"
          >
            <Icon name="close" className="text-[16px]" />
          </button>
        </span>
      ))}
      <button
        type="button"
        onClick={clear}
        className="flex min-h-11 items-center gap-1 px-2 text-label-sm text-secondary hover:underline"
      >
        <Icon name="restart_alt" className="text-[16px]" />
        Limpiar todos los filtros
      </button>
    </div>
  );
}
