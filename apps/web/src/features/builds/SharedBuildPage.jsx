import { STATUS } from '@hw/compat-engine';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ApiError, getErrorMessage } from '../../shared/api/client.js';
import { PLATFORM_NAME } from '../../shared/config.js';
import { copyText } from '../../shared/lib/clipboard.js';
import { formatCOP, formatDate } from '../../shared/lib/format.js';
import { specLine } from '../../shared/lib/specs.js';
import { notify } from '../../shared/notices.js';
import { useSession } from '../../shared/session/useSession.js';
import ComingSoonButton from '../../shared/ui/ComingSoonButton.jsx';
import ConfirmDialog from '../../shared/ui/ConfirmDialog.jsx';
import Container from '../../shared/ui/Container.jsx';
import ErrorNotice from '../../shared/ui/ErrorNotice.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import Toast from '../../shared/ui/Toast.jsx';
import WhatsAppLink from '../../shared/ui/WhatsAppLink.jsx';
import { analyzeBuild } from '../builder/analysis.js';
import { useBuildStore } from '../builder/store.js';
import { useCloneBuild, useSharedBuild, useSharedParts } from './queries.js';
import { restoreNotice } from './restore.js';
import { buildShareUrl } from './share.js';
import { gpuClearance, isShareCode, sharedRows } from './sharedBuild.js';

const watts = new Intl.NumberFormat('es-CO');

const SLOT_STATUS = {
  [STATUS.OK]: { label: 'Compatible', icon: 'check_circle', tone: 'text-compatible' },
  [STATUS.UNKNOWN]: { label: 'No verificable', icon: 'help', tone: 'text-unverifiable' },
  [STATUS.FAIL]: { label: 'Incompatible', icon: 'error', tone: 'text-incompatible' },
};

function Stat({ icon, label, value, hint, tone = 'text-primary' }) {
  return (
    <div className="flex items-center gap-space-sm rounded-2xl bg-surface p-space-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container">
        <Icon name={icon} className={`text-[22px] ${tone}`} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">{label}</p>
        <p className="tnum text-label-md text-on-surface">{value}</p>
        {hint && <p className="tnum text-body-sm text-on-surface-variant">{hint}</p>}
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <Container className="py-space-2xl">
      <div className="mx-auto flex max-w-xl flex-col items-center gap-space-sm rounded-2xl bg-surface-container p-space-xl text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-incompatible">
          <Icon name="link_off" className="text-[28px]" />
        </span>
        <h1 className="text-headline-md text-on-surface">Armado no encontrado</h1>
        <p className="text-body-md text-on-surface-variant">
          Este armado no existe o fue despublicado por su autor.
        </p>
        <Link
          to="/armador"
          className="mt-space-xs inline-flex min-h-12 items-center rounded-xl bg-primary-container px-6 text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90"
        >
          Ir al asistente y crear un nuevo armado
        </Link>
      </div>
    </Container>
  );
}

