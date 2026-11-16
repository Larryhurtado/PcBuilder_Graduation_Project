import ButtonLink from '../../shared/ui/ButtonLink.jsx';
import Container from '../../shared/ui/Container.jsx';
import Icon from '../../shared/ui/Icon.jsx';

const proofs = [
  'Reglas de compatibilidad RC-01 a RC-08',
  'Precios en COP publicados por cada tienda',
  'Contacto directo con la tienda por WhatsApp',
];

/** Ilustración del computador. Sustituible por la imagen final cuando se exporte de Stitch. */
function TowerIllustration() {
  return (
    <svg viewBox="0 0 320 320" aria-hidden="true" className="h-full w-full p-4">
      <defs>
        <radialGradient id="hero-glow" cx="50%" cy="38%" r="55%">
          <stop
            offset="0%"
            style={{ stopColor: 'var(--color-primary-container)', stopOpacity: 0.55 }}
          />
          <stop
            offset="100%"
            style={{ stopColor: 'var(--color-primary-container)', stopOpacity: 0 }}
          />
        </radialGradient>
      </defs>
      <circle cx="160" cy="130" r="150" fill="url(#hero-glow)" />
      <rect
        x="86"
        y="24"
        width="148"
        height="272"
        rx="14"
        className="fill-surface-container-high stroke-outline-variant"
        strokeWidth="2"
      />
      <rect
        x="98"
        y="38"
        width="124"
        height="208"
        rx="8"
        className="fill-surface-container-lowest stroke-outline-variant"
        strokeWidth="1.5"
      />
      <rect
        x="106"
        y="48"
        width="66"
        height="108"
        rx="4"
        className="fill-surface-container stroke-outline-variant"
      />
      <rect
        x="120"
        y="62"
        width="26"
        height="26"
        rx="3"
        className="fill-none stroke-primary"
        strokeWidth="1.5"
      />
      <rect x="127" y="69" width="12" height="12" className="fill-primary-container" />
      <path
        d="M184 52h26M184 64h26M184 76h26"
        className="stroke-outline-variant"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="106"
        y="168"
        width="108"
        height="24"
        rx="4"
        className="fill-surface-container-highest stroke-outline-variant"
      />
      <circle cx="132" cy="180" r="8" className="fill-none stroke-primary" strokeWidth="1.5" />
      <circle cx="180" cy="180" r="8" className="fill-none stroke-primary" strokeWidth="1.5" />
      <rect
        x="106"
        y="204"
        width="108"
        height="30"
        rx="4"
        className="fill-surface-container stroke-outline-variant"
      />
      <path
        d="M216 52v184"
        className="stroke-primary-container"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect
        x="98"
        y="258"
        width="124"
        height="28"
        rx="6"
        className="fill-surface-container-low stroke-outline-variant"
      />
      <circle cx="116" cy="272" r="7" className="fill-none stroke-outline" />
      <rect x="104" y="296" width="28" height="6" rx="2" className="fill-outline-variant" />
      <rect x="188" y="296" width="28" height="6" rx="2" className="fill-outline-variant" />
    </svg>
  );
}

/** Primera pantalla del inicio: propuesta de valor, acceso directo al asistente (HU-01) y vista previa. */
export default function Hero() {
  return (
    <Container as="section" aria-labelledby="hero-title" className="pb-space-2xl pt-space-xl">
      <div className="grid grid-cols-1 items-center gap-space-xl lg:grid-cols-12">
        <div className="flex flex-col items-start gap-space-md lg:col-span-7">
          <p className="inline-flex items-center gap-space-xs rounded-full bg-surface-container-highest px-3 py-1 text-label-sm text-primary">
            <span className="h-2 w-2 rounded-full bg-secondary-fixed motion-safe:animate-pulse" />
            Validador en tiempo real en Colombia
          </p>

          <h1
            id="hero-title"
            className="max-w-xl text-balance text-headline-xl-mobile text-on-surface md:text-headline-xl"
          >
            Arma tu PC sin errores de compatibilidad
          </h1>

          <p className="max-w-xl text-body-lg text-on-surface-variant">
            Calcula potencia de fuente, compatibilidad de sockets, dimensiones de tarjeta gráfica y
            encuentra las mejores ofertas en tiendas locales verificadas de Cali y Bogotá.
          </p>

          <div className="flex w-full flex-wrap items-center gap-space-md pt-space-xs sm:w-auto">
            <ButtonLink to="/armador" variant="primary">
              <span>Empezar a armar</span>
              <Icon name="arrow_forward" className="text-[18px]" />
            </ButtonLink>
            <ButtonLink to="/catalogo" variant="secondary">
              Explorar catálogo
            </ButtonLink>
          </div>

          <ul className="flex flex-wrap items-center gap-x-space-md gap-y-space-xs pt-space-sm text-code-metric text-on-surface">
            {proofs.map((proof) => (
              <li key={proof} className="flex items-center gap-1">
                <Icon name="check" className="text-[16px] font-bold text-secondary" />
                <span>{proof}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative flex w-full justify-center lg:col-span-5">
          <div className="group relative w-full max-w-[460px] overflow-hidden rounded-2xl bg-surface-container p-space-md">
            <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-primary-container/20 blur-3xl" />
            <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-surface-container-low">
              <div className="h-full w-full transition-transform duration-500 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                <TowerIllustration />
              </div>
            </div>
            <div className="mt-space-md flex items-center gap-space-sm rounded-xl bg-surface-container-high p-space-sm">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-variant text-primary">
                <Icon name="verified" className="text-[18px]" />
              </span>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-label-sm text-on-surface">
                  Validación algorítmica activa
                </span>
                <span className="truncate text-code-metric text-on-surface-variant">
                  Sockets AM5/LGA1700 • TDP Dinámico • Clearance GPU
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Container>
  );
}
