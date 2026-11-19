import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { getErrorMessage } from '../../shared/api/client.js';
import { PLATFORM_NAME } from '../../shared/config.js';
import { downloadTextFile } from '../../shared/lib/download.js';
import { notify } from '../../shared/notices.js';
import { useSession } from '../../shared/session/useSession.js';
import ErrorNotice from '../../shared/ui/ErrorNotice.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import ActivityChart, { DETAILED_METRICS } from './ActivityChart.jsx';
import { card, Delta, Kpi, number, percent } from './kpi.jsx';
import {
  bestAndWorstDay,
  csvFilename,
  dailyCsv,
  rateChange,
  summarizeDays,
  weekdayPattern,
} from './metrics.js';
import { useAnalytics } from './queries.js';
import RangeSelector from './RangeSelector.jsx';
import {
  DEFAULT_RANGE,
  fillDays,
  longDay,
  previousRange,
  RANGES,
  rangeFor,
  shortDay,
  todayInColombia,
} from './ranges.js';

/** "viernes, 22 de mayo" → "Viernes, 22 de mayo" (solo la primera letra, no cada palabra). */
const upperFirst = (text) => text.charAt(0).toUpperCase() + text.slice(1);

/** Cambio de la tasa de clic en puntos porcentuales contra el periodo anterior. */
function PointsDelta({ change }) {
  if (change === null) {
    return <p className="text-body-sm text-outline">Sin datos del periodo anterior</p>;
  }
  if (change === 0) {
    return <p className="text-body-sm text-on-surface-variant">Igual que el periodo anterior</p>;
  }
  const up = change > 0;
  return (
    <p className="tnum flex flex-wrap items-center gap-x-2 text-body-sm">
      <span
        className={`flex items-center gap-1 whitespace-nowrap ${up ? 'text-compatible' : 'text-incompatible'}`}
      >
        <Icon name={up ? 'trending_up' : 'trending_down'} className="text-[16px]" />
        {up ? '+' : '−'}
        {percent.format(Math.abs(change))} puntos
      </span>
      <span className="text-on-surface-variant">vs. periodo anterior</span>
    </p>
  );
}

function Skeleton({ label, className }) {
  return (
    <div
      role="status"
      aria-label={label}
      className={`rounded-2xl bg-surface-container-low motion-safe:animate-pulse ${className}`}
    />
  );
}

/** Barra horizontal de proporción (decorativa: el dato va en el texto de al lado). */
function Bar({ percentOfMax, tone = 'bg-primary-container' }) {
  return (
    <div aria-hidden="true" className="h-3 overflow-hidden rounded-full bg-surface">
      <div
        className={`h-full rounded-full ${tone}`}
        style={{ width: `${Math.max(0, Math.min(100, percentOfMax))}%` }}
      />
    </div>
  );
}

