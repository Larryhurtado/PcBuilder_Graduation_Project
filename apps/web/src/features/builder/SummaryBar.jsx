import Icon from '../../shared/ui/Icon.jsx';

const plural = (count, one, many) => `${count} ${count === 1 ? one : many}`;

const barColor = {
  ok: 'bg-primary-container',
  warn: 'bg-unverifiable',
  danger: 'bg-incompatible',
};

const percentText = (percent) => `${percent.toFixed(1).replace('.', ',')} %`;

function Chip({ icon, className, children }) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-code-metric font-semibold ${className}`}
    >
      <Icon name={icon} className="text-[16px]" />
      <span>{children}</span>
    </div>
  );
}

/**
 * Barra de resumen técnico: reglas verificadas por estado, consumo estimado, carga de la fuente y
 * fuente recomendada. Los contadores cuentan reglas (RC-01 a RC-08), no piezas.
 * @param {{ analysis: ReturnType<typeof import('./analysis.js').analyzeBuild> }} props
 */
export default function SummaryBar({ analysis }) {
  const { summary, estimatedWatts, recommendedPsuW, load, results } = analysis;
  const hasWatts = estimatedWatts > 0;

  return (
    <section
      aria-label="Resumen técnico del armado"
      className="mb-space-xl w-full rounded-2xl bg-surface-container p-space-md"
    >
      <div className="grid grid-cols-1 items-center gap-space-md md:grid-cols-12">
        <div className="flex flex-wrap items-center gap-space-xs md:col-span-5">
          {results.length === 0 ? (
            <p className="text-code-metric text-on-surface-variant">
              Aún no hay reglas que verificar. Agrega piezas para validar la compatibilidad.
            </p>
          ) : (
            <>
              <span className="sr-only">Reglas verificadas:</span>
              {summary.ok > 0 && (
                <Chip icon="check_circle" className="bg-compatible/12 text-compatible">
                  {plural(summary.ok, 'Compatible', 'Compatibles')}
                </Chip>
              )}
              {summary.incompatible > 0 && (
                <Chip
                  icon="cancel"
                  className="bg-incompatible/15 text-incompatible motion-safe:animate-pulse"
                >
                  {plural(summary.incompatible, 'Incompatible', 'Incompatibles')}
                </Chip>
              )}
              {summary.unknown > 0 && (
                <Chip icon="help" className="bg-unverifiable/15 text-unverifiable">
                  {plural(summary.unknown, 'No verificable', 'No verificables')}
                </Chip>
              )}
            </>
          )}
        </div>

        <div className="flex flex-col items-start justify-between gap-space-md sm:flex-row sm:items-center md:col-span-7 md:pl-space-md">
          <div className="w-full flex-1 space-y-1 sm:w-auto">
            <div className="flex items-center justify-between gap-space-sm text-code-metric">
              <span className="flex items-center gap-1 text-on-surface-variant">
                <Icon name="bolt" className="text-[15px] text-secondary" />
                <span>
                  Consumo estimado:{' '}
                  <strong className="tnum font-semibold text-on-surface">
                    {hasWatts ? `${estimatedWatts} W` : '—'}
                  </strong>
                </span>
              </span>
              {load && (
                <span className="tnum text-on-surface-variant">
                  Carga:{' '}
                  <strong className="font-semibold text-primary">
                    {percentText(load.percent)}
                  </strong>{' '}
                  de {load.watts} W
                </span>
              )}
            </div>
            {load ? (
              <div
                role="meter"
                aria-label="Carga de la fuente"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(load.percent, 100)}
                aria-valuetext={`${percentText(load.percent)} de ${load.watts} W`}
                className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface"
              >
                <div
                  className={`h-full rounded-full ${barColor[load.level]}`}
                  style={{ width: `${Math.min(load.percent, 100)}%` }}
                />
              </div>
            ) : (
              <p className="text-code-metric text-outline">
                {hasWatts
                  ? 'Elige una fuente para ver su carga.'
                  : 'Agrega una CPU y una GPU para estimar el consumo.'}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2 rounded-xl bg-surface px-3 py-1.5">
            <Icon name="speed" className="text-[18px] text-primary" />
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase leading-none tracking-wider text-outline">
                Fuente recomendada
              </span>
              <span className="tnum text-code-metric font-semibold text-on-surface">
                {hasWatts ? `${recommendedPsuW} W` : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
