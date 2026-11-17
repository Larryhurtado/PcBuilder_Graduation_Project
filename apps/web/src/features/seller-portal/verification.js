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
