import { errorCodes } from '@hw/contracts';
import { useEffect } from 'react';
import { Link } from 'react-router';
import { PLATFORM_NAME } from '../config.js';
import Container from './Container.jsx';
import Icon from './Icon.jsx';

/** Qué dice cada tipo de error. El de cuenta equivocada usa el mensaje oficial de la API. */
export const ERROR_VARIANTS = {
  notFound: {
    icon: 'search_off',
    tone: 'text-secondary',
    code: 'Error 404',
    title: 'No encontramos esa página',
    text: 'El enlace puede estar roto o la página ya no existe.',
  },
  forbidden: {
    icon: 'lock',
    tone: 'text-unverifiable',
    code: 'Error 403',
    title: 'Esta sección no es para tu tipo de cuenta',
    text: errorCodes.ROLE_FORBIDDEN.message,
  },
  unexpected: {
    icon: 'error',
    tone: 'text-incompatible',
    code: 'Error inesperado',
    title: 'Algo salió mal',
    text: errorCodes.INTERNAL_ERROR.message,
  },
  offline: {
    icon: 'wifi_off',
    tone: 'text-unverifiable',
    code: 'Sin conexión',
    title: 'No hay conexión a internet',
    text: 'Revisa tu conexión e inténtalo de nuevo.',
  },
};

const actionBase =
  'inline-flex h-12 items-center justify-center rounded-xl px-6 text-label-md transition-colors motion-reduce:transition-none';
const actionStyle = {
  primary: `${actionBase} bg-primary-container text-on-primary-container hover:bg-primary-container/90`,
  secondary: `${actionBase} border border-outline-variant text-on-surface hover:bg-surface-variant`,
};

/** Acciones por defecto de cada tipo de error. */
const defaultActions = {
  notFound: [
    { label: 'Ir al inicio', to: '/' },
    { label: 'Ver el catálogo', to: '/catalogo' },
  ],
  forbidden: [
    { label: 'Ir al inicio', to: '/' },
    { label: 'Mi cuenta', to: '/cuenta' },
  ],
  unexpected: [
    { label: 'Recargar la página', onClick: () => window.location.reload() },
    { label: 'Ir al inicio', to: '/' },
  ],
  offline: [
    { label: 'Reintentar', onClick: () => window.location.reload() },
    { label: 'Ir al inicio', to: '/' },
  ],
};

/**
 * Pantalla de error de página completa (404, cuenta equivocada, error inesperado y sin conexión).
 * La primera acción es la principal. `detail` es el mensaje técnico: solo se muestra en desarrollo.
 * @param {{ variant: keyof typeof ERROR_VARIANTS, actions?: { label: string, to?: string, onClick?: () => void }[], detail?: string }} props
 */
export default function ErrorScreen({ variant, actions, detail }) {
  const { icon, tone, code, title, text } = ERROR_VARIANTS[variant];

  useEffect(() => {
    document.title = `${title} · ${PLATFORM_NAME}`;
  }, [title]);

  return (
    <Container className="flex min-h-[60vh] items-center justify-center py-space-xl md:py-space-2xl">
      <div className="w-full max-w-xl space-y-space-md rounded-2xl bg-surface-container p-space-lg text-center md:p-space-xl">
        <span
          className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface ${tone}`}
        >
          <Icon name={icon} className="text-[28px]" />
        </span>
        <p className="tnum text-code-metric text-outline">{code}</p>
        <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">{title}</h1>
        <p className="mx-auto max-w-md text-body-lg text-on-surface-variant">{text}</p>
        <div className="flex flex-col justify-center gap-space-sm pt-space-xs sm:flex-row">
          {(actions ?? defaultActions[variant]).map((action, index) => {
            const style = actionStyle[index === 0 ? 'primary' : 'secondary'];
            return action.to ? (
              <Link key={action.label} to={action.to} className={style}>
                {action.label}
              </Link>
            ) : (
              <button key={action.label} type="button" onClick={action.onClick} className={style}>
                {action.label}
              </button>
            );
          })}
        </div>
        {import.meta.env.DEV && detail && (
          <details className="rounded-xl bg-surface p-space-sm text-left text-body-sm text-on-surface-variant">
            <summary className="min-h-11 cursor-pointer py-2 text-label-md text-on-surface">
              Detalles técnicos (solo en desarrollo)
            </summary>
            <pre className="whitespace-pre-wrap break-words text-code-metric">{detail}</pre>
          </details>
        )}
      </div>
    </Container>
  );
}
