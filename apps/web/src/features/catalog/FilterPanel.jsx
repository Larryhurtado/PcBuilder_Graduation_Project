import { componentCategories } from '@hw/contracts';
import { useId, useMemo, useState } from 'react';
import { formatCOPAmount } from '../../shared/lib/format.js';
import { categoryLabels } from '../../shared/lib/specs.js';
import CategoryIcon from '../../shared/ui/CategoryIcon.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import { useStores } from '../stores/queries.js';
import { CONDITIONS, FACETS, countFilters } from './filters.js';

const radioRow =
  'flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-container-high has-checked:bg-primary-container has-checked:text-on-primary-container has-focus-visible:outline-2 has-focus-visible:outline-primary';

const input =
  'h-11 w-full rounded-xl border border-outline-variant bg-surface px-3 text-body-sm text-on-surface focus:border-primary-container focus:outline-none focus:ring-3 focus:ring-primary-container/25';

function Section({ title, aside, children }) {
  return (
    <fieldset className="space-y-space-sm border-0 p-0">
      <legend className="mb-space-sm flex w-full items-center justify-between text-label-sm uppercase tracking-wider text-outline">
        <span>{title}</span>
        {aside && <span className="normal-case tracking-normal text-secondary">{aside}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

const digits = (value) => value.replace(/\D/g, '').slice(0, 12);
const display = (value) => (value ? formatCOPAmount(Number(value)) : '');

/** Precio mínimo y máximo en COP; se aplican al salir del campo o con Enter. */
function PriceRange({ minPrice, maxPrice, onCommit }) {
  const [min, setMin] = useState(minPrice ?? '');
  const [max, setMax] = useState(maxPrice ?? '');
  const [error, setError] = useState('');

  const commit = () => {
    if (min && max && Number(min) > Number(max)) {
      setError('El mínimo no puede ser mayor que el máximo.');
      return;
    }
    setError('');
    onCommit({ minPrice: min || undefined, maxPrice: max || undefined });
  };

  const field = (label, value, setValue) => (
    <label className="space-y-1 text-label-sm text-outline">
      <span>{label}</span>
      <span className="relative block">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-body-sm text-outline">
          $
        </span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label={`Precio ${label.toLowerCase()} en pesos colombianos`}
          value={display(value)}
          onChange={(event) => setValue(digits(event.target.value))}
          onBlur={commit}
          className={`${input} tnum pl-7`}
        />
      </span>
    </label>
  );

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        commit();
      }}
      className="space-y-space-xs"
    >
      <div className="grid grid-cols-2 gap-space-sm">
        {field('Mínimo', min, setMin)}
        {field('Máximo', max, setMax)}
      </div>
      {error && (
        <p role="alert" className="text-code-metric text-error">
          {error}
        </p>
      )}
      <button type="submit" className="sr-only">
        Aplicar precio
      </button>
    </form>
  );
}

/** Ciudades con tienda verificada, armadas con GET /stores (con sus centros y cantidad de ofertas). */
function useCities() {
  const stores = useStores({ limit: 50 });
  const cities = useMemo(() => {
    const byCity = new Map();
    for (const store of stores.data?.items ?? []) {
      if (!store.city) continue;
      const entry = byCity.get(store.city) ?? { city: store.city, centers: new Set(), offers: 0 };
      if (store.commercialCenter) entry.centers.add(store.commercialCenter);
      entry.offers += store.offersCount;
      byCity.set(store.city, entry);
    }
    return [...byCity.values()].map((entry) => ({ ...entry, centers: [...entry.centers] }));
  }, [stores.data]);
  return { cities, isPending: stores.isPending, isError: stores.isError };
}

/**
 * Panel de filtros: categoría, precio, condición, ubicación y atributos técnicos de la categoría.
 * Cada cambio se aplica al instante (se guarda en la URL).
 * @param {{ filters: ReturnType<typeof import('./filters.js').parseFilters>, update: (patch: object) => void, clear: () => void, titleId?: string }} props
 */
