import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { getErrorMessage } from '../../shared/api/client.js';
import { PLATFORM_NAME } from '../../shared/config.js';
import { formatDate } from '../../shared/lib/format.js';
import { useSession } from '../../shared/session/useSession.js';
import ErrorNotice from '../../shared/ui/ErrorNotice.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import { useMyStore, useVerificationStatus } from './queries.js';
import {
  describeVerification,
  REQUIRED_DOCUMENTS,
  sampleVerification,
  timeLeft,
  TONES,
  TRUST_MESSAGE,
} from './verification.js';
import VerificationSimulator from './VerificationSimulator.jsx';

/** El mensaje corto del encabezado; la observación del admin se muestra completa más abajo. */
const summary = (data, view) =>
  data.status === 'correction_requested'
    ? 'Reemplaza los documentos objetados antes de que venza el plazo.'
    : data.status === 'rejected'
      ? 'Revisa el motivo y la fecha desde la que puedes volver a solicitar.'
      : view.message;

const card = 'rounded-2xl bg-surface-container p-space-md md:p-space-lg';

/** Zonas de carga de los 3 documentos; deshabilitadas hasta que la API los reciba. */
function DocumentSlots({ action }) {
  return (
    <ul aria-label="Documentos requeridos" className="grid gap-space-md md:grid-cols-3">
      {REQUIRED_DOCUMENTS.map((doc) => (
        <li
          key={doc.id}
          className="flex flex-col gap-space-sm rounded-2xl border border-outline-variant bg-surface p-space-md"
        >
          <div className="flex items-center gap-space-sm">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-container text-primary">
              <Icon name={doc.icon} className="text-[22px]" />
            </span>
            <h3 className="text-label-md text-on-surface">{doc.title}</h3>
          </div>
          <p className="text-body-sm text-on-surface-variant">{doc.text}</p>
          <button
            type="button"
            disabled
            title="Próximamente"
            aria-label={`${action} · ${doc.title} · Próximamente`}
            className="mt-auto flex min-h-14 cursor-not-allowed flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-outline-variant px-3 text-label-md text-on-surface-variant opacity-70"
          >
            <span className="flex items-center gap-1">
              <Icon name="upload_file" className="text-[18px]" />
              {action}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider">
              Próximamente · PDF, JPG o PNG (máx. 5 MB)
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Fact({ icon, label, children }) {
  return (
    <div className="flex items-start gap-space-sm rounded-2xl bg-surface-container p-space-md">
      <Icon name={icon} className="mt-0.5 text-[22px] text-outline" />
      <div className="min-w-0">
        <p className="text-body-sm text-on-surface-variant">{label}</p>
        <p className="text-label-md text-on-surface">{children}</p>
      </div>
    </div>
  );
}

/** Contador de la fecha límite para subsanar. */
function Countdown({ deadlineAt, now }) {
  const left = timeLeft(deadlineAt, now);
  if (!left) return null;
  return (
    <div className="rounded-2xl bg-surface p-space-md">
      <p className="text-body-sm text-on-surface-variant">Tiempo restante para subsanar</p>
      {left.expired ? (
        <p className="text-headline-sm text-incompatible">El plazo venció</p>
      ) : (
        <p className="tnum text-headline-sm text-on-surface">
          {left.days} {left.days === 1 ? 'día' : 'días'} · {left.hours} h · {left.minutes} min
        </p>
      )}
    </div>
  );
}

/** Aviso de que la carga de documentos todavía no existe en esta versión. */
function DemoNotice({ children }) {
  return (
    <p
      role="note"
      className="flex items-start gap-space-sm rounded-2xl bg-surface p-space-md text-body-sm text-on-surface-variant"
    >
      <Icon name="info" className="mt-0.5 text-[20px] text-outline" />
      <span>{children}</span>
    </p>
  );
}

function StatusBody({ data, store, now }) {
  const sent = formatDate(data.submittedAt);
  const place = [store?.commercialCenter, store?.city].filter(Boolean).join(' · ');
  const reapply = formatDate(data.canReapplyAt);

  switch (data.status) {
    case 'pending_review':
      return (
        <>
          <div className="grid gap-space-md sm:grid-cols-2">
            <Fact icon="calendar_today" label="Fecha de radicación">
              {sent ?? 'Sin fecha'}
            </Fact>
            <Fact icon="location_on" label="Sede evaluada">
              {place || store?.tradeName || 'Tu negocio'}
            </Fact>
          </div>
          <DemoNotice>
            Sin acciones requeridas por el momento. Cuando el equipo de {PLATFORM_NAME} termine la
            revisión, el estado cambiará aquí.
          </DemoNotice>
        </>
      );
    case 'correction_requested':
      return (
        <>
          <div className="grid gap-space-md md:grid-cols-[1fr_auto]">
            <section
              aria-label="Observación del administrador"
              className="rounded-2xl bg-surface p-space-md"
            >
              <h3 className="flex items-center gap-1 text-label-md text-on-surface">
                <Icon name="assignment_ind" className="text-[20px] text-outline" />
                Observación del administrador
              </h3>
              <p className="mt-space-xs text-body-md text-on-surface">
                {data.reviewerNote ?? 'El administrador pidió corregir tu solicitud.'}
              </p>
            </section>
            <Countdown deadlineAt={data.deadlineAt} now={now} />
          </div>
          <h3 className="text-label-md text-on-surface">Gestión de soportes documentales</h3>
          <DocumentSlots action="Reemplazar documento" />
          <button
            type="button"
            disabled
            title="Próximamente"
            className="flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-primary-container px-6 text-label-md text-on-primary-container opacity-60 sm:w-auto"
          >
            <Icon name="publish" className="text-[18px]" />
            Enviar correcciones · Próximamente
          </button>
        </>
      );
    case 'rejected':
      return (
        <>
          {data.reviewerNote && (
            <section aria-label="Motivo del rechazo" className="rounded-2xl bg-surface p-space-md">
              <h3 className="text-label-md text-on-surface">Motivo</h3>
              <p className="mt-space-xs text-body-md text-on-surface">{data.reviewerNote}</p>
            </section>
          )}
          <Fact icon="event_repeat" label="Nueva solicitud">
            {reapply
              ? `Podrás volver a solicitar desde el ${reapply}`
              : 'Podrás volver a solicitar más adelante'}
          </Fact>
        </>
      );
    case 'approved':
      return (
        <div className="flex flex-col gap-space-sm sm:flex-row">
          <Link
            to="/vendedor/publicar"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary-container px-6 text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90"
          >
            <Icon name="add_circle" className="text-[18px]" />
            Publicar producto
          </Link>
          {store && (
            <Link
              to={`/tiendas/${store.id}`}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-outline-variant px-6 text-label-md text-on-surface transition-colors hover:bg-surface-variant"
            >
              <Icon name="storefront" className="text-[18px]" />
              Ver mi perfil público
            </Link>
          )}
        </div>
      );
    case 'suspended':
      return reapply ? (
        <Fact icon="event_repeat" label="Nueva solicitud">
          Podrás volver a solicitar desde el {reapply}
        </Fact>
      ) : null;
    default:
      return (
        <>
          <h3 className="text-label-md text-on-surface">Documentos para postularte</h3>
          <DocumentSlots action="Subir documento" />
          <DemoNotice>
            Esta versión aún no tiene carga de documentos: la verificación se aprueba en modo
            demostración. El botón “Enviar a revisión” se habilitará cuando se puedan subir.
          </DemoNotice>
          <button
            type="button"
            disabled
            title="Próximamente"
            className="flex min-h-12 w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-primary-container px-6 text-label-md text-on-primary-container opacity-60 sm:w-auto"
          >
            <Icon name="send" className="text-[18px]" />
            Enviar a revisión · Próximamente
          </button>
        </>
      );
  }
}

/** Verificación del vendedor (/vendedor/verificacion): estado del trámite y lo que sigue. */
export default function VerificationPage() {
  const { user } = useSession();
  const verification = useVerificationStatus(user?.id);
  const store = useMyStore(user?.id);
  const [simulated, setSimulated] = useState(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    document.title = `Verificación · ${PLATFORM_NAME}`;
  }, []);

  const data = simulated ? sampleVerification(simulated, now) : verification.data;
  const view = data ? describeVerification(data) : null;

  return (
    <div className="mx-auto w-full max-w-[85rem] space-y-space-lg p-space-md lg:p-space-lg">
      <header className="space-y-space-xs">
        <p className="text-label-sm uppercase tracking-wider text-primary">Comercio verificado</p>
        <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
          Verificación del vendedor
        </h1>
        <p className="max-w-2xl text-body-md text-on-surface-variant">
          Para publicar ofertas en el catálogo, tu negocio debe estar verificado.
        </p>
      </header>

      <VerificationSimulator value={simulated} onChange={setSimulated} />

      {!data && verification.isError && (
        <ErrorNotice message={getErrorMessage(verification.error)} onRetry={verification.refetch} />
      )}
      {!data && !verification.isError && (
        <div
          role="status"
          aria-label="Cargando la verificación"
          className="h-64 animate-pulse rounded-2xl bg-surface-container-low"
        />
      )}

      {data && view && (
        <section aria-label="Estado de la verificación" className={`${card} space-y-space-md`}>
          <div className="flex items-start gap-space-md">
            <span
              className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${TONES[view.tone].chip}`}
            >
              <Icon name={TONES[view.tone].icon} className="text-[28px]" />
            </span>
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-headline-md text-on-surface">{view.title}</h2>
                <span className={`rounded-full px-3 py-0.5 text-label-sm ${TONES[view.tone].chip}`}>
                  {view.chip}
                </span>
              </div>
              <p className="text-body-md text-on-surface-variant">{summary(data, view)}</p>
            </div>
          </div>
          <StatusBody data={data} store={store.data} now={now} />
        </section>
      )}

      <p className="flex items-start gap-space-sm rounded-2xl bg-surface-container-low p-space-md text-body-sm text-on-surface-variant">
        <Icon name="verified_user" className="mt-0.5 text-[20px] text-primary" />
        {TRUST_MESSAGE}
      </p>
    </div>
  );
}
