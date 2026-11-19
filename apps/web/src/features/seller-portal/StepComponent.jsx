import { componentCategories } from '@hw/contracts';
import { useComponent } from '../product/queries.js';
import { getErrorMessage } from '../../shared/api/client.js';
import { categoryLabels, keyMetrics } from '../../shared/lib/specs.js';
import CategoryIcon from '../../shared/ui/CategoryIcon.jsx';
import ErrorNotice from '../../shared/ui/ErrorNotice.jsx';
import {
  Field,
  inputClass,
  invalid,
  okBorder,
  badBorder,
  PrimaryButton,
  StepActions,
} from './PublishFields.jsx';
import { useBrands, useModels } from './queries.js';

/** Ficha verificada del componente elegido, con los datos técnicos reales de la base maestra. */
export function ComponentCard({ componentId, compact = false }) {
  const component = useComponent(componentId);
  if (!componentId) return null;
  if (component.isPending) {
    return (
      <div
        role="status"
        aria-label="Cargando el componente"
        className="h-36 animate-pulse rounded-2xl bg-surface-container-low"
      />
    );
  }
  if (component.isError) {
    return <ErrorNotice message={getErrorMessage(component.error)} onRetry={component.refetch} />;
  }
  const data = component.data;
  const metrics = keyMetrics(data.category, data.specs);
  return (
    <article
      aria-label="Componente elegido"
      className="space-y-space-md rounded-2xl border border-outline-variant bg-surface-container-low p-space-md"
    >
      <div className="flex items-start gap-space-md">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-surface text-primary">
          <CategoryIcon category={data.category} className="h-8 w-8" />
        </span>
        <div className="min-w-0 space-y-1">
          <p className="text-label-sm uppercase tracking-wider text-compatible">Base verificada</p>
          <h3 className="text-headline-sm text-on-surface">{data.displayName}</h3>
          <p className="text-body-sm text-on-surface-variant">
            {data.brand} · {categoryLabels[data.category]}
          </p>
        </div>
      </div>
      {metrics.length > 0 && (
        <dl className={`grid grid-cols-2 gap-space-sm ${compact ? '' : 'sm:grid-cols-4'}`}>
          {metrics.map((row) => (
            <div key={row.key} className="rounded-xl bg-surface p-space-sm">
              <dt className="text-label-sm text-outline">{row.label}</dt>
              <dd className="text-label-md text-on-surface">{row.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </article>
  );
}

/** Paso 1: categoría → marca → modelo, tomados de la base maestra (el vendedor no escribe specs). */
export default function StepComponent({ draft, errors, onChange, onNext, readOnly = false }) {
  const brands = useBrands(draft.category);
  const models = useModels(draft.category, draft.brandId);
  const style = (error) => `${inputClass} ${error ? badBorder : okBorder}`;

  // Al editar, el producto no se puede cambiar (la API no lo permite): solo se muestra su ficha
  if (readOnly) {
    return (
      <section aria-labelledby="paso-componente" className="space-y-space-lg">
        <header className="space-y-1">
          <p className="text-label-sm uppercase tracking-wider text-primary">Paso 01 de 04</p>
          <h2 id="paso-componente" className="text-headline-md text-on-surface">
            Componente de la oferta
          </h2>
          <p className="text-body-sm text-on-surface-variant">
            El producto no se puede cambiar. Para ofrecer otro, publica una oferta nueva.
          </p>
        </header>
        <ComponentCard componentId={draft.componentId} />
        <StepActions>
          <PrimaryButton onClick={onNext}>Continuar a condiciones</PrimaryButton>
        </StepActions>
      </section>
    );
  }

  return (
    <section aria-labelledby="paso-componente" className="space-y-space-lg">
      <header className="space-y-1">
        <p className="text-label-sm uppercase tracking-wider text-primary">Paso 01 de 04</p>
        <h2 id="paso-componente" className="text-headline-md text-on-surface">
          Selección del componente canónico
        </h2>
        <p className="text-body-sm text-on-surface-variant">
          Los componentes vinculados heredan sus datos técnicos y las reglas de compatibilidad de la
          base maestra.
        </p>
      </header>

      <div className="grid gap-space-md md:grid-cols-3">
        <Field id="pub-categoria" label="Categoría" error={errors.category} badge="Obligatorio">
          <select
            id="pub-categoria"
            value={draft.category}
            onChange={(event) =>
              onChange({ category: event.target.value, brandId: '', componentId: '' })
            }
            className={style(errors.category)}
            {...invalid('pub-categoria', errors.category)}
          >
            <option value="">Elige una categoría</option>
            {componentCategories.map((category) => (
              <option key={category} value={category}>
                {categoryLabels[category]}
              </option>
            ))}
          </select>
        </Field>

        <Field id="pub-marca" label="Marca" error={errors.brand}>
          <select
            id="pub-marca"
            value={draft.brandId}
            disabled={!draft.category || brands.isPending}
            onChange={(event) => onChange({ brandId: event.target.value, componentId: '' })}
            className={style(errors.brand)}
            {...invalid('pub-marca', errors.brand)}
          >
            <option value="">
              {brands.isPending && draft.category ? 'Cargando…' : 'Elige una marca'}
            </option>
            {(brands.data ?? []).map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </Field>

        <Field id="pub-modelo" label="Modelo" error={errors.model}>
          <select
            id="pub-modelo"
            value={draft.componentId}
            disabled={!draft.brandId || models.isPending}
            onChange={(event) => onChange({ componentId: event.target.value })}
            className={style(errors.model)}
            {...invalid('pub-modelo', errors.model)}
          >
            <option value="">
              {models.isPending && draft.brandId ? 'Cargando…' : 'Elige un modelo'}
            </option>
            {(models.data ?? []).map((model) => (
              <option key={model.componentId} value={model.componentId}>
                {model.displayName}
              </option>
            ))}
          </select>
        </Field>
      </div>

      {(brands.isError || models.isError) && (
        <ErrorNotice
          message={getErrorMessage(brands.error ?? models.error)}
          onRetry={() => (brands.isError ? brands.refetch() : models.refetch())}
        />
      )}

      <ComponentCard componentId={draft.componentId} />

      <StepActions>
        <PrimaryButton onClick={onNext}>Confirmar componente y continuar</PrimaryButton>
      </StepActions>
    </section>
  );
}
