import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { PLATFORM_NAME } from '../../shared/config.js';
import { notify } from '../../shared/notices.js';
import { useSession } from '../../shared/session/useSession.js';
import Icon from '../../shared/ui/Icon.jsx';
import { useComponent } from '../product/queries.js';
import StepComponent, { ComponentCard } from './StepComponent.jsx';
import StepConditions from './StepConditions.jsx';
import StepPhotos from './StepPhotos.jsx';
import StepReview from './StepReview.jsx';
import { emptyDraft, progressPercent, STEPS, stepErrors, toOfferBody } from './publish.js';
import { useMyStore, usePublishOffer, useVerificationStatus } from './queries.js';
import { describeVerification, PUBLISH_BLOCKED_MESSAGE, TONES } from './verification.js';

/** Asistente de 4 pasos para publicar una oferta (/vendedor/publicar). */
export default function PublishPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const verification = useVerificationStatus(user?.id);
  const store = useMyStore(user?.id);
  const publish = usePublishOffer(user?.id);

  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(0);
  const [draft, setDraft] = useState(emptyDraft);
  const [errors, setErrors] = useState({});
  const [photos, setPhotos] = useState([]);
  const body = useRef(null);
  const firstRender = useRef(true);
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  const component = useComponent(draft.componentId);
  const approved = verification.data?.status === 'approved';
  const locked = Boolean(verification.data) && !approved;
  const tone = verification.data ? describeVerification(verification.data) : null;

  useEffect(() => {
    document.title = `Publicar producto · ${PLATFORM_NAME}`;
  }, []);

  // Al cambiar de paso, el foco pasa al título del paso para quien usa lector de pantalla o teclado
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const heading = body.current?.querySelector('h2');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus();
  }, [step]);

  // Libera las vistas previas al salir
  useEffect(
    () => () => {
      for (const photo of photosRef.current) {
        if (photo.previewUrl && typeof URL.revokeObjectURL === 'function') {
          URL.revokeObjectURL(photo.previewUrl);
        }
      }
    },
    [],
  );

  const change = (patch) => {
    setDraft((current) => ({ ...current, ...patch }));
    setErrors({});
  };

  const goTo = (next) => {
    setStep(next);
    setReached((current) => Math.max(current, next));
    window.scrollTo?.({ top: 0 });
  };

  const next = () => {
    const found = stepErrors(step, draft);
    setErrors(found);
    if (Object.keys(found).length === 0) goTo(step + 1);
  };

  const back = () => goTo(step - 1);

  const updatePhoto = (id, patch) =>
    setPhotos((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));

  const submit = () => {
    publish.mutate(
      { body: toOfferBody(draft), photos, onPhoto: updatePhoto },
      {
        onSuccess: (offer) => {
          notify({ message: `${offer.component.displayName} se publicó en tu inventario.` });
          navigate('/vendedor/inventario');
        },
      },
    );
  };

  const percent = progressPercent(step);
  const showSide = step < 3 && Boolean(draft.componentId) && step > 0;

  return (
    <div className="mx-auto w-full max-w-[85rem] space-y-space-lg p-space-md lg:p-space-lg">
      <header className="flex flex-col justify-between gap-space-md lg:flex-row lg:items-end">
        <div className="space-y-space-xs">
          <nav aria-label="Ruta" className="text-label-sm uppercase tracking-wider text-outline">
            Portal B2B / Catálogo canónico / <span className="text-primary">Nueva oferta</span>
          </nav>
          <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
            Publicar nueva oferta
          </h1>
          <p className="max-w-2xl text-body-md text-on-surface-variant">
            Vincula tu inventario físico al catálogo canónico de componentes, con verificación de
            compatibilidad automática.
          </p>
        </div>
        {tone && (
          <Link
            to="/vendedor/verificacion"
            className={`inline-flex items-center gap-2 self-start rounded-full px-4 py-2 text-label-md lg:self-auto ${TONES[tone.tone].chip}`}
          >
            <Icon name={TONES[tone.tone].icon} className="text-[18px]" />
            {tone.chip}
          </Link>
        )}
      </header>

      {locked && (
        <div
          role="note"
          className="flex flex-col gap-space-sm rounded-2xl bg-[color-mix(in_srgb,var(--color-unverifiable)_10%,var(--color-surface-container))] p-space-md sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-start gap-space-sm">
            <Icon name="gavel" className="mt-0.5 text-[22px] text-unverifiable" />
            <div className="space-y-1">
              <p className="text-label-md text-on-surface">Publicación de inventario restringida</p>
              <p className="text-body-sm text-on-surface-variant">{PUBLISH_BLOCKED_MESSAGE}.</p>
            </div>
          </div>
          <Link
            to="/vendedor/verificacion"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-outline-variant px-5 text-label-md text-on-surface transition-colors hover:bg-surface-container-high"
          >
            Ver estado de verificación
            <Icon name="arrow_forward" className="text-[18px]" />
          </Link>
        </div>
      )}

      <section aria-label="Progreso del alta" className="space-y-space-sm">
        <div className="flex items-center justify-between gap-2">
          <p className="text-label-sm uppercase tracking-wider text-on-surface-variant">
            Proceso de alta de producto
          </p>
          <p className="tnum text-label-md text-primary">{percent}% completado</p>
        </div>
        <div
          role="progressbar"
          aria-label="Avance del alta de producto"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className="h-1.5 overflow-hidden rounded-full bg-surface-container-high"
        >
          <div
            className="h-full rounded-full bg-primary-container transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        <ol className="grid gap-space-xs sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((item, index) => {
            const active = index === step;
            const done = index < step;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={index > reached || locked}
                  aria-current={active ? 'step' : undefined}
                  onClick={() => goTo(index)}
                  className={`flex w-full items-center gap-space-sm rounded-xl px-space-md py-space-sm text-left transition-colors disabled:cursor-not-allowed ${
                    active
                      ? 'bg-primary-container text-on-primary-container'
                      : done
                        ? 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                        : 'bg-surface-container-low text-outline'
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-code-metric ${
                      active
                        ? 'bg-on-primary-container text-primary-container'
                        : done
                          ? 'bg-compatible/20 text-compatible'
                          : 'bg-surface-container-highest text-outline'
                    }`}
                  >
                    {done ? <Icon name="check" className="text-[16px]" /> : index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-label-sm uppercase tracking-wider opacity-80">
                      Paso {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="block truncate text-label-md">{item.label}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <div
        className={`grid gap-space-lg lg:items-start ${showSide ? 'lg:grid-cols-[minmax(0,1fr)_20rem]' : ''}`}
      >
        <fieldset
          disabled={locked}
          ref={body}
          className={`min-w-0 rounded-2xl bg-surface-container p-space-md md:p-space-lg ${
            locked ? 'opacity-50' : ''
          }`}
        >
          {step === 0 && (
            <StepComponent draft={draft} errors={errors} onChange={change} onNext={next} />
          )}
          {step === 1 && (
            <StepConditions
              draft={draft}
              errors={errors}
              onChange={change}
              onNext={next}
              onBack={back}
              componentName={component.data?.displayName ?? ''}
            />
          )}
          {step === 2 && (
            <StepPhotos photos={photos} onChange={setPhotos} onNext={next} onBack={back} />
          )}
          {step === 3 && component.data && (
            <StepReview
              component={component.data}
              draft={draft}
              photos={photos}
              storeName={store.data?.tradeName ?? 'Tu negocio'}
              publishing={publish.isPending}
              error={publish.error}
              onPublish={submit}
              onBack={back}
              onEdit={() => goTo(0)}
            />
          )}
        </fieldset>

        {showSide && (
          <aside aria-label="Componente vinculado" className="space-y-space-sm">
            <h2 className="text-label-sm uppercase tracking-wider text-on-surface-variant">
              Datos técnicos heredados
            </h2>
            <ComponentCard componentId={draft.componentId} compact />
            <p className="text-body-sm text-outline">
              Las reglas de compatibilidad se aplican automáticamente en el armador de tus clientes.
            </p>
          </aside>
        )}
      </div>

      <p className="border-t border-outline-variant/40 pt-space-md text-body-sm text-outline">
        Base de datos taxonómica suministrada bajo licencia abierta BuildCores OpenDB (CC BY-NC-SA
        4.0).
      </p>
    </div>
  );
}
