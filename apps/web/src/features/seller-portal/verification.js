import { formatDate } from '../../shared/lib/format.js';

/** Aspecto de cada tono: color del texto, del fondo del chip y del ícono. */
export const TONES = {
  ok: { text: 'text-compatible', chip: 'bg-compatible/12 text-compatible', icon: 'verified' },
  wait: {
    text: 'text-unverifiable',
    chip: 'bg-unverifiable/15 text-unverifiable',
    icon: 'hourglass_top',
  },
  bad: {
    text: 'text-incompatible',
    chip: 'bg-incompatible/15 text-incompatible',
    icon: 'block',
  },
};

/**
 * Cómo se muestra cada estado de verificación del comercio: chip corto, título y mensaje. Los
 * mensajes siguen la tabla de docs/contexto-frontend.md. Con `note` y fechas de la API cuando hay.
 * @param {{ status: string, reviewerNote?: string | null, deadlineAt?: string | null, canReapplyAt?: string | null }} verification
 */
export function describeVerification({ status, reviewerNote, deadlineAt, canReapplyAt }) {
  switch (status) {
    case 'approved':
      return {
        tone: 'ok',
        chip: 'Verificado',
        title: 'Negocio verificado',
        message:
          'Tu catálogo es visible en el sitio y tus clientes pueden escribirte por WhatsApp.',
      };
    case 'pending_review':
      return {
        tone: 'wait',
        chip: 'En revisión',
        title: 'Tu solicitud está en revisión',
        message: 'Tiempo estimado: 3 a 5 días hábiles (máximo 15).',
      };
    case 'correction_requested': {
      const deadline = formatDate(deadlineAt);
      return {
        tone: 'wait',
        chip: 'Corrección solicitada',
        title: 'El administrador pidió una corrección',
        message: [reviewerNote, deadline && `Plazo hasta el ${deadline}.`]
          .filter(Boolean)
          .join(' '),
      };
    }
    case 'rejected': {
      const again = formatDate(canReapplyAt);
      return {
        tone: 'bad',
        chip: 'Rechazado',
        title: 'Tu solicitud fue rechazada',
        message: [reviewerNote, again && `Podrás volver a solicitar desde el ${again}.`]
          .filter(Boolean)
          .join(' '),
      };
    }
    case 'suspended':
      return {
        tone: 'bad',
        chip: 'Suspendido',
        title: 'Cuenta suspendida',
        message: 'Tu cuenta de vendedor está deshabilitada.',
      };
    default:
      return {
        tone: 'wait',
        chip: 'Verificación pendiente',
        title: 'Verificación pendiente',
        message:
          'Esta versión aún no tiene carga de documentos: la verificación se aprueba en modo demostración.',
      };
  }
}

/** Aviso exacto que acompaña a "Publicar producto" mientras el negocio no esté verificado. */
export const PUBLISH_BLOCKED_MESSAGE =
  'Aún no puedes publicar productos hasta que tu negocio sea verificado';

/** Aviso de confianza que acompaña a la verificación en toda la plataforma. */
export const TRUST_MESSAGE =
  'La verificación confirma que el negocio existe; no garantiza el cumplimiento de sus ofertas.';

/** Documentos que pide la verificación (los textos siguen el diseño; por confirmar con backend). */
export const REQUIRED_DOCUMENTS = [
  {
    id: 'rut',
    icon: 'receipt_long',
    title: 'RUT o NIT actualizado',
    text: 'Registro Único Tributario vigente, con la actividad económica de tu comercio.',
  },
  {
    id: 'camara',
    icon: 'corporate_fare',
    title: 'Certificado de existencia',
    text: 'Cámara de Comercio u homologada, con vigencia menor a 90 días a la fecha de radicación.',
  },
  {
    id: 'cedula',
    icon: 'badge',
    title: 'Cédula del representante legal',
    text: 'Cédula de ciudadanía por ambas caras, en alta resolución y sin reflejos.',
  },
];

/**
 * Tiempo que falta para una fecha límite, separado en días, horas y minutos. Devuelve null si la
 * fecha no es válida y `expired: true` cuando ya pasó.
 * @param {string | null | undefined} deadlineAt fecha ISO 8601
 * @param {number} now milisegundos actuales
 */
export function timeLeft(deadlineAt, now) {
  const end = deadlineAt ? Date.parse(deadlineAt) : Number.NaN;
  if (Number.isNaN(end)) return null;
  const ms = end - now;
  if (ms <= 0) return { expired: true, days: 0, hours: 0, minutes: 0 };
  const minutes = Math.floor(ms / 60_000);
  return {
    expired: false,
    days: Math.floor(minutes / 1440),
    hours: Math.floor((minutes % 1440) / 60),
    minutes: minutes % 60,
  };
}

const DAY = 86_400_000;

/**
 * Datos de ejemplo de cada estado, solo para el simulador de desarrollo (la API real los trae
 * en GET /seller/verification/status).
 * @param {string} status
 * @param {number} now
 */
export function sampleVerification(status, now) {
  const iso = (offset) => new Date(now + offset).toISOString();
  const base = {
    status,
    submittedAt: null,
    reviewerNote: null,
    deadlineAt: null,
    canReapplyAt: null,
  };
  switch (status) {
    case 'pending_review':
      return { ...base, submittedAt: iso(-2 * DAY) };
    case 'correction_requested':
      return {
        ...base,
        submittedAt: iso(-3 * DAY),
        reviewerNote:
          'El certificado de existencia tiene más de 90 días de expedición y la foto de la cédula tiene reflejos que impiden leerla.',
        deadlineAt: iso(15 * DAY - 8 * 3_600_000),
      };
    case 'approved':
      return { ...base, submittedAt: iso(-10 * DAY) };
    case 'rejected':
      return {
        ...base,
        submittedAt: iso(-12 * DAY),
        reviewerNote: 'No pudimos validar la existencia del negocio con los documentos enviados.',
        canReapplyAt: iso(30 * DAY),
      };
    case 'suspended':
      return { ...base, submittedAt: iso(-40 * DAY), canReapplyAt: iso(30 * DAY) };
    default:
      return base;
  }
}
