import Dialog from './Dialog.jsx';
import Icon from './Icon.jsx';

const TITLE_ID = 'confirmar-titulo';

/**
 * Confirmación antes de una acción que no se deshace o que reemplaza trabajo. `danger` pinta el
 * botón de confirmar como destructivo. `error` muestra por qué falló el último intento.
 * @param {{ open: boolean, title: string, message: import('react').ReactNode, confirmLabel: string, onConfirm: () => void, onClose: () => void, busy?: boolean, busyLabel?: string, danger?: boolean, error?: string | null }} props
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  onConfirm,
  onClose,
  busy = false,
  busyLabel = 'Procesando…',
  danger = false,
  error = null,
}) {
  return (
    <Dialog open={open} onClose={onClose} labelledBy={TITLE_ID} variant="narrow">
      <div className="space-y-space-md p-space-lg">
        <div className="space-y-space-xs">
          <h2 id={TITLE_ID} className="text-headline-sm text-on-surface">
            {title}
          </h2>
          <p className="text-body-md text-on-surface-variant">{message}</p>
        </div>

        {error && (
          <p
            role="alert"
            className="flex items-start gap-space-xs rounded-xl bg-[color-mix(in_srgb,var(--color-incompatible)_10%,var(--color-surface-container))] p-space-sm text-body-sm text-on-surface"
          >
            <Icon name="error" className="mt-0.5 text-[18px] text-incompatible" />
            <span>{error}</span>
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-space-xs">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-12 rounded-xl bg-surface px-5 text-label-md text-on-surface transition-colors hover:bg-surface-variant disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`h-12 rounded-xl px-5 text-label-md transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${
              danger
                ? 'border border-incompatible text-incompatible hover:bg-incompatible/10'
                : 'bg-primary-container text-on-primary-container hover:bg-primary-container/90'
            }`}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
