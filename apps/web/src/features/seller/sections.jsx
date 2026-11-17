import { Link } from 'react-router';
import { getErrorMessage } from '../../shared/api/client.js';
import { formatCOP, formatLocation, initials } from '../../shared/lib/format.js';
import Container from '../../shared/ui/Container.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import { useStores } from '../stores/queries.js';

const cardClass = 'rounded-2xl bg-surface-container p-space-lg';

function SectionHead({ overline, title, description, id }) {
  return (
    <div className="mx-auto mb-space-xl max-w-3xl space-y-space-xs text-center">
      <p className="text-label-sm uppercase tracking-wider text-primary">{overline}</p>
      <h2 id={id} className="text-headline-md text-on-surface md:text-headline-lg">
        {title}
      </h2>
      {description && <p className="text-body-md text-on-surface-variant">{description}</p>}
    </div>
  );
}

/** Cabecera de la página: promesa, accesos a la solicitud y a los requisitos, y un ejemplo ilustrativo. */
export function Hero() {
  return (
    <Container
      as="section"
      aria-labelledby="vender-titulo"
      className="grid items-center gap-space-xl py-space-xl lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:py-space-2xl"
    >
      <div className="space-y-space-lg">
        <div className="flex flex-wrap items-center gap-space-xs">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-container-highest px-3 py-1 text-label-sm text-primary">
            <Icon name="verified" className="text-[14px]" />
            Para comercios de tecnología en Colombia
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/15 px-3 py-1 text-label-sm text-secondary">
            <Icon name="sell" className="text-[14px]" />
            0% de comisión por transacción
          </span>
        </div>

        <h1
          id="vender-titulo"
          className="text-headline-xl-mobile text-on-surface md:text-headline-xl"
        >
          Impulsa tus ventas de hardware sin intermediarios ni comisiones.
        </h1>
        <p className="max-w-xl text-body-lg text-on-surface-variant">
          Conectamos tu inventario físico con entusiastas, gamers y profesionales que arman su PC en
          Colombia. Recibe consultas calificadas directo en tu WhatsApp comercial y en tu mostrador.
        </p>

        <div className="flex flex-wrap items-center gap-space-sm">
          <a
            href="#postulacion"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary-container px-6 text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90"
          >
            <Icon name="storefront" className="text-[20px]" />
            Quiero vender
            <Icon name="arrow_forward" className="text-[18px]" />
          </a>
          <a
            href="#requisitos"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-outline-variant px-6 text-label-md text-on-surface transition-colors hover:border-outline hover:bg-surface-variant"
          >
            <Icon name="balance" className="text-[20px]" />
            Conoce los requisitos legales
          </a>
        </div>

        <p className="text-body-sm text-outline">
          Solo pueden vender comercios legalmente constituidos. Un administrador revisa cada
          solicitud antes de publicar ofertas.
        </p>
      </div>

      <aside
        aria-label="Ejemplo ilustrativo de una cotización"
        className="space-y-space-md rounded-2xl bg-surface-container p-space-lg"
      >
        <div className="flex items-center justify-between gap-space-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-outline">
            Así llega una cotización a tu tienda
          </p>
          <span className="rounded bg-surface px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
            Ejemplo ilustrativo
          </span>
        </div>

        <div className="space-y-space-xs rounded-xl bg-surface p-space-md">
          <div className="flex items-center justify-between gap-space-sm">
            <p className="text-label-md text-on-surface">Nueva cotización completada</p>
            <span className="inline-flex items-center gap-1 rounded bg-compatible/12 px-2 py-0.5 text-[11px] font-medium text-compatible">
              <Icon name="check_circle" className="text-[13px]" />
              Compatible
            </span>
          </div>
          <p className="text-body-sm text-on-surface-variant">
            Rig de trabajo CAD · Ryzen 9 + RTX 4080 Super
          </p>
          <div className="flex items-end justify-between gap-space-sm pt-1">
            <p className="text-body-sm text-outline">
              Cliente en <strong className="font-semibold text-on-surface">Bogotá D.C.</strong>
            </p>
            <p className="tnum text-headline-sm font-bold text-on-surface">{formatCOP(11450000)}</p>
          </div>
        </div>

        <div className="space-y-space-xs rounded-xl bg-whatsapp/10 p-space-md">
          <p className="flex items-center gap-1.5 text-label-md text-whatsapp">
            <Icon name="chat" className="text-[18px]" />
            Llega a tu WhatsApp comercial
          </p>
          <p className="text-body-sm text-on-surface">
            «Hola, vi este ensamble en PcBuilder y elegí su tienda para recogerlo hoy…»
          </p>
        </div>

        <div className="grid grid-cols-2 gap-space-xs">
          <div className="rounded-xl bg-surface p-space-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">
              Comisión retenida
            </p>
            <p className="tnum text-label-md text-on-surface">{formatCOP(0)}</p>
          </div>
          <div className="rounded-xl bg-surface p-space-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-outline">
              Intermediarios
            </p>
            <p className="tnum text-label-md text-on-surface">Ninguno</p>
          </div>
        </div>
        <p className="text-[11px] text-outline">
          Datos de ejemplo para mostrar cómo funciona; no corresponden a una venta real.
        </p>
      </aside>
    </Container>
  );
}

