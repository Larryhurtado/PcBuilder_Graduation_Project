import { trackOfferEvent } from '../api/events.js';
import { buildWhatsAppUrl } from '../lib/whatsapp.js';
import Icon from './Icon.jsx';

const style =
  'flex h-11 w-full items-center justify-center gap-2 rounded-xl text-label-md transition-colors motion-reduce:transition-none';

/**
 * Botón "Contactar por WhatsApp" de una oferta: un solo clic abre el chat con la tienda con el
 * mensaje prellenado (RNF-USA-02). Registra el clic con sendBeacon antes de abrir WhatsApp.
 * Sin un número válido el botón se muestra deshabilitado.
 * @param {{ offer: { offerId: string, priceCop: number, component: { displayName: string }, store: { whatsappE164: string | null } }, className?: string }} props
 */
export default function WhatsAppLink({ offer, className = '' }) {
  const href = buildWhatsAppUrl({
    phoneE164: offer.store.whatsappE164,
    productName: offer.component.displayName,
    priceCop: offer.priceCop,
  });

  if (!href) {
    return (
      <span
        role="link"
        aria-disabled="true"
        className={`${style} cursor-not-allowed bg-surface-variant text-outline ${className}`}
      >
        <Icon name="chat" className="text-[18px]" />
        <span>WhatsApp no disponible</span>
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => trackOfferEvent(offer.offerId, 'whatsapp_click')}
      className={`${style} bg-whatsapp/15 text-whatsapp hover:bg-whatsapp/25 ${className}`}
    >
      <Icon name="chat" className="text-[18px]" />
      <span>Contactar por WhatsApp</span>
    </a>
  );
}
