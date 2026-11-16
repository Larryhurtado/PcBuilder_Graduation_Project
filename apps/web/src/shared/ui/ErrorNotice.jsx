import Icon from './Icon.jsx';

/**
 * Aviso de error con botón de reintento (estado de error de red de las pantallas).
 * @param {{ message: string, onRetry?: () => void }} props
 */
export default function ErrorNotice({ message, onRetry }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-space-md rounded-2xl bg-surface-container p-6 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-space-sm">
        <Icon name="error" className="text-[22px] text-incompatible" />
        <p className="text-body-md text-on-surface">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="h-11 shrink-0 rounded-xl border border-outline-variant px-5 text-label-md text-on-surface transition-colors hover:border-outline hover:bg-surface-variant"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