const advantages = [
  {
    icon: 'sync_alt',
    tone: 'text-primary bg-primary-container/25',
    tag: 'Visibilidad algorítmica',
    title: 'Publica tus ofertas en el catálogo',
    body: 'Tus componentes entran al catálogo y al asistente de ensamblaje. Cada vez que un usuario elige un procesador, una tarjeta gráfica o un gabinete compatible, tu tienda aparece como una opción con su precio.',
    proof: 'Compatibilidad verificada por socket, consumo y espacio',
  },
  {
    icon: 'forum',
    tone: 'text-secondary bg-secondary/15',
    tag: 'Trato directo con el cliente',
    title: 'Contacto directo por WhatsApp y mostrador',
    body: 'Sin pasarelas de pago obligatorias ni retención de dinero. El cliente te escribe a tu WhatsApp comercial con la cotización lista, o visita tu local en su centro comercial.',
    proof: 'Negociación de garantías y medios de pago propia',
  },
  {
    icon: 'money_off',
    tone: 'text-compatible bg-compatible/15',
    tag: 'Rentabilidad 100 % tuya',
    title: '0 % de comisión por venta (cero intermediarios)',
    body: 'PcBuilder no procesa transacciones ni cobra un porcentaje sobre tus ventas. Es un agregador y motor de compatibilidad gratuito para comercios autorizados que cumplen la ley colombiana.',
    proof: 'Sin comisiones por pasarela ni cobros sorpresa',
  },
];

