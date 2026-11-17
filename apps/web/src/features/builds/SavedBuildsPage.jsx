import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ApiError, getErrorMessage } from '../../shared/api/client.js';
import { PLATFORM_NAME } from '../../shared/config.js';
import { copyText } from '../../shared/lib/clipboard.js';
import { formatCOP } from '../../shared/lib/format.js';
import { useSession } from '../../shared/session/useSession.js';
import ButtonLink from '../../shared/ui/ButtonLink.jsx';
import ConfirmDialog from '../../shared/ui/ConfirmDialog.jsx';
import Container from '../../shared/ui/Container.jsx';
import ErrorNotice from '../../shared/ui/ErrorNotice.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import Toast from '../../shared/ui/Toast.jsx';
import AccountSidebar from '../account/AccountSidebar.jsx';
import { useMyBuilds } from '../account/queries.js';
import { useBuildStore } from '../builder/store.js';
import BuildCard, { BuildCardSkeleton } from './BuildCard.jsx';
import { useBuildDetails, useDeleteBuild } from './queries.js';
import { restoreBuild, restoreNotice } from './restore.js';
import { buildShareUrl } from './share.js';
import { buildStatus, STATUS_VIEW } from './status.js';

const SORTS = [
  ['updated', 'Última modificación'],
  ['name', 'Nombre (A–Z)'],
  ['price_desc', 'Mayor precio'],
  ['price_asc', 'Menor precio'],
];

const sorters = {
  updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
  name: (a, b) => a.name.localeCompare(b.name, 'es'),
  price_desc: (a, b) => b.totalPriceCop - a.totalPriceCop,
  price_asc: (a, b) => a.totalPriceCop - b.totalPriceCop,
};

const FILTERS = ['all', 'ok', 'unknown', 'fail'];

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-space-sm rounded-2xl bg-surface-container px-space-md py-space-2xl text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-surface text-secondary">
        <Icon name="computer" className="text-[28px]" />
      </span>
      <h2 className="text-headline-sm text-on-surface">Aún no tienes armados guardados</h2>
      <p className="max-w-md text-body-sm text-on-surface-variant">
        Arma tu PC en el asistente y pulsa «Guardar» para encontrarlo aquí, compartirlo o seguir
        editándolo después.
      </p>
      <ButtonLink to="/armador" variant="primary" className="mt-space-xs">
        Crear un armado
      </ButtonLink>
    </div>
  );
}

