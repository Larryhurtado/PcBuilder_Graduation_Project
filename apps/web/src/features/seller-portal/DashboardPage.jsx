import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { getErrorMessage } from '../../shared/api/client.js';
import { PLATFORM_NAME } from '../../shared/config.js';
import { useSession } from '../../shared/session/useSession.js';
import ComingSoonButton from '../../shared/ui/ComingSoonButton.jsx';
import ErrorNotice from '../../shared/ui/ErrorNotice.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import ActivityChart, { METRICS } from './ActivityChart.jsx';
import { useAnalytics, useMyStore, useVerificationStatus } from './queries.js';
import {
  DEFAULT_RANGE,
  fillDays,
  percentChange,
  previousRange,
  RANGES,
  rangeFor,
  todayInColombia,
} from './ranges.js';
import { describeVerification, PUBLISH_BLOCKED_MESSAGE, TONES } from './verification.js';

const number = new Intl.NumberFormat('es-CO');
const percent = new Intl.NumberFormat('es-CO', {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});

const card = 'rounded-2xl bg-surface-container p-space-lg';

/** Cambio contra el periodo anterior, con flecha y signo (no solo color). */
function Delta({ current, previous }) {
  const change = percentChange(current, previous);
  if (change === null) {
    return <p className="text-body-sm text-outline">Sin datos del periodo anterior</p>;
  }
  const up = change >= 0;
  return (
    <p className="tnum flex flex-wrap items-center gap-x-2 text-body-sm">
      <span
        className={`flex items-center gap-1 whitespace-nowrap ${up ? 'text-compatible' : 'text-incompatible'}`}
      >
        <Icon name={up ? 'trending_up' : 'trending_down'} className="text-[16px]" />
        {up ? '+' : '−'}
        {percent.format(Math.abs(change))} %
      </span>
      <span className="text-on-surface-variant">vs. periodo anterior</span>
    </p>
  );
}

function Kpi({ label, icon, value, loading, children }) {
  return (
    <div className={`${card} space-y-space-sm`}>
      <div className="flex items-center justify-between gap-space-sm">
        <p className="text-label-md text-on-surface-variant">{label}</p>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-surface text-outline">
          <Icon name={icon} className="text-[20px]" />
        </span>
      </div>
      <p className="tnum text-headline-lg-mobile text-on-surface md:text-headline-lg">
        {loading ? (
          <span className="inline-block h-9 w-24 rounded bg-surface-variant motion-safe:animate-pulse" />
        ) : (
          value
        )}
      </p>
      {children}
    </div>
  );
}