function PieceRow({ row, analysis }) {
  const { slot, item, offer, replaced } = row;
  const status = offer ? SLOT_STATUS[analysis?.bySlot[slot.category]?.status] : null;
  const specs = offer ? specLine(slot.category, offer.component.specs) : '';
  return (
    <li className="space-y-space-sm rounded-2xl bg-surface-container p-space-md">
      <div className="flex items-center justify-between gap-space-sm">
        <p className="text-label-sm uppercase tracking-wider text-outline">
          <span className="tnum mr-2 rounded bg-surface px-1.5 py-0.5">{slot.number}</span>
          {slot.title}
        </p>
        {status ? (
          <span className={`flex items-center gap-1 text-label-sm ${status.tone}`}>
            <Icon name={status.icon} className="text-[16px]" />
            {status.label}
          </span>
        ) : (
          <span className="flex items-center gap-1 text-label-sm text-outline">
            <Icon name="block" className="text-[16px]" />
            Sin oferta vigente
          </span>
        )}
      </div>

      <div className="flex flex-col gap-space-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <h3 className="text-headline-sm text-on-surface">{item.displayName}</h3>
          {specs && <p className="text-body-sm text-on-surface-variant">{specs}</p>}
          {offer ? (
            <p className="flex items-center gap-1 text-body-sm text-outline">
              <Icon name="storefront" className="text-[16px]" />
              {offer.store.name}
              {offer.store.city ? ` · ${offer.store.city}` : ''}
            </p>
          ) : (
            <p className="text-body-sm text-outline">
              Esta pieza no tiene hoy ofertas en tiendas verificadas.
            </p>
          )}
          {replaced && (
            <p className="flex items-center gap-1 text-body-sm text-unverifiable">
              <Icon name="info" className="text-[16px]" />
              La oferta guardada ya no está: mostramos la más barata de hoy.
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col gap-space-xs sm:w-60 sm:items-end">
          {offer ? (
            <>
              <p className="tnum text-price-display text-on-surface">{formatCOP(offer.priceCop)}</p>
              <WhatsAppLink offer={offer} />
            </>
          ) : item.unitPriceCop !== null ? (
            <p className="tnum text-body-sm text-on-surface-variant">
              Precio guardado: {formatCOP(item.unitPriceCop)}
            </p>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/** Armado compartido (/armado/:codigo): vista pública de solo lectura de un armado guardado. */
export default function SharedBuildPage() {
  const { codigo } = useParams();
  const { user, isLoading } = useSession();
  const navigate = useNavigate();
  const validCode = isShareCode(codigo);
  const buildQuery = useSharedBuild(codigo, user?.id, validCode && !isLoading);
  const build = buildQuery.data?.build;
  const evaluation = buildQuery.data?.evaluation;
  const partsQuery = useSharedParts(build);
  const clone = useCloneBuild(user?.id);
  const currentParts = useBuildStore((state) => state.parts);
  const loadParts = useBuildStore((state) => state.loadParts);
  const [toast, setToast] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    document.title = `${build ? `${build.name} · ` : ''}Armado compartido · ${PLATFORM_NAME}`;
  }, [build]);

  const restored = partsQuery.data;
  const parts = useMemo(() => restored?.parts ?? {}, [restored]);
  const analysis = useMemo(
    () => (Object.keys(parts).length > 0 ? analyzeBuild(parts) : null),
    [parts],
  );
  const rows = useMemo(
    () => (build && restored ? sharedRows(build.items, parts) : []),
    [build, restored, parts],
  );

  if (!validCode || (buildQuery.isError && [404, 422].includes(buildQuery.error?.status))) {
    return <NotFound />;
  }
  if (buildQuery.isError) {
    return (
      <Container className="py-space-xl">
        <ErrorNotice message={getErrorMessage(buildQuery.error)} onRetry={buildQuery.refetch} />
      </Container>
    );
  }
  if (!build) {
    return (
      <Container className="py-space-xl">
        <div
          role="status"
          aria-label="Cargando el armado"
          className="h-96 rounded-2xl bg-surface-container-low motion-safe:animate-pulse"
        />
      </Container>
    );
  }

  const available = Object.keys(parts).length;
  const canCopy = available > 0;
  const savedDate = formatDate(build.updatedAt);
  const currentTotal = analysis?.total ?? 0;
  const clearance = gpuClearance(parts);
  const priceChanged =
    restored && available === build.items.length && currentTotal !== build.totalPriceCop;

  const applyCopy = () => {
    loadParts(parts);
    navigate('/armador', { state: { notice: restoreNotice(build.name, restored) } });
  };
  const handleCopy = () => {
    if (!canCopy) return;
    if (Object.keys(currentParts).length > 0) setConfirmOpen(true);
    else applyCopy();
  };
  const handleShare = async () => {
    const copied = await copyText(buildShareUrl(build.shareCode));
    setToast(
      copied
        ? { message: 'Enlace del armado copiado.' }
        : {
            tone: 'error',
            message: `No se pudo copiar. El código del armado es ${build.shareCode}.`,
          },
    );
  };
  const handleClone = () =>
    clone.mutate(build.shareCode, {
      onSuccess: ({ build: copy }) => {
        notify({ message: `Guardamos «${copy.name}» en tu cuenta.` });
        navigate('/cuenta/armados');
      },
      onError: (error) =>
        setToast({
          tone: 'error',
          message: error instanceof ApiError ? error.userMessage : getErrorMessage(error),
        }),
    });

  return (
    <Container className="space-y-space-lg py-space-lg">
      <section
        aria-label="Armado compartido"
        className="flex flex-col gap-space-md rounded-2xl border border-primary-container/40 bg-surface-container p-space-md lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex items-start gap-space-sm">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary-container text-on-primary-container">
            <Icon name="share" className="text-[22px]" />
          </span>
          <div className="space-y-1">
            <p className="flex flex-wrap items-center gap-2 text-label-md text-on-surface">
              Estás viendo un armado compartido de solo lectura
              <span className="tnum rounded bg-surface px-2 py-0.5 text-label-sm text-on-surface-variant">
                #{build.shareCode}
              </span>
              {build.isOwner && (
                <span className="rounded-full bg-primary-container/30 px-2 py-0.5 text-label-sm text-primary">
                  Es tu armado
                </span>
              )}
            </p>
            <p className="text-body-sm text-on-surface-variant">
              {savedDate ? `Guardado el ${savedDate}. ` : ''}Los precios son los actuales de tiendas
              verificadas.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-space-xs">
          <button
            type="button"
            onClick={handleShare}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-outline-variant px-4 text-label-md text-on-surface transition-colors hover:bg-surface-variant"
          >
            <Icon name="link" className="text-[18px]" />
            Compartir enlace
          </button>
          <ComingSoonButton
            icon="picture_as_pdf"
            label="Descargar PDF"
            className="min-h-11 border border-outline-variant px-4 text-on-surface"
          />
          <button
            type="button"
            onClick={handleCopy}
            disabled={!canCopy}
            className="flex min-h-11 items-center gap-2 rounded-xl bg-primary-container px-4 text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Icon name="content_copy" className="text-[18px]" />
            Copiar en mi armado
          </button>
        </div>
      </section>

      <section
        aria-labelledby="armado-titulo"
        className="space-y-space-md rounded-2xl bg-surface-container p-space-md md:p-space-lg"
      >
        <div className="flex flex-col justify-between gap-space-sm md:flex-row md:items-start">
          <div className="space-y-1">
            <p className="text-label-sm uppercase tracking-wider text-primary">Armado público</p>
            <h1
              id="armado-titulo"
              className="text-headline-lg-mobile text-on-surface md:text-headline-lg"
            >
              {build.name}
            </h1>
          </div>
          <div className="space-y-1 md:text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">
              Costo actual
            </p>
            <p className="tnum text-headline-md text-on-surface">
              {restored ? formatCOP(currentTotal) : '—'}
            </p>
            <p className="tnum text-body-sm text-on-surface-variant">
              Ofertas vigentes: {restored ? `${available} de ${build.items.length}` : '—'}
            </p>
          </div>
        </div>

        {priceChanged && (
          <p
            role="note"
            className="flex items-start gap-space-sm rounded-2xl bg-surface p-space-sm text-body-sm text-on-surface-variant"
          >
            <Icon name="info" className="mt-0.5 text-[18px] text-unverifiable" />
            Cuando se guardó, el armado costaba {formatCOP(build.totalPriceCop)}; hoy cuesta{' '}
            {formatCOP(currentTotal)}.
          </p>
        )}

        <div className="grid gap-space-sm sm:grid-cols-2 xl:grid-cols-5">
          <Stat
            icon="verified"
            tone="text-compatible"
            label="Compatibilidad"
            value={`${evaluation.summary.ok} reglas OK`}
            hint={
              evaluation.summary.incompatible > 0
                ? `${evaluation.summary.incompatible} ${evaluation.summary.incompatible === 1 ? 'incompatible' : 'incompatibles'}`
                : `${evaluation.summary.unknown} no verificables`
            }
          />
          {clearance !== null && (
            <Stat
              icon="straighten"
              tone="text-compatible"
              label="Holgura de la gráfica"
              value={`${clearance >= 0 ? '+' : ''}${clearance} mm`}
              hint="En el gabinete"
            />
          )}
          <Stat
            icon="bolt"
            label="Consumo estimado"
            value={`${watts.format(evaluation.estimatedWatts)} W`}
            hint={
              analysis?.load
                ? `Carga ${analysis.load.percent.toLocaleString('es-CO')} %`
                : undefined
            }
          />
          <Stat
            icon="power"
            tone="text-secondary"
            label="Fuente sugerida"
            value={`${watts.format(evaluation.recommendedPsuW)} W o más`}
          />
        </div>
      </section>

      <div className="grid grid-cols-[minmax(0,1fr)] gap-space-lg lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <section aria-label="Piezas del armado" className="space-y-space-sm">
          {partsQuery.isPending && (
            <div
              role="status"
              aria-label="Cargando las piezas"
              className="h-64 rounded-2xl bg-surface-container-low motion-safe:animate-pulse"
            />
          )}
          {restored && !canCopy && (
            <p
              role="note"
              className="rounded-2xl bg-surface-container p-space-md text-body-sm text-on-surface-variant"
            >
              Ninguna pieza de este armado tiene hoy una oferta vigente, así que no se puede copiar
              al asistente.
            </p>
          )}
          {restored && (
            <ol className="space-y-space-sm">
              {rows.map((row) => (
                <PieceRow key={row.slot.category} row={row} analysis={analysis} />
              ))}
            </ol>
          )}
        </section>

        <aside aria-label="Resumen del armado" className="space-y-space-md lg:sticky lg:top-24">
          <div className="space-y-space-sm rounded-2xl bg-surface-container p-space-md">
            <h2 className="text-label-sm uppercase tracking-wider text-on-surface-variant">
              Resumen del armado compartido
            </h2>
            <p className="tnum text-headline-md text-on-surface">
              {restored ? formatCOP(currentTotal) : '—'}
            </p>
            <ul className="space-y-1 text-body-sm">
              {rows
                .filter((row) => row.offer)
                .map((row) => (
                  <li key={row.slot.category} className="flex justify-between gap-2">
                    <span className="min-w-0 truncate text-on-surface-variant">
                      {row.slot.short}: {row.item.displayName}
                    </span>
                    <span className="tnum shrink-0 text-on-surface">
                      {formatCOP(row.offer.priceCop)}
                    </span>
                  </li>
                ))}
            </ul>
            {analysis?.load && (
              <div className="space-y-1 rounded-xl bg-surface p-space-sm">
                <div className="flex justify-between text-body-sm">
                  <span className="text-on-surface-variant">Carga estimada de la fuente</span>
                  <span className="tnum text-on-surface">
                    {watts.format(evaluation.estimatedWatts)} W /{' '}
                    {watts.format(analysis.load.watts)} W
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Carga estimada de la fuente"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.min(100, Math.round(analysis.load.percent))}
                  className="h-2 overflow-hidden rounded-full bg-surface-container-high"
                >
                  <div
                    className={`h-full rounded-full ${analysis.load.level === 'ok' ? 'bg-primary-container' : analysis.load.level === 'warn' ? 'bg-unverifiable' : 'bg-incompatible'}`}
                    style={{ width: `${Math.min(100, analysis.load.percent)}%` }}
                  />
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={handleCopy}
              disabled={!canCopy}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-container px-4 text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Icon name="content_copy" className="text-[18px]" />
              Copiar en mi armado
            </button>
            <ComingSoonButton
              icon="download"
              label="Descargar cotización (PDF)"
              className="min-h-12 w-full border border-outline-variant px-4 text-on-surface"
            />

            {build.isOwner ? (
              <Link
                to="/cuenta/armados"
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl text-label-md text-primary hover:underline"
              >
                Ver mis armados
              </Link>
            ) : user ? (
              <button
                type="button"
                onClick={handleClone}
                disabled={clone.isPending}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 text-label-md text-on-surface transition-colors hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Icon name="bookmark_add" className="text-[18px]" />
                {clone.isPending ? 'Guardando…' : 'Guardar copia en mi cuenta'}
              </button>
            ) : (
              <Link
                to={`/ingresar?next=${encodeURIComponent(`/armado/${build.shareCode}`)}`}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl text-label-md text-primary hover:underline"
              >
                Inicia sesión para guardar una copia
              </Link>
            )}
          </div>

          <p className="flex items-start gap-space-sm rounded-2xl bg-surface-container-low p-space-md text-body-sm text-on-surface-variant">
            <Icon name="receipt_long" className="mt-0.5 text-[20px] text-outline" />
            Cada tienda publica sus precios. {PLATFORM_NAME} no vende ni despacha componentes: la
            compra se acuerda directamente con la tienda por WhatsApp.
          </p>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="¿Reemplazar tu armado actual?"
        message="En el asistente ya tienes piezas elegidas. Si copias este armado, las reemplazará."
        confirmLabel="Reemplazar y copiar"
        onConfirm={() => {
          setConfirmOpen(false);
          applyCopy();
        }}
        onClose={() => setConfirmOpen(false)}
      />

      {toast && <Toast message={toast.message} tone={toast.tone} onClose={() => setToast(null)} />}
    </Container>
  );
}
