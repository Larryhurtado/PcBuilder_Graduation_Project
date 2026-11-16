import { trackOfferEvent } from '../api/events.js';
import { buildWhatsAppUrl } from '../lib/whatsapp.js';
import Icon from './Icon.jsx';

const buttonStyle =
  'flex h-11 w-full items-center justify-center gap-2 rounded-xl text-label-md transition-colors motion-reduce:transition-none';
const iconStyle =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg transition-colors motion-reduce:transition-none md:h-8 md:w-8';
const inlineStyle =
  'flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-2.5 text-label-sm transition-colors motion-reduce:transition-none';

/**
 * Botón "Contactar por WhatsApp" de una oferta: un solo clic abre el chat con la tienda con el
 * mensaje prellenado (RNF-USA-02). Registra el clic con sendBeacon antes de abrir WhatsApp.
 * Sin un número válido el botón se muestra deshabilitado. `variant="icon"` es la versión compacta
 * para listas (el nombre accesible incluye el producto).
 * @param {{ offer: { offerId: string, priceCop: number, component: { displayName: string }, store: { whatsappE164: string | null } }, variant?: 'button' | 'icon', className?: string }} props
 */
export default function WhatsAppLink({ offer, variant = 'button', className = '' }) {
  const href = buildWhatsAppUrl({
    phoneE164: offer.store.whatsappE164,
    productName: offer.component.displayName,
    priceCop: offer.priceCop,
  });
  const compact = variant === 'icon';
  const inline = variant === 'inline';
  const shape = compact ? iconStyle : inline ? inlineStyle : buttonStyle;

  if (!href) {
    return (
      <span
        role="link"
        aria-disabled="true"
        aria-label={
          compact ? `WhatsApp no disponible para ${offer.component.displayName}` : undefined
        }
        title={compact ? 'WhatsApp no disponible' : undefined}
        className={`${shape} cursor-not-allowed bg-surface-variant text-outline ${className}`}
      >
        <Icon name="chat" className={compact ? 'text-[16px]' : 'text-[18px]'} />
        {!compact && <span>{inline ? 'Sin WhatsApp' : 'WhatsApp no disponible'}</span>}
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackOfferEvent(offer.offerId, 'whatsapp_click')}
      aria-label={compact ? `Cotizar ${offer.component.displayName} por WhatsApp` : undefined}
      title={compact ? 'Cotizar por WhatsApp' : undefined}
      className={`${shape} ${
        compact
          ? 'bg-surface-container text-whatsapp hover:bg-whatsapp hover:text-surface'
          : 'bg-whatsapp/15 text-whatsapp hover:bg-whatsapp/25'
      } ${className}`}
    >
      <Icon name="chat" className={compact ? 'text-[16px]' : 'text-[18px]'} />
      {!compact && <span>{inline ? 'WhatsApp' : 'Contactar por WhatsApp'}</span>}
    </a>
  );
}