/** Mis armados guardados (/cuenta/armados): lista, estado de compatibilidad, compartir y eliminar. */
export default function SavedBuildsPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const list = useMyBuilds(user?.id);
  const summaries = useMemo(() => list.data?.items ?? [], [list.data]);
  const details = useBuildDetails(summaries);
  const deleteBuild = useDeleteBuild(user?.id);
  const currentParts = useBuildStore((state) => state.parts);
  const loadParts = useBuildStore((state) => state.loadParts);

  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState('updated');
  const [toast, setToast] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [openingCode, setOpeningCode] = useState(null);
  const [pendingOpen, setPendingOpen] = useState(null);
  const closeToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    document.title = `Mis armados guardados · ${PLATFORM_NAME}`;
  }, []);

  const detailByCode = useMemo(
    () => new Map(summaries.map((summary, index) => [summary.shareCode, details[index]])),
    [summaries, details],
  );
  const allLoaded = summaries.length > 0 && details.every((detail) => detail.isSuccess);
  const statusOf = (summary) => {
    const data = detailByCode.get(summary.shareCode)?.data;
    return data ? buildStatus(data.evaluation) : null;
  };
  const counts = useMemo(() => {
    const result = { all: summaries.length, ok: 0, unknown: 0, fail: 0 };
    for (const summary of summaries) {
      const data = detailByCode.get(summary.shareCode)?.data;
      if (data) result[buildStatus(data.evaluation)] += 1;
    }
    return result;
  }, [summaries, detailByCode]);

  const visible = summaries
    .filter((summary) => filter === 'all' || statusOf(summary) === filter)
    .sort(sorters[sort]);
  const totalBudget = summaries.reduce((sum, summary) => sum + summary.totalPriceCop, 0);

  const handleShare = async (summary) => {
    const copied = await copyText(buildShareUrl(summary.shareCode));
    setToast(
      copied
        ? { message: `Enlace de «${summary.name}» copiado.` }
        : {
            tone: 'error',
            message: `No se pudo copiar. El código de «${summary.name}» es ${summary.shareCode}.`,
          },
    );
  };

  const handleDelete = () => {
    setDeleteError(null);
    deleteBuild.mutate(toDelete.id, {
      onSuccess: () => {
        setToast({ message: `«${toDelete.name}» se eliminó.` });
        setToDelete(null);
      },
      onError: (error) =>
        setDeleteError(error instanceof ApiError ? error.userMessage : getErrorMessage(error)),
    });
  };

  const applyOpen = ({ parts, name, restored }) => {
    loadParts(parts);
    navigate('/armador', { state: { notice: restoreNotice(name, restored) } });
  };

  const handleOpen = async (summary) => {
    const detail = detailByCode.get(summary.shareCode)?.data;
    if (!detail) return;
    setOpeningCode(summary.shareCode);
    try {
      const restored = await restoreBuild(detail.build.items);
      if (Object.keys(restored.parts).length === 0) {
        setToast({
          tone: 'error',
          message: `Ninguna pieza de «${summary.name}» tiene hoy una oferta vigente, así que no se pudo abrir.`,
        });
        return;
      }
      const opened = { parts: restored.parts, name: summary.name, restored };
      if (Object.keys(currentParts).length > 0) setPendingOpen(opened);
      else applyOpen(opened);
    } finally {
      setOpeningCode(null);
    }
  };

  const filterButton = (key) => {
    const label = key === 'all' ? 'Todos' : STATUS_VIEW[key].filter;
    const disabled = key !== 'all' && !allLoaded;
    return (
      <button
        key={key}
        type="button"
        disabled={disabled}
        aria-pressed={filter === key}
        onClick={() => setFilter(key)}
        title={disabled ? 'Disponible cuando carguen todos los armados' : undefined}
        className="flex min-h-11 items-center gap-1.5 rounded-full bg-surface px-4 text-label-md text-on-surface-variant transition-colors hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-surface aria-pressed:bg-primary-container aria-pressed:text-on-primary-container"
      >
        {label}
        {(key === 'all' || allLoaded) && (
          <span className="tnum text-label-sm opacity-80">{counts[key]}</span>
        )}
      </button>
    );
  };

  if (!user) return null;

  return (
    <Container size="wide" className="space-y-space-lg py-space-lg">
      <nav aria-label="Ruta de navegación" className="text-body-sm text-on-surface-variant">
        <ol className="flex flex-wrap items-center gap-x-2">
          <li>
            <Link
              to="/"
              className="inline-flex min-h-11 items-center hover:text-on-surface hover:underline md:min-h-0"
            >
              Inicio
            </Link>
          </li>
          <li aria-hidden="true" className="text-outline-variant">
            /
          </li>
          <li>
            <Link
              to="/cuenta"
              className="inline-flex min-h-11 items-center hover:text-on-surface hover:underline md:min-h-0"
            >
              Mi cuenta
            </Link>
          </li>
          <li aria-hidden="true" className="text-outline-variant">
            /
          </li>
          <li aria-current="page" className="text-on-surface">
            Mis armados guardados
          </li>
        </ol>
      </nav>

      <div className="flex flex-col justify-between gap-space-md md:flex-row md:items-end">
        <div className="space-y-space-xs">
          <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
            Mis armados guardados
          </h1>
          <p className="max-w-2xl text-body-md text-on-surface-variant">
            Tus configuraciones de hardware con el estado de compatibilidad que calcula el motor de
            reglas. Ábrelas en el asistente para seguir armándolas.
          </p>
        </div>
        <ButtonLink to="/armador" variant="primary" className="shrink-0">
          <Icon name="add" className="text-[20px]" />
          Nuevo ensamble
        </ButtonLink>
      </div>

      <div className="grid items-start gap-space-lg lg:grid-cols-[18rem_minmax(0,1fr)]">
        <aside aria-label="Perfil" className="space-y-space-md lg:sticky lg:top-20">
          <AccountSidebar user={user} current="builds" />
          {summaries.length > 0 && (
            <div className="space-y-1 rounded-2xl bg-surface-container p-space-md">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">
                Total de tus armados
              </p>
              <p className="tnum text-headline-sm font-bold text-on-surface">
                {formatCOP(totalBudget)}
              </p>
              <p className="text-body-sm text-on-surface-variant">
                {summaries.length}{' '}
                {summaries.length === 1 ? 'configuración guardada' : 'configuraciones guardadas'}
              </p>
            </div>
          )}
        </aside>

        <section aria-label="Armados" className="min-w-0 space-y-space-md">
          {summaries.length > 0 && (
            <div className="flex flex-col gap-space-sm rounded-2xl bg-surface-container p-space-sm md:flex-row md:items-center md:justify-between">
              <div
                role="group"
                aria-label="Filtrar por estado"
                className="flex flex-wrap gap-space-xs"
              >
                {FILTERS.map(filterButton)}
              </div>
              <label className="flex items-center gap-2 text-label-md text-on-surface-variant">
                <span className="hidden sm:inline">Ordenar:</span>
                <select
                  value={sort}
                  onChange={(event) => setSort(event.target.value)}
                  aria-label="Ordenar armados"
                  className="h-12 w-full rounded-xl border border-outline-variant bg-surface px-3 text-body-sm text-on-surface focus:border-primary-container focus:outline-none focus:ring-3 focus:ring-primary-container/25 md:w-56"
                >
                  {SORTS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {list.isPending && (
            <div role="status" aria-label="Cargando armados" className="space-y-space-md">
              {[0, 1].map((index) => (
                <BuildCardSkeleton key={index} />
              ))}
            </div>
          )}

          {list.isError && (
            <ErrorNotice message={getErrorMessage(list.error)} onRetry={() => list.refetch()} />
          )}

          {list.isSuccess && summaries.length === 0 && <EmptyState />}

          {visible.map((summary) => (
            <BuildCard
              key={summary.id}
              summary={summary}
              detail={detailByCode.get(summary.shareCode)}
              opening={openingCode === summary.shareCode}
              onShare={() => handleShare(summary)}
              onDelete={() => {
                setDeleteError(null);
                setToDelete(summary);
              }}
              onOpen={() => handleOpen(summary)}
            />
          ))}

          {summaries.length > 0 && visible.length === 0 && (
            <p className="rounded-2xl bg-surface-container p-space-lg text-body-md text-on-surface-variant">
              Ningún armado tiene ese estado.
            </p>
          )}
        </section>
      </div>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="¿Eliminar este armado?"
        message={
          <>
            «{toDelete?.name}» se eliminará de tu cuenta y su enlace para compartir dejará de
            funcionar. Esta acción no se puede deshacer.
          </>
        }
        confirmLabel="Eliminar armado"
        busyLabel="Eliminando…"
        busy={deleteBuild.isPending}
        danger
        error={deleteError}
        onConfirm={handleDelete}
        onClose={() => setToDelete(null)}
      />

      <ConfirmDialog
        open={Boolean(pendingOpen)}
        title="¿Reemplazar tu armado actual?"
        message="En el asistente ya tienes piezas elegidas. Si abres este armado, las reemplazará."
        confirmLabel="Reemplazar y abrir"
        onConfirm={() => {
          const opened = pendingOpen;
          setPendingOpen(null);
          applyOpen(opened);
        }}
        onClose={() => setPendingOpen(null)}
      />

      {toast && <Toast message={toast.message} tone={toast.tone} onClose={closeToast} />}
    </Container>
  );
}