/** Métricas y clics (/vendedor/metricas): conversión, mejores días y datos diarios del vendedor. */
export default function MetricsPage() {
  const { user } = useSession();
  const [params, setParams] = useSearchParams();
  const kind = RANGES.some(([value]) => value === params.get('rango'))
    ? params.get('rango')
    : DEFAULT_RANGE;
  const [metric, setMetric] = useState('whatsappClicks');

  const today = todayInColombia();
  const range = useMemo(() => rangeFor(kind, today), [kind, today]);
  const previous = useMemo(() => previousRange(range), [range]);
  const current = useAnalytics(user?.id, range);
  const before = useAnalytics(user?.id, previous);

  useEffect(() => {
    document.title = `Métricas y clics · ${PLATFORM_NAME}`;
  }, []);

  const days = useMemo(
    () => (current.data ? fillDays(range, current.data.daily) : []),
    [current.data, range],
  );
  const previousDays = useMemo(
    () => (before.data ? fillDays(previous, before.data.daily) : null),
    [before.data, previous],
  );
  const summary = useMemo(() => summarizeDays(days), [days]);
  const previousSummary = useMemo(
    () => (previousDays ? summarizeDays(previousDays) : null),
    [previousDays],
  );
  const { best, worst } = useMemo(() => bestAndWorstDay(days), [days]);
  const weekdays = useMemo(() => weekdayPattern(days), [days]);
  const topAverage = Math.max(...weekdays.map((row) => row.average ?? 0));

  const ready = Boolean(current.data);
  const refreshing = current.isPlaceholderData;
  const empty = ready && summary.views === 0 && summary.clicks === 0;
  const topWeekday = topAverage > 0 ? weekdays.find((row) => row.average === topAverage) : null;

  const exportCsv = () => {
    const saved = downloadTextFile(csvFilename(range), dailyCsv(days));
    notify(
      saved
        ? { message: 'Descargamos el archivo CSV.' }
        : { tone: 'error', message: 'Tu navegador no pudo crear el archivo.' },
    );
  };

  return (
    <div className="mx-auto w-full max-w-[85rem] space-y-space-lg p-space-md lg:p-space-lg">
      <div className="flex flex-col justify-between gap-space-md lg:flex-row lg:items-start">
        <div className="space-y-space-xs">
          <p className="text-label-sm uppercase tracking-wider text-primary">Analítica</p>
          <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
            Métricas y clics
          </h1>
          <p className="max-w-xl text-body-md text-on-surface-variant">
            Cuántas personas ven tus ofertas y cuántas te escriben por WhatsApp, día por día.
          </p>
        </div>
        <RangeSelector
          kind={kind}
          onChange={(value) => setParams(value === DEFAULT_RANGE ? {} : { rango: value })}
          className="self-start lg:self-end"
        />
      </div>

      {current.isError && !current.data && (
        <ErrorNotice message={getErrorMessage(current.error)} onRetry={() => current.refetch()} />
      )}

      {empty && (
        <p
          role="note"
          className="flex items-start gap-space-sm rounded-2xl bg-surface-container p-space-md text-body-sm text-on-surface-variant"
        >
          <Icon name="info" className="mt-0.5 text-[20px] text-outline" />
          <span>
            Aún no hay visitas ni clics en este rango. Cuando tus ofertas reciban visitas, las verás
            aquí.{' '}
            <Link to="/vendedor/inventario" className="text-primary underline">
              Ver mi inventario
            </Link>
          </span>
        </p>
      )}

      <section
        aria-label="Indicadores"
        aria-busy={refreshing}
        className={`grid gap-space-md sm:grid-cols-2 xl:grid-cols-4 ${refreshing ? 'opacity-70' : ''}`}
      >
        <Kpi
          label="Visitas a ofertas"
          icon="visibility"
          value={ready && number.format(summary.views)}
          loading={!ready && current.isPending}
        >
          {ready && previousSummary && (
            <Delta current={summary.views} previous={previousSummary.views} />
          )}
        </Kpi>
        <Kpi
          label="Clics a WhatsApp"
          icon="chat"
          value={ready && number.format(summary.clicks)}
          loading={!ready && current.isPending}
        >
          {ready && previousSummary && (
            <Delta current={summary.clicks} previous={previousSummary.clicks} />
          )}
        </Kpi>
        <Kpi
          label="Tasa de clic"
          icon="ads_click"
          value={ready && (summary.rate === null ? '—' : `${percent.format(summary.rate)} %`)}
          loading={!ready && current.isPending}
        >
          {ready && previousSummary && (
            <PointsDelta change={rateChange(summary.rate, previousSummary.rate)} />
          )}
        </Kpi>
        <Kpi
          label="Promedio diario de clics"
          icon="calendar_today"
          value={
            ready && (summary.averageClicks === null ? '—' : percent.format(summary.averageClicks))
          }
          loading={!ready && current.isPending}
        >
          {ready && (
            <p className="tnum text-body-sm text-on-surface-variant">
              En {summary.days} {summary.days === 1 ? 'día' : 'días'}
            </p>
          )}
        </Kpi>
      </section>

      {!ready && !current.isError && <Skeleton label="Cargando las métricas" className="h-96" />}

      {ready && (
        <>
          <section aria-labelledby="embudo-titulo" className={`${card} space-y-space-md`}>
            <div>
              <h2 id="embudo-titulo" className="text-headline-sm text-on-surface">
                De la visita al clic
              </h2>
              <p className="text-body-sm text-on-surface-variant">
                Cuántas de las visitas a tus ofertas terminan en un mensaje a tu WhatsApp.
              </p>
            </div>
            <div className="space-y-space-sm">
              <div className="space-y-1">
                <p className="flex justify-between text-label-md text-on-surface">
                  <span>Visitas a tus ofertas</span>
                  <span className="tnum">{number.format(summary.views)}</span>
                </p>
                <Bar percentOfMax={summary.views > 0 ? 100 : 0} tone="bg-outline-variant" />
              </div>
              <div className="space-y-1">
                <p className="flex justify-between text-label-md text-on-surface">
                  <span>Clics a WhatsApp</span>
                  <span className="tnum">{number.format(summary.clicks)}</span>
                </p>
                <Bar percentOfMax={summary.rate ?? 0} />
              </div>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              {summary.rate === null
                ? 'Todavía no hay visitas para calcular la tasa de clic.'
                : `De cada 100 visitas, ${percent.format(summary.rate)} terminan en un clic a tu WhatsApp.`}
            </p>
          </section>

          <section aria-labelledby="grafico-titulo" className={`${card} space-y-space-md`}>
            <div className="flex flex-col justify-between gap-space-sm md:flex-row md:items-start">
              <div>
                <h2 id="grafico-titulo" className="text-headline-sm text-on-surface">
                  {DETAILED_METRICS[metric].heading}
                </h2>
                <p className="text-body-sm text-on-surface-variant">
                  Por día, del {range.from} al {range.to}.
                </p>
              </div>
              <div
                role="group"
                aria-label="Qué mostrar en el gráfico"
                className="inline-flex flex-wrap self-start rounded-xl bg-surface p-1"
              >
                {Object.entries(DETAILED_METRICS).map(([value, { label }]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={metric === value}
                    onClick={() => setMetric(value)}
                    className="min-h-11 rounded-lg px-3 text-label-md text-on-surface-variant transition-colors hover:text-on-surface aria-pressed:bg-primary-container aria-pressed:text-on-primary-container"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <ActivityChart days={days} metric={metric} />
          </section>

          <div className="grid items-start gap-space-md lg:grid-cols-2">
            <section aria-labelledby="dias-titulo" className={`${card} space-y-space-md`}>
              <h2 id="dias-titulo" className="text-headline-sm text-on-surface">
                Mejor y peor día
              </h2>
              {best && worst ? (
                <dl className="space-y-space-sm">
                  <div className="flex items-start gap-space-sm rounded-xl bg-surface p-space-sm">
                    <Icon name="trending_up" className="mt-0.5 text-[22px] text-compatible" />
                    <div>
                      <dt className="text-label-sm uppercase tracking-wider text-outline">
                        Mejor día
                      </dt>
                      <dd className="text-label-md text-on-surface">
                        {upperFirst(longDay(best.day))}
                      </dd>
                      <dd className="tnum text-body-sm text-on-surface-variant">
                        {number.format(best.whatsappClicks)}{' '}
                        {best.whatsappClicks === 1 ? 'clic' : 'clics'} · {number.format(best.views)}{' '}
                        visitas
                      </dd>
                    </div>
                  </div>
                  <div className="flex items-start gap-space-sm rounded-xl bg-surface p-space-sm">
                    <Icon name="trending_down" className="mt-0.5 text-[22px] text-incompatible" />
                    <div>
                      <dt className="text-label-sm uppercase tracking-wider text-outline">
                        Día más flojo
                      </dt>
                      <dd className="text-label-md text-on-surface">
                        {upperFirst(longDay(worst.day))}
                      </dd>
                      <dd className="tnum text-body-sm text-on-surface-variant">
                        {number.format(worst.whatsappClicks)}{' '}
                        {worst.whatsappClicks === 1 ? 'clic' : 'clics'} ·{' '}
                        {number.format(worst.views)} visitas
                      </dd>
                    </div>
                  </div>
                </dl>
              ) : (
                <p className="rounded-xl bg-surface p-space-md text-body-sm text-on-surface-variant">
                  Aún no hay clics para comparar los días del rango.
                </p>
              )}
            </section>

            <section aria-labelledby="semana-titulo" className={`${card} space-y-space-md`}>
              <div>
                <h2 id="semana-titulo" className="text-headline-sm text-on-surface">
                  Clics por día de la semana
                </h2>
                <p className="text-body-sm text-on-surface-variant">
                  Promedio de clics en cada día de la semana dentro del rango.
                  {topWeekday && ` Tu día más fuerte: ${topWeekday.name}.`}
                </p>
              </div>
              <ul aria-label="Promedio de clics por día de la semana" className="space-y-space-xs">
                {weekdays.map((row) => (
                  <li
                    key={row.short}
                    className="grid grid-cols-[2.5rem_1fr_3.5rem] items-center gap-space-sm"
                  >
                    <span className="text-label-md text-on-surface-variant">
                      <abbr title={row.name} className="no-underline">
                        {row.short}
                      </abbr>
                    </span>
                    <Bar
                      percentOfMax={
                        row.average && topAverage > 0 ? (row.average / topAverage) * 100 : 0
                      }
                      tone={row === topWeekday ? 'bg-primary' : 'bg-primary-container'}
                    />
                    <span className="tnum text-right text-body-sm text-on-surface">
                      {row.average === null ? '—' : percent.format(row.average)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section aria-labelledby="tabla-titulo" className={`${card} space-y-space-md`}>
            <div className="flex flex-col justify-between gap-space-sm sm:flex-row sm:items-start">
              <div>
                <h2 id="tabla-titulo" className="text-headline-sm text-on-surface">
                  Datos por día
                </h2>
                <p className="text-body-sm text-on-surface-variant">
                  Los mismos números de la gráfica, en tabla.
                </p>
              </div>
              <button
                type="button"
                onClick={exportCsv}
                disabled={days.length === 0}
                className="flex min-h-11 items-center gap-2 rounded-xl border border-outline-variant px-4 text-label-md text-on-surface transition-colors hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon name="download" className="text-[18px]" />
                Descargar CSV
              </button>
            </div>
            <div className="max-h-96 overflow-auto rounded-xl bg-surface">
              <table className="w-full min-w-[18rem] text-left text-body-sm">
                <caption className="sr-only">Visitas, clics y tasa de clic por día</caption>
                <thead className="sticky top-0 bg-surface text-label-sm uppercase tracking-wider text-outline">
                  <tr>
                    <th
                      scope="col"
                      className="px-space-sm py-space-sm sm:px-space-md font-semibold"
                    >
                      Día
                    </th>
                    <th
                      scope="col"
                      className="px-space-sm py-space-sm sm:px-space-md text-right font-semibold"
                    >
                      Visitas
                    </th>
                    <th
                      scope="col"
                      className="px-space-sm py-space-sm sm:px-space-md text-right font-semibold"
                    >
                      Clics
                    </th>
                    <th
                      scope="col"
                      className="px-space-sm py-space-sm sm:px-space-md text-right font-semibold"
                    >
                      <span className="sm:hidden">Tasa</span>
                      <span className="hidden sm:inline">Tasa de clic</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40">
                  {days.map((item) => {
                    const rate = summarizeDays([item]).rate;
                    return (
                      <tr key={item.day}>
                        <th
                          scope="row"
                          className="px-space-sm py-space-sm sm:px-space-md font-normal text-on-surface"
                        >
                          <span className="sm:hidden">{upperFirst(shortDay(item.day))}</span>
                          <span className="hidden sm:inline">{upperFirst(longDay(item.day))}</span>
                        </th>
                        <td className="tnum px-space-sm py-space-sm sm:px-space-md text-right text-on-surface">
                          {number.format(item.views)}
                        </td>
                        <td className="tnum px-space-sm py-space-sm sm:px-space-md text-right text-on-surface">
                          {number.format(item.whatsappClicks)}
                        </td>
                        <td className="tnum px-space-sm py-space-sm sm:px-space-md text-right text-on-surface-variant">
                          {rate === null ? '—' : `${percent.format(rate)} %`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="border-t border-outline-variant text-label-md text-on-surface">
                  <tr>
                    <th scope="row" className="px-space-sm py-space-sm sm:px-space-md text-left">
                      Total
                    </th>
                    <td className="tnum px-space-sm py-space-sm sm:px-space-md text-right">
                      {number.format(summary.views)}
                    </td>
                    <td className="tnum px-space-sm py-space-sm sm:px-space-md text-right">
                      {number.format(summary.clicks)}
                    </td>
                    <td className="tnum px-space-sm py-space-sm sm:px-space-md text-right">
                      {summary.rate === null ? '—' : `${percent.format(summary.rate)} %`}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        </>
      )}

      <div className="grid items-start gap-space-md lg:grid-cols-2">
        <section aria-labelledby="top-titulo" className={`${card} space-y-space-md`}>
          <div className="flex items-start justify-between gap-space-sm">
            <div>
              <h2 id="top-titulo" className="text-headline-sm text-on-surface">
                Productos con más clics
              </h2>
              <p className="text-body-sm text-on-surface-variant">
                Las piezas de tu catálogo con más intención de compra.
              </p>
            </div>
            <span className="rounded-full bg-surface px-3 py-1 text-label-sm text-on-surface-variant">
              Próximamente
            </span>
          </div>
          <p className="rounded-xl bg-surface p-space-md text-body-sm text-on-surface-variant">
            Todavía no medimos los clics por producto. Por ahora puedes ver los totales y la
            evolución diaria.
          </p>
        </section>

        <section aria-labelledby="medimos-titulo" className={`${card} space-y-space-sm`}>
          <h2 id="medimos-titulo" className="text-headline-sm text-on-surface">
            Cómo medimos
          </h2>
          <p className="text-body-sm text-on-surface-variant">
            Contamos una visita por sesión cada 30 minutos y un clic a WhatsApp por sesión cada 10
            minutos, para que las recargas no inflen las cifras. Los días se cuentan en hora de
            Colombia.
          </p>
        </section>
      </div>
    </div>
  );
}
