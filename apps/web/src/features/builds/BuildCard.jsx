import { formatCOP, formatDate } from '../../shared/lib/format.js';
import CategoryIcon from '../../shared/ui/CategoryIcon.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import { lowerFirst, ruleNames } from '../builder/analysis.js';
import { SLOTS } from '../builder/slots.js';
import { buildStatus, STATUS_VIEW } from './status.js';

const MAX_CHIPS = 4;

const tint = {
  fail: 'bg-[color-mix(in_srgb,var(--color-incompatible)_8%,var(--color-surface-container))]',
  unknown: 'bg-[color-mix(in_srgb,var(--color-unverifiable)_8%,var(--color-surface-container))]',
};

function Metric({ label, value, hint }) {
  return (
    <div className="rounded-xl bg-surface p-space-sm">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">{label}</p>
      <p className="tnum text-label-md text-on-surface">{value}</p>
      {hint && <p className="tnum text-body-sm text-on-surface-variant">{hint}</p>}
    </div>
  );
}

/** Esqueleto de la parte que depende del detalle del armado. */
function DetailSkeleton() {
  return (
    <div
      role="status"
      aria-label="Cargando detalle del armado"
      className="space-y-space-sm motion-safe:animate-pulse"
    >
      <div className="grid gap-space-xs sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-20 rounded-xl bg-surface" />
        ))}
      </div>
      <div className="h-7 w-2/3 rounded-full bg-surface" />
    </div>
  );
}

/**
 * Tarjeta de un armado guardado. El resumen (nombre, precio, vatios) viene de la lista; el estado
 * de compatibilidad, los avisos y las piezas, del detalle.
 * @param {{ summary: any, detail: import('@tanstack/react-query').UseQueryResult<any>, opening: boolean, onShare: () => void, onDelete: () => void, onOpen: () => void }} props
 */