/** Tres ventajas para el comercio. */
export function Advantages() {
  return (
    <section aria-labelledby="ventajas-titulo" className="bg-surface-container-low py-space-2xl">
      <Container>
        <SectionHead
          id="ventajas-titulo"
          overline="Ventajas competitivas"
          title="Diseñado para maximizar el margen de tu tienda de informática"
          description="Eliminamos los costos ocultos y la fricción de los marketplaces convencionales."
        />
        <ul className="grid gap-space-md md:grid-cols-3">
          {advantages.map((item) => (
            <li key={item.title} className={`${cardClass} flex list-none flex-col gap-space-sm`}>
              <div className="flex items-center justify-between gap-space-sm">
                <span
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${item.tone}`}
                >
                  <Icon name={item.icon} className="text-[26px]" />
                </span>
                <span className="rounded bg-surface px-2 py-0.5 text-[11px] font-semibold text-on-surface-variant">
                  {item.tag}
                </span>
              </div>
              <h3 className="text-headline-sm text-on-surface">{item.title}</h3>
              <p className="flex-1 text-body-sm text-on-surface-variant">{item.body}</p>
              <p className="flex items-start gap-1.5 border-t border-outline-variant/40 pt-space-sm text-body-sm text-on-surface">
                <Icon name="check_circle" className="mt-0.5 text-[16px] text-compatible" />
                {item.proof}
              </p>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

const documents = [
  {
    n: '01',
    title: 'RUT actualizado (DIAN)',
    body: 'Registro Único Tributario con NIT activo emitido por la DIAN. Debe certificar una actividad económica (CIIU) afín al comercio formal de equipos informáticos, por ejemplo 4651 o 4741.',
  },
  {
    n: '02',
    title: 'Cámara de Comercio vigente',
    body: 'Certificado de Existencia y Representación Legal expedido con un máximo de 30 días calendario por la Cámara de Comercio correspondiente (Bogotá, Medellín, Cali, Barranquilla u otra seccional).',
  },
  {
    n: '03',
    title: 'Cédula del representante legal',
    body: 'Copia digital legible del documento de identidad del representante legal registrado ante la Cámara de Comercio, para tener trazabilidad jurídica frente al consumidor final.',
  },
  {
    n: '04',
    title: 'Facturación DIAN y garantía real',
    body: 'Compromiso de expedir factura electrónica según los lineamientos de la DIAN y de cumplir el Estatuto del Consumidor (Ley 1480), con garantía directa mínima de 12 meses en hardware nuevo.',
  },
];

/** Requisitos de verificación para personas jurídicas. */
export function Requirements() {
  return (
    <Container
      as="section"
      id="requisitos"
      aria-labelledby="requisitos-titulo"
      className="scroll-mt-24 py-space-2xl"
    >
      <SectionHead
        id="requisitos-titulo"
        overline="Marco de cumplimiento normativo"
        title="Requisitos de verificación para personas jurídicas"
        description="Antes de publicar ofertas, un administrador revisa la documentación de tu comercio."
      />

      <div
        role="note"
        className="mb-space-lg flex items-start gap-space-sm rounded-2xl bg-[color-mix(in_srgb,var(--color-incompatible)_10%,var(--color-surface-container))] p-space-lg"
      >
        <Icon name="warning" className="mt-0.5 text-[26px] text-incompatible" />
        <div className="space-y-1">
          <h3 className="text-headline-sm text-incompatible">
            Aviso legal: no se admiten personas naturales
          </h3>
          <p className="text-body-sm text-on-surface">
            Las personas naturales no están autorizadas para vender en la plataforma. Este espacio
            es exclusivo para{' '}
            <strong className="font-semibold">empresas legalmente constituidas en Colombia</strong>{' '}
            con establecimiento de comercio físico comprobable o distribución mayorista formal, con
            capacidad de expedir factura electrónica y de dar soporte posventa.
          </p>
        </div>
      </div>

      <ul className="grid gap-space-md md:grid-cols-2">
        {documents.map((doc) => (
          <li key={doc.n} className={`${cardClass} flex list-none gap-space-md`}>
            <span className="tnum flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-label-md text-primary">
              {doc.n}
            </span>
            <div className="space-y-1">
              <h3 className="text-headline-sm text-on-surface">{doc.title}</h3>
              <p className="text-body-sm text-on-surface-variant">{doc.body}</p>
            </div>
          </li>
        ))}
      </ul>
    </Container>
  );
}

const steps = [
  {
    n: 1,
    label: 'Paso 01',
    title: 'Diligenciamiento de datos',
    body: 'Ingresas la información básica de tu local: ubicación del mostrador y número de WhatsApp para recibir las cotizaciones.',
    tag: 'Disponible hoy',
    soon: false,
  },
  {
    n: 2,
    label: 'Paso 02',
    title: 'Carga de documentos',
    body: 'Adjuntas en PDF tu RUT, el certificado de Cámara de Comercio y la cédula del representante legal.',
    tag: 'Próximamente',
    soon: true,
  },
  {
    n: 3,
    label: 'Paso 03',
    title: 'Revisión por un administrador',
    body: 'Un administrador contrasta tus documentos y valida que tu comercio esté legalmente constituido.',
    tag: 'Revisión humana',
    soon: false,
  },
  {
    n: 4,
    label: 'Paso final',
    title: 'Activación del perfil de tienda',
    body: 'Recibes tu insignia de comercio verificado, publicas tus ofertas y empiezas a recibir consultas por WhatsApp.',
    tag: 'Insignia verde',
    soon: false,
  },
];

/** El proceso de afiliación en cuatro pasos (el segundo todavía no existe). */
export function Steps() {
  return (
    <section aria-labelledby="pasos-titulo" className="bg-surface-container-low py-space-2xl">
      <Container>
        <SectionHead
          id="pasos-titulo"
          overline="Protocolo de afiliación"
          title="Proceso de 4 etapas para activar tu inventario"
          description="Un flujo digital asistido, sin visitas burocráticas."
        />
        <ol className="grid gap-space-md md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <li key={step.n} className={`${cardClass} flex list-none flex-col gap-space-sm`}>
              <div className="flex items-center justify-between gap-space-sm">
                <span className="tnum flex h-9 w-9 items-center justify-center rounded-full bg-primary-container text-label-md text-on-primary-container">
                  {step.n}
                </span>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-outline">
                  {step.label}
                </span>
              </div>
              <h3 className="text-headline-sm text-on-surface">{step.title}</h3>
              <p className="flex-1 text-body-sm text-on-surface-variant">{step.body}</p>
              <span
                className={`self-start rounded px-2 py-0.5 text-[11px] font-semibold ${
                  step.soon
                    ? 'bg-surface text-on-surface-variant'
                    : 'bg-compatible/12 text-compatible'
                }`}
              >
                {step.tag}
              </span>
            </li>
          ))}
        </ol>
      </Container>
    </section>
  );
}

function Stat({ value, label, tone = 'text-on-surface' }) {
  return (
    <div className="space-y-1 rounded-2xl bg-surface-container p-space-md text-center">
      <p className={`tnum text-headline-md font-bold md:text-headline-lg ${tone}`}>{value}</p>
      <p className="text-body-sm text-on-surface-variant">{label}</p>
    </div>
  );
}

/**
 * Cifras reales de la plataforma y una tienda verificada de verdad, ambas tomadas de GET /stores.
 * Si la consulta falla solo queda la cifra que no depende de ella ($0 en comisiones).
 */
export function Proof() {
  const { data, isPending, isError, error } = useStores({ limit: 50 });
  const items = data?.items ?? [];
  const capped = items.length === 50;
  const offers = items.reduce((sum, store) => sum + store.offersCount, 0);
  const cities = new Set(items.map((store) => store.city).filter(Boolean)).size;
  const featured = items[0];

  return (
    <Container
      as="section"
      aria-labelledby="prueba-titulo"
      className="space-y-space-lg py-space-2xl"
    >
      <h2 id="prueba-titulo" className="sr-only">
        La plataforma en cifras
      </h2>

      {isPending && (
        <div
          role="status"
          aria-label="Cargando cifras"
          className="h-28 rounded-2xl bg-surface-container motion-safe:animate-pulse"
        />
      )}

      <div className="grid grid-cols-2 gap-space-sm lg:grid-cols-4">
        {data && (
          <>
            <Stat
              value={capped ? `${items.length}+` : items.length}
              label={items.length === 1 ? 'tienda verificada' : 'tiendas verificadas'}
            />
            <Stat value={offers} label="ofertas activas hoy" />
            <Stat
              value={cities}
              label={cities === 1 ? 'ciudad con tiendas' : 'ciudades con tiendas'}
            />
          </>
        )}
        <Stat value={formatCOP(0)} label="cobrados en comisiones de venta" tone="text-secondary" />
      </div>

      {isError && (
        <p className="text-center text-body-sm text-on-surface-variant">
          No pudimos cargar las cifras de la plataforma. {getErrorMessage(error)}
        </p>
      )}

      {featured && (
        <article
          aria-label="Una tienda verificada"
          className="flex flex-col gap-space-md rounded-2xl bg-surface-container p-space-lg md:flex-row md:items-center md:justify-between"
        >
          <div className="flex items-start gap-space-md">
            <span
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-surface text-headline-sm text-primary"
            >
              {initials(featured.name)}
            </span>
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-outline">
                Una de las tiendas verificadas
              </p>
              <div className="flex flex-wrap items-center gap-space-xs">
                <h3 className="text-headline-sm text-on-surface">{featured.name}</h3>
                <span className="inline-flex items-center gap-1 rounded bg-compatible/12 px-2 py-0.5 text-[11px] font-medium text-compatible">
                  <Icon name="verified" className="text-[13px]" />
                  Comercio verificado
                </span>
              </div>
              <p className="text-body-sm text-on-surface-variant">
                {[featured.commercialCenter, formatLocation(featured)].filter(Boolean).join(' · ')}
              </p>
              {featured.description && (
                <p className="max-w-2xl text-body-sm text-on-surface-variant">
                  {featured.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-space-xs md:items-end">
            <p className="tnum text-label-md text-secondary">
              {featured.offersCount}{' '}
              {featured.offersCount === 1 ? 'oferta activa' : 'ofertas activas'}
            </p>
            <Link
              to={`/tiendas/${featured.id}`}
              className="inline-flex min-h-11 items-center gap-1 text-label-md font-semibold text-primary hover:underline"
            >
              Ver su perfil
              <Icon name="arrow_forward" className="text-[16px]" />
            </Link>
          </div>
        </article>
      )}
    </Container>
  );
}

/** Cierre de la página con un segundo llamado a la acción. */
export function FinalCta() {
  return (
    <Container as="section" aria-labelledby="cierre-titulo" className="pb-space-2xl">
      <div className="flex flex-col items-start justify-between gap-space-lg rounded-3xl bg-gradient-to-br from-primary-container/40 to-surface-container p-space-xl md:flex-row md:items-center">
        <div className="max-w-2xl space-y-space-xs">
          <p className="text-label-sm uppercase tracking-wider text-primary">
            Únete a los comercios verificados
          </p>
          <h2 id="cierre-titulo" className="text-headline-md text-on-surface md:text-headline-lg">
            Convierte a PcBuilder en tu canal de prospección número uno
          </h2>
          <p className="text-body-md text-on-surface-variant">
            Sin comisiones, sin retenciones de caja y con clientes que ya saben exactamente qué
            componentes quieren comprarte.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-start gap-space-xs">
          <a
            href="#postulacion"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-primary-container px-6 text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90"
          >
            <Icon name="add_business" className="text-[20px]" />
            Quiero vender
            <Icon name="arrow_forward" className="text-[18px]" />
          </a>
          <a
            href="#requisitos"
            className="text-body-sm text-on-surface-variant underline hover:text-on-surface"
          >
            ¿Dudas antes de postularte? Revisa los requisitos.
          </a>
        </div>
      </div>
    </Container>
  );
}