export default function FilterPanel({ filters, update, clear, titleId }) {
  const name = useId();
  const { cities, isPending: citiesPending, isError: citiesError } = useCities();
  const facets = FACETS[filters.category] ?? [];
  const active = countFilters(filters);

  const conditionChecked = {
    new: !filters.condition || filters.condition === 'new',
    used: !filters.condition || filters.condition === 'used',
  };
  const toggleCondition = (value) => {
    const next = { ...conditionChecked, [value]: !conditionChecked[value] };
    if (!next.new && !next.used) return; // siempre queda una condición marcada
    update({ condition: next.new && next.used ? undefined : next.new ? 'new' : 'used' });
  };

  const toggleFacet = (facet, value) => {
    const current = filters[facet.key];
    if (facet.multiple) {
      const list = current ?? [];
      update({
        [facet.key]: list.includes(value)
          ? list.filter((item) => item !== value)
          : [...list, value],
      });
    } else {
      update({ [facet.key]: current === value ? undefined : value });
    }
  };
  const isOn = (facet, value) =>
    facet.multiple ? (filters[facet.key] ?? []).includes(value) : filters[facet.key] === value;

  return (
    <div className="space-y-space-lg">
      <div className="flex items-center justify-between gap-space-sm">
        <h2 id={titleId} className="flex items-center gap-2 text-headline-sm text-on-surface">
          <Icon name="filter_alt" className="text-[20px] text-primary" />
          Filtros de búsqueda
        </h2>
        <button
          type="button"
          onClick={clear}
          disabled={active === 0}
          className="min-h-11 px-1 text-label-sm text-secondary transition-colors hover:underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-50"
        >
          Restablecer
        </button>
      </div>

      <Section title="Categoría">
        <div role="radiogroup" aria-label="Categoría" className="space-y-0.5">
          {[
            [undefined, 'Todas las categorías'],
            ...componentCategories.map((id) => [id, categoryLabels[id]]),
          ].map(([id, label]) => (
            <label key={id ?? 'all'} className={radioRow}>
              <input
                type="radio"
                name={`${name}-categoria`}
                checked={filters.category === id}
                onChange={() => update({ category: id })}
                className="sr-only"
              />
              {id ? (
                <CategoryIcon category={id} className="h-[18px] w-[18px] shrink-0" />
              ) : (
                <Icon name="apps" className="text-[18px]" />
              )}
              <span>{label}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Rango de precio" aside="COP ($)">
        <PriceRange
          key={`${filters.minPrice}-${filters.maxPrice}`}
          minPrice={filters.minPrice}
          maxPrice={filters.maxPrice}
          onCommit={update}
        />
      </Section>

      <Section title="Condición">
        <div className="space-y-0.5">
          {CONDITIONS.map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-2 text-body-sm text-on-surface hover:bg-surface-container-high"
            >
              <input
                type="checkbox"
                checked={conditionChecked[value]}
                onChange={() => toggleCondition(value)}
                className="h-5 w-5 shrink-0 rounded-md border border-outline-variant bg-surface accent-primary-container"
              />
              <span>{label}</span>
            </label>
          ))}
        </div>
      </Section>

      <Section title="Ubicación">
        {citiesPending && (
          <p className="px-2 text-body-sm text-outline" role="status">
            Cargando ubicaciones…
          </p>
        )}
        {citiesError && (
          <p className="px-2 text-body-sm text-outline">No pudimos cargar las ubicaciones.</p>
        )}
        {!citiesPending && !citiesError && (
          <div role="radiogroup" aria-label="Ciudad" className="space-y-0.5">
            {[{ city: undefined }, ...cities].map((entry) => (
              <label key={entry.city ?? 'all'} className={radioRow}>
                <input
                  type="radio"
                  name={`${name}-ciudad`}
                  checked={filters.city === entry.city}
                  onChange={() => update({ city: entry.city })}
                  className="sr-only"
                />
                <span className="flex-1">
                  {entry.city ?? 'Todas las ciudades'}
                  {entry.centers?.length > 0 && (
                    <span className="block text-code-metric opacity-80">
                      {entry.centers.join(', ')}
                    </span>
                  )}
                </span>
                {entry.offers !== undefined && (
                  <span className="tnum text-code-metric opacity-80">{entry.offers}</span>
                )}
              </label>
            ))}
          </div>
        )}
      </Section>

      <Section
        title="Atributos técnicos"
        aside={filters.category ? categoryLabels[filters.category] : undefined}
      >
        {!filters.category && (
          <p className="text-body-sm text-outline">
            Elige una categoría para filtrar por sus atributos técnicos.
          </p>
        )}
        {filters.category && facets.length === 0 && (
          <p className="text-body-sm text-outline">
            Esta categoría todavía no tiene atributos técnicos para filtrar.
          </p>
        )}
        {facets.map((facet) => (
          <div key={facet.key} role="group" aria-label={facet.label} className="space-y-space-xs">
            <span className="block text-label-sm text-on-surface-variant">{facet.label}</span>
            <div className="flex flex-wrap gap-space-xs">
              {facet.options.map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={isOn(facet, value)}
                  onClick={() => toggleFacet(facet, value)}
                  className="tnum min-h-9 rounded-lg border border-outline-variant bg-surface px-3 text-code-metric text-on-surface-variant transition-colors hover:bg-surface-variant aria-pressed:border-transparent aria-pressed:bg-primary-container aria-pressed:text-on-primary-container"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </Section>

      <aside className="space-y-space-xs rounded-2xl bg-surface-container p-space-md">
        <p className="flex items-center gap-2 text-label-md font-semibold text-secondary">
          <Icon name="verified_user" className="text-[18px]" />
          Comercios verificados
        </p>
        <p className="text-body-sm text-on-surface-variant">
          Solo se publican ofertas de comercios cuya existencia como negocio fue verificada con
          documentos. La verificación no garantiza el cumplimiento de sus ofertas.
        </p>
      </aside>
    </div>
  );
}