export default function BuildCard({ summary, detail, opening, onShare, onDelete, onOpen }) {
  const loaded = detail.data;
  const status = loaded ? buildStatus(loaded.evaluation) : null;
  const view = status ? STATUS_VIEW[status] : null;
  const evaluation = loaded?.evaluation;
  const items = loaded?.build.items ?? [];
  const notes = (evaluation?.results ?? []).filter(
    (result) => result.status === 'fail' || result.status === 'unknown',
  );
  const totalRules = evaluation
    ? evaluation.summary.ok + evaluation.summary.unknown + evaluation.summary.incompatible
    : 0;
  const titleId = `armado-${summary.id}`;

  return (
    <article
      aria-labelledby={titleId}
      className="space-y-space-md rounded-2xl bg-surface-container p-space-md md:p-space-lg"
    >
      <div className="flex flex-col justify-between gap-space-sm md:flex-row md:items-start">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-space-xs">
            {view && (
              <span
                className={`inline-flex items-center gap-1 rounded bg-surface px-2 py-0.5 text-[11px] font-bold ${view.tone}`}
              >
                <Icon name={view.icon} className="text-[14px]" />
                {view.label}
              </span>
            )}
            <span className="rounded bg-surface px-2 py-0.5 text-code-metric text-on-surface-variant">
              Código {summary.shareCode}
            </span>
          </div>
          <h2 id={titleId} className="break-words text-headline-sm text-on-surface">
            {summary.name}
          </h2>
          <p className="flex items-center gap-1.5 text-body-sm text-on-surface-variant">
            <Icon name="schedule" className="text-[16px]" />
            Modificado el {formatDate(summary.updatedAt) ?? '—'}
          </p>
        </div>
        <div className="shrink-0 rounded-xl bg-surface px-space-md py-space-sm md:text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">
            Presupuesto estimado
          </p>
          <p className="tnum text-headline-sm font-bold text-on-surface">
            {formatCOP(summary.totalPriceCop)}
          </p>
        </div>
      </div>

      {detail.isPending && <DetailSkeleton />}

      {detail.isError && (
        <p className="flex flex-wrap items-center gap-space-sm rounded-xl bg-surface p-space-sm text-body-sm text-on-surface-variant">
          <Icon name="error" className="text-[18px] text-incompatible" />
          No pudimos cargar el detalle de este armado.
          <button
            type="button"
            onClick={() => detail.refetch()}
            className="min-h-11 rounded-lg px-3 text-label-md text-primary hover:bg-surface-container-high"
          >
            Reintentar
          </button>
        </p>
      )}

      {loaded && (
        <>
          <div className="grid gap-space-xs sm:grid-cols-3">
            <Metric
              label="Consumo estimado"
              value={`${evaluation.estimatedWatts} W`}
              hint={`Fuente recomendada: ${evaluation.recommendedPsuW} W`}
            />
            <Metric
              label="Reglas de compatibilidad"
              value={`${evaluation.summary.ok} de ${totalRules} verificadas`}
              hint={`${evaluation.summary.incompatible} ${evaluation.summary.incompatible === 1 ? 'conflicto' : 'conflictos'} • ${evaluation.summary.unknown} por confirmar`}
            />
            <Metric
              label="Piezas"
              value={`${items.length} de ${SLOTS.length}`}
              hint={`${items.filter((item) => item.offerId).length} con oferta guardada`}
            />
          </div>

          {notes.length > 0 && (
            <ul className={`space-y-1 rounded-xl p-space-sm ${tint[status]}`}>
              {notes.map((result) => (
                <li
                  key={result.code}
                  className="flex items-start gap-space-xs text-body-sm text-on-surface"
                >
                  <Icon
                    name={result.status === 'fail' ? 'error' : 'warning'}
                    className={`mt-0.5 text-[16px] ${result.status === 'fail' ? 'text-incompatible' : 'text-unverifiable'}`}
                  />
                  <span>
                    <strong className="font-semibold">
                      {ruleNames[result.code] ?? result.code}:
                    </strong>{' '}
                    {result.status === 'fail'
                      ? result.message
                      : `No verificable: ${lowerFirst(result.message ?? 'falta un dato')}; confírmalo con la tienda.`}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <ul aria-label="Piezas del armado" className="flex flex-wrap gap-space-xs">
            {items.slice(0, MAX_CHIPS).map((item) => (
              <li
                key={item.category}
                className="flex max-w-full items-center gap-1.5 rounded-lg bg-surface px-2.5 py-1.5 text-body-sm text-on-surface-variant"
              >
                <CategoryIcon category={item.category} className="h-4 w-4 shrink-0 text-outline" />
                <span className="truncate" title={item.displayName}>
                  {item.displayName}
                </span>
              </li>
            ))}
            {items.length > MAX_CHIPS && (
              <li className="flex items-center rounded-lg px-2.5 py-1.5 text-body-sm text-outline">
                + {items.length - MAX_CHIPS} componentes más
              </li>
            )}
          </ul>
        </>
      )}

      <div className="flex flex-wrap items-center justify-end gap-space-xs border-t border-outline-variant/40 pt-space-sm">
        <button
          type="button"
          onClick={onShare}
          aria-label={`Compartir ${summary.name}`}
          className="flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-label-md text-on-surface-variant transition-colors hover:bg-surface hover:text-on-surface"
        >
          <Icon name="share" className="text-[18px]" />
          Compartir
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Eliminar ${summary.name}`}
          className="flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-label-md text-incompatible transition-colors hover:bg-incompatible/10"
        >
          <Icon name="delete" className="text-[18px]" />
          Eliminar
        </button>
        <button
          type="button"
          onClick={onOpen}
          disabled={!loaded || opening}
          aria-label={`${status === 'fail' ? 'Corregir' : 'Abrir'} ${summary.name} en el asistente`}
          className="flex h-11 items-center gap-1.5 rounded-xl bg-primary-container px-4 text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon name={status === 'fail' ? 'build' : 'edit'} className="text-[18px]" />
          {opening
            ? 'Abriendo…'
            : status === 'fail'
              ? 'Corregir en el asistente'
              : 'Abrir en el asistente'}
        </button>
      </div>
    </article>
  );
}

/** Marcador de carga de la lista, con las proporciones de una tarjeta. */
export function BuildCardSkeleton() {
  return (
    <div
      aria-hidden="true"
      className="space-y-space-md rounded-2xl bg-surface-container p-space-lg motion-safe:animate-pulse"
    >
      <div className="h-5 w-40 rounded-full bg-surface-variant" />
      <div className="h-7 w-2/3 rounded bg-surface-variant" />
      <div className="grid gap-space-xs sm:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <div key={index} className="h-20 rounded-xl bg-surface" />
        ))}
      </div>
    </div>
  );
}
