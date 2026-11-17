import { useState } from 'react';
import { ApiError, getErrorMessage } from '../../shared/api/client.js';
import Dialog from '../../shared/ui/Dialog.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import { parsePrice } from './PriceCell.jsx';

const TITLE_ID = 'editar-oferta-titulo';
const inputClass =
  'h-12 w-full rounded-xl border bg-surface px-3 text-body-md text-on-surface focus:outline-none focus:ring-3';
const okBorder =
  'border-outline-variant focus:border-primary-container focus:ring-primary-container/25';
const badBorder = 'border-incompatible focus:border-incompatible focus:ring-incompatible/25';

function Field({ id, label, hint, error, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-label-md text-on-surface">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-body-sm text-outline">{hint}</p>}
      {error && (
        <p id={`${id}-error`} className="flex items-start gap-1 text-body-sm text-incompatible">
          <Icon name="error" className="mt-0.5 text-[16px]" />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

function EditForm({ offer, onSave, onClose }) {
  const [price, setPrice] = useState(String(offer.priceCop));
  const [warranty, setWarranty] = useState(String(offer.warrantyMonths));
  const [description, setDescription] = useState(offer.description ?? '');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const next = {};
    const priceValue = parsePrice(price);
    if (priceValue === null) next.price = 'Escribe un precio entero mayor que 0, sin decimales';
    const warrantyValue = /^\d+$/.test(warranty.trim()) ? Number(warranty) : null;
    if (warrantyValue === null || warrantyValue > 120) {
      next.warranty = 'Escribe los meses de garantía, entre 0 y 120';
    }
    if (description.trim().length > 1000) next.description = 'Máximo 1000 caracteres';
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    // Solo se envía lo que cambió: la API pide al menos un campo y no repite lo que no se tocó
    const body = {};
    if (priceValue !== offer.priceCop) body.priceCop = priceValue;
    if (warrantyValue !== offer.warrantyMonths) body.warrantyMonths = warrantyValue;
    const cleaned = description.trim() === '' ? null : description.trim();
    if (cleaned !== offer.description) body.description = cleaned;
    if (Object.keys(body).length === 0) return onClose();

    setSaving(true);
    setServerError(null);
    try {
      await onSave(body);
      onClose();
    } catch (cause) {
      setServerError(cause instanceof ApiError ? cause.userMessage : getErrorMessage(cause));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-space-md p-space-lg">
      <div className="space-y-1">
        <h2 id={TITLE_ID} className="text-headline-sm text-on-surface">
          Editar oferta
        </h2>
        <p className="text-body-sm text-on-surface-variant">{offer.component.displayName}</p>
      </div>

      <Field id="oferta-precio" label="Precio (COP)" error={errors.price}>
        <input
          id="oferta-precio"
          inputMode="numeric"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          aria-invalid={Boolean(errors.price)}
          aria-describedby={errors.price ? 'oferta-precio-error' : undefined}
          className={`tnum ${inputClass} ${errors.price ? badBorder : okBorder}`}
        />
      </Field>

      <Field
        id="oferta-garantia"
        label="Garantía (meses)"
        hint="0 si la oferta no tiene garantía."
        error={errors.warranty}
      >
        <input
          id="oferta-garantia"
          inputMode="numeric"
          value={warranty}
          onChange={(event) => setWarranty(event.target.value)}
          aria-invalid={Boolean(errors.warranty)}
          aria-describedby={errors.warranty ? 'oferta-garantia-error' : undefined}
          className={`tnum ${inputClass} ${errors.warranty ? badBorder : okBorder}`}
        />
      </Field>

      <Field
        id="oferta-descripcion"
        label="Descripción (opcional)"
        hint="Lo que quieras contarle al cliente sobre esta oferta."
        error={errors.description}
      >
        <textarea
          id="oferta-descripcion"
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? 'oferta-descripcion-error' : undefined}
          className={`${inputClass} h-auto py-3 ${errors.description ? badBorder : okBorder}`}
        />
        <p className="tnum text-right text-body-sm text-outline">{description.length}/1000</p>
      </Field>

      <p className="text-body-sm text-outline">
        El producto y su estado (nuevo o usado) no cambian: para eso publica otra oferta.
      </p>

      {serverError && (
        <p
          role="alert"
          className="flex items-start gap-space-xs rounded-xl bg-[color-mix(in_srgb,var(--color-incompatible)_10%,var(--color-surface-container))] p-space-sm text-body-sm text-on-surface"
        >
          <Icon name="error" className="mt-0.5 text-[18px] text-incompatible" />
          <span>{serverError}</span>
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-space-xs">
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="h-12 rounded-xl bg-surface px-5 text-label-md text-on-surface transition-colors hover:bg-surface-variant disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={saving}
          className="h-12 rounded-xl bg-primary-container px-5 text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </form>
  );
}

/**
 * Edita precio, garantía y descripción de una oferta (PATCH /seller/offers/{id}).
 * @param {{ offer: any | null, onSave: (body: object) => Promise<unknown>, onClose: () => void }} props
 */
export default function EditOfferDialog({ offer, onSave, onClose }) {
  return (
    <Dialog open={Boolean(offer)} onClose={onClose} labelledBy={TITLE_ID} variant="narrow">
      {offer && <EditForm key={offer.offerId} offer={offer} onSave={onSave} onClose={onClose} />}
    </Dialog>
  );
}
