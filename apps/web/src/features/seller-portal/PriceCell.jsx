import { useState } from 'react';
import { ApiError, getErrorMessage } from '../../shared/api/client.js';
import { formatCOP } from '../../shared/lib/format.js';
import Icon from '../../shared/ui/Icon.jsx';

const MAX_PRICE = 999_999_999_999;

/** Precio escrito por el vendedor ("1.849.000" o "1849000") a entero, o null si no es válido. */
export function parsePrice(text) {
  const digits = text.replace(/[.\s]/g, '');
  if (!/^\d+$/.test(digits)) return null;
  const value = Number(digits);
  return value > 0 && value <= MAX_PRICE ? value : null;
}

/**
 * Precio de la oferta con edición rápida: el lápiz lo convierte en un campo; Enter o el botón de
 * guardar lo envían y Escape lo cancela. Sin permiso para editar muestra el precio y el lápiz
 * deshabilitado.
 * @param {{ offer: { priceCop: number, component: { displayName: string } }, canEdit: boolean, onSave: (price: number) => Promise<unknown> }} props
 */
export default function PriceCell({ offer, canEdit, onSave }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const name = offer.component.displayName;

  const start = () => {
    setText(String(offer.priceCop));
    setError(null);
    setEditing(true);
  };
  const cancel = () => {
    setEditing(false);
    setError(null);
  };

  const save = async () => {
    const price = parsePrice(text);
    if (price === null) {
      setError('Escribe un precio entero mayor que 0, sin decimales');
      return;
    }
    if (price === offer.priceCop) return cancel();
    setSaving(true);
    setError(null);
    try {
      await onSave(price);
      setEditing(false);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.userMessage : getErrorMessage(cause));
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <div className="flex items-center gap-space-xs">
        <span className="tnum rounded-lg bg-surface px-3 py-2 text-label-md text-on-surface">
          {formatCOP(offer.priceCop)}
        </span>
        <button
          type="button"
          onClick={start}
          disabled={!canEdit}
          aria-label={`Editar el precio de ${name}`}
          title={canEdit ? 'Editar el precio' : 'Disponible cuando tu negocio esté verificado'}
          className="flex h-11 w-11 items-center justify-center rounded-lg text-outline transition-colors hover:bg-surface hover:text-on-surface disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-outline"
        >
          <Icon name="edit" className="text-[18px]" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        <input
          autoFocus
          inputMode="numeric"
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              save();
            }
            if (event.key === 'Escape') cancel();
          }}
          disabled={saving}
          aria-label={`Nuevo precio de ${name}`}
          aria-invalid={Boolean(error)}
          className="tnum h-11 w-32 rounded-lg border border-primary-container bg-surface px-3 text-label-md text-on-surface focus:outline-none focus:ring-3 focus:ring-primary-container/25"
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          aria-label={`Guardar el precio de ${name}`}
          className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-container text-on-primary-container disabled:opacity-60"
        >
          <Icon name={saving ? 'hourglass_top' : 'check'} className="text-[18px]" />
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={saving}
          aria-label="Cancelar la edición del precio"
          className="flex h-11 w-11 items-center justify-center rounded-lg text-outline hover:bg-surface hover:text-on-surface"
        >
          <Icon name="close" className="text-[18px]" />
        </button>
      </div>
      {error && (
        <p role="alert" className="max-w-56 text-body-sm text-incompatible">
          {error}
        </p>
      )}
    </div>
  );
}
