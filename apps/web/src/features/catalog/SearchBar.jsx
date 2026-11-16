import Icon from '../../shared/ui/Icon.jsx';
import SearchField from '../../shared/ui/SearchField.jsx';
import { SORTS } from './filters.js';

/**
 * Barra de búsqueda, orden y tipo de vista. En pantallas pequeñas agrega el botón "Filtros".
 * @param {{ q?: string, sort: string, view: 'grid' | 'list', filterCount: number, onSearch: (q?: string) => void, onSort: (sort: string) => void, onView: (view: 'grid' | 'list') => void, onOpenFilters: () => void }} props
 */
export default function SearchBar({
  q,
  sort,
  view,
  filterCount,
  onSearch,
  onSort,
  onView,
  onOpenFilters,
}) {
  const viewButton = (value, icon, label) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={view === value}
      onClick={() => onView(value)}
      className="flex h-10 w-10 items-center justify-center rounded-lg text-outline transition-colors hover:text-on-surface aria-pressed:bg-primary-container aria-pressed:text-on-primary-container"
    >
      <Icon name={icon} className="text-[20px]" />
    </button>
  );

  return (
    <div className="flex flex-col gap-space-sm rounded-2xl bg-surface-container p-space-sm lg:flex-row lg:items-center">
      {/* key: al cambiar la búsqueda desde la URL (barra superior, enlaces) el campo se reinicia */}
      <SearchField
        key={q ?? ''}
        initial={q ?? ''}
        label="Buscar en el catálogo"
        placeholder="Buscar CPU, GPU, marca o modelo"
        onSearch={(value) => onSearch(value || undefined)}
      />

      <div className="flex items-center gap-space-sm">
        <button
          type="button"
          onClick={onOpenFilters}
          className="flex h-12 items-center gap-2 rounded-xl border border-outline-variant px-4 text-label-md text-on-surface transition-colors hover:bg-surface-variant lg:hidden"
        >
          <Icon name="tune" className="text-[20px]" />
          <span>Filtros{filterCount > 0 ? ` (${filterCount})` : ''}</span>
        </button>

        <label className="flex flex-1 items-center gap-2 text-label-md text-on-surface-variant lg:flex-none">
          <Icon name="sort" className="hidden text-[20px] sm:block" />
          <span className="hidden sm:inline">Ordenar:</span>
          <select
            value={sort}
            onChange={(event) => onSort(event.target.value)}
            aria-label="Ordenar resultados"
            className="h-12 w-full rounded-xl border border-outline-variant bg-surface px-3 text-body-sm text-on-surface focus:border-primary-container focus:outline-none focus:ring-3 focus:ring-primary-container/25 lg:w-auto"
          >
            {SORTS.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>

        <div
          role="group"
          aria-label="Tipo de vista"
          className="hidden shrink-0 gap-1 rounded-xl bg-surface p-1 sm:flex"
        >
          {viewButton('grid', 'grid_view', 'Vista cuadrícula')}
          {viewButton('list', 'view_list', 'Vista compacta')}
        </div>
      </div>
    </div>
  );
}