/** Panel del vendedor (/vendedor): visitas y clics a WhatsApp con el cambio contra el periodo anterior. */
export default function DashboardPage() {
  const { user } = useSession();
  const [params, setParams] = useSearchParams();
  const kind = RANGES.some(([value]) => value === params.get('rango'))
    ? params.get('rango')
    : DEFAULT_RANGE;
  const [metric, setMetric] = useState('whatsappClicks');

  const today = todayInColombia();
  const range = useMemo(() => rangeFor(kind, today), [kind, today]);
  const previous = useMemo(() => previousRange(range), [range]);

  const store = useMyStore(user?.id);
  const verification = useVerificationStatus(user?.id);
  const current = useAnalytics(user?.id, range);
  const before = useAnalytics(user?.id, previous);

  useEffect(() => {
    document.title = `Dashboard · ${PLATFORM_NAME}`;
  }, []);

  const view = verification.data ? describeVerification(verification.data) : null;
  const approved = verification.data?.status === 'approved';
  const totals = current.data?.totals;
  const days = useMemo(
    () => (current.data ? fillDays(range, current.data.daily) : []),
    [current.data, range],
  );
  const clickRate =
    totals && totals.views > 0 ? (totals.whatsappClicks / totals.views) * 100 : null;
  const refreshing = current.isPlaceholderData;
  const place = [store.data?.city].filter(Boolean).join(' · ');

  return (
    <div className="mx-auto w-full max-w-[85rem] space-y-space-lg p-space-md lg:p-space-lg">
      <div className="flex flex-col justify-between gap-space-md lg:flex-row lg:items-start">
        <div className="space-y-space-xs">
          <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">Dashboard</h1>
          {store.data && (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-highest px-3 py-1 text-label-sm text-secondary">
              <Icon name="storefront" className="text-[14px]" />
              {store.data.tradeName}
              {approved && ' · Verificado'}
            </p>
          )}
          <p className="max-w-xl text-body-md text-on-surface-variant">
            Visitas a tus ofertas y clics a tu WhatsApp comercial
            {place && ` · ${place}`}.
          </p>
        </div>

        <div className="flex flex-col gap-space-sm lg:items-end">
          <div
            role="group"
            aria-label="Rango de fechas"
            className="inline-flex self-start rounded-xl bg-surface-container p-1 lg:self-end"
          >
            {RANGES.map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={kind === value}
                onClick={() => setParams(value === DEFAULT_RANGE ? {} : { rango: value })}
                className="min-h-11 rounded-lg px-4 text-label-md text-on-surface-variant transition-colors hover:text-on-surface aria-pressed:bg-primary-container aria-pressed:text-on-primary-container"
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-space-xs">
            <Link
              to="/vendedor/inventario"
              className="flex h-12 items-center gap-2 rounded-xl border border-outline-variant px-4 text-label-md text-on-surface transition-colors hover:bg-surface-variant"
            >
              <Icon name="inventory_2" className="text-[18px]" />
              Ver inventario
            </Link>
            {approved ? (
              <Link
                to="/vendedor/publicar"
                className="flex h-12 items-center gap-2 rounded-xl bg-primary-container px-4 text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90"
              >
                <Icon name="add_circle" className="text-[18px]" />
                Publicar producto
              </Link>
            ) : (
              <button
                type="button"
                disabled
                aria-describedby="publicar-bloqueado"
                className="flex h-12 cursor-not-allowed items-center gap-2 rounded-xl bg-primary-container px-4 text-label-md text-on-primary-container opacity-50"
              >
                <Icon name="add_circle" className="text-[18px]" />
                Publicar producto
              </button>
            )}
          </div>
          {verification.data && !approved && (
            <p
              id="publicar-bloqueado"
              className="max-w-sm text-body-sm text-on-surface-variant lg:text-right"
            >
              {PUBLISH_BLOCKED_MESSAGE}.{' '}
              <Link to="/vendedor/verificacion" className="text-primary underline">
                Ver estado de verificación
              </Link>
            </p>
          )}
        </div>
      </div>

      {view && (
        <section
          aria-label="Estado de verificación"
          className="flex flex-col gap-space-sm rounded-2xl bg-surface-container p-space-md md:flex-row md:items-center md:justify-between"
        >
          <div className="flex items-start gap-space-sm">
            <span
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface ${TONES[view.tone].text}`}
            >
              <Icon name={TONES[view.tone].icon} className="text-[24px]" />
            </span>
            <div>
              <p className="text-label-md text-on-surface">{view.title}</p>
              <p className="text-body-sm text-on-surface-variant">{view.message}</p>
              <p className="pt-1 text-body-sm text-outline">
                La verificación confirma que el negocio existe; no garantiza el cumplimiento de sus
                ofertas.
              </p>
            </div>
          </div>
          {store.data?.nit && (
            <span className="tnum shrink-0 rounded-lg bg-surface px-3 py-1.5 text-code-metric text-on-surface-variant">
              NIT {store.data.nit}
            </span>
          )}
        </section>
      )}

      {current.isError && !current.data && (
        <ErrorNotice message={getErrorMessage(current.error)} onRetry={() => current.refetch()} />
      )}

      <section
        aria-label="Indicadores"
        aria-busy={refreshing}
        className={`grid gap-space-md sm:grid-cols-2 xl:grid-cols-4 ${refreshing ? 'opacity-70' : ''}`}
      >
        <Kpi
          label="Visitas a ofertas"
          icon="visibility"
          value={totals && number.format(totals.views)}
          loading={!totals && current.isPending}
        >
          {totals && before.data && (
            <Delta current={totals.views} previous={before.data.totals.views} />
          )}
        </Kpi>
        <Kpi
          label="Clics a WhatsApp"
          icon="chat"
          value={totals && number.format(totals.whatsappClicks)}
          loading={!totals && current.isPending}
        >
          {totals && before.data && (
            <Delta current={totals.whatsappClicks} previous={before.data.totals.whatsappClicks} />
          )}
          {totals && (
            <p className="tnum text-body-sm text-on-surface-variant">
              Tasa de clic: {clickRate === null ? '—' : `${percent.format(clickRate)} %`}
            </p>
          )}
        </Kpi>
        <Kpi
          label="Ofertas activas"
          icon="check_circle"
          value={totals && number.format(totals.activeOffers)}
          loading={!totals && current.isPending}
        >
          <p className="flex items-center gap-1 text-body-sm text-compatible">
            <Icon name="public" className="text-[16px]" />
            En el catálogo público
          </p>
        </Kpi>
        <Kpi
          label="Ofertas pausadas"
          icon="pause_circle"
          value={totals && number.format(totals.pausedOffers)}
          loading={!totals && current.isPending}
        >
          <p className="flex items-center gap-1 text-body-sm text-on-surface-variant">
            <Icon name="visibility_off" className="text-[16px]" />
            Ocultas del catálogo
          </p>
        </Kpi>
      </section>

      <section aria-labelledby="grafico-titulo" className={`${card} space-y-space-md`}>
        <div className="flex flex-col justify-between gap-space-sm md:flex-row md:items-start">
          <div>
            <h2 id="grafico-titulo" className="text-headline-sm text-on-surface">
              {METRICS[metric].heading}
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Por día, del {range.from} al {range.to}.
            </p>
          </div>
          <div
            role="group"
            aria-label="Qué mostrar en el gráfico"
            className="inline-flex self-start rounded-xl bg-surface p-1"
          >
            {Object.entries(METRICS).map(([value, { label }]) => (
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
        {current.data ? (
          <ActivityChart days={days} metric={metric} />
        ) : (
          <div
            role="status"
            aria-label="Cargando el gráfico"
            className="h-72 rounded-xl bg-surface motion-safe:animate-pulse"
          />
        )}
      </section>

      <div className="grid items-start gap-space-md lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
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
            Todavía no medimos los clics por producto: por ahora el panel muestra los totales y la
            evolución diaria. Mientras tanto, gestiona tus ofertas desde el inventario.
          </p>
          <Link
            to="/vendedor/inventario"
            className="inline-flex min-h-11 items-center gap-1 text-label-md font-semibold text-primary hover:underline"
          >
            Ver catálogo completo
            <Icon name="arrow_forward" className="text-[16px]" />
          </Link>
        </section>

        <div className="space-y-space-md">
          <section aria-label="Ofertas pausadas" className={`${card} space-y-space-sm`}>
            {totals && totals.pausedOffers > 0 ? (
              <>
                <div className="flex items-start gap-space-sm">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-unverifiable/15 text-unverifiable">
                    <Icon name="warning" className="text-[22px]" />
                  </span>
                  <div>
                    <h2 className="text-label-md text-on-surface">
                      {totals.pausedOffers}{' '}
                      {totals.pausedOffers === 1 ? 'oferta pausada' : 'ofertas pausadas'}
                    </h2>
                    <p className="text-body-sm text-on-surface-variant">
                      No aparecen en el catálogo ni en las cotizaciones. Reactívalas desde el
                      inventario cuando estén listas.
                    </p>
                  </div>
                </div>
                <Link
                  to="/vendedor/inventario"
                  className="inline-flex min-h-11 items-center gap-1 text-label-md font-semibold text-primary hover:underline"
                >
                  Ir al inventario
                  <Icon name="arrow_forward" className="text-[16px]" />
                </Link>
              </>
            ) : (
              <div className="flex items-start gap-space-sm">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-compatible/12 text-compatible">
                  <Icon name="check_circle" className="text-[22px]" />
                </span>
                <div>
                  <h2 className="text-label-md text-on-surface">Todo tu catálogo está visible</h2>
                  <p className="text-body-sm text-on-surface-variant">
                    No tienes ofertas pausadas.
                  </p>
                </div>
              </div>
            )}
          </section>

          <section aria-labelledby="lote-titulo" className={`${card} space-y-space-sm`}>
            <h2 id="lote-titulo" className="text-label-md text-on-surface">
              Sincronización por lote
            </h2>
            <p className="text-body-sm text-on-surface-variant">
              Importa o exporta tu catálogo completo con precios actualizados.
            </p>
            <ComingSoonButton
              icon="upload_file"
              label="Actualizar inventario masivo (CSV)"
              className="h-14 w-full border border-outline-variant px-4 text-on-surface"
            />
          </section>

          <section aria-labelledby="ayuda-titulo" className={`${card} space-y-space-sm`}>
            <h2 id="ayuda-titulo" className="text-label-md text-on-surface">
              Mesa de ayuda B2B
            </h2>
            <p className="text-body-sm text-on-surface-variant">Atención técnica directa.</p>
            <ComingSoonButton
              icon="support_agent"
              label="WhatsApp de soporte"
              className="h-14 w-full border border-outline-variant px-4 text-on-surface"
            />
          </section>
        </div>
      </div>
    </div>
  );
}
