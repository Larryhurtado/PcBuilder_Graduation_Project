import { buildStoreWhatsAppUrl } from '../lib/whatsapp.js';
import Icon from './Icon.jsx';

const style =
  'flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-xl px-4 text-label-md transition-colors motion-reduce:transition-none';

/**
 * Botón de WhatsApp de una tienda: abre el chat con un mensaje de consulta general. Sin un número
 * válido se muestra deshabilitado.
 * @param {{ store: { name: string, whatsappE164: string | null }, className?: string }} props
 */
export default function StoreWhatsAppLink({ store, className = '' }) {
  const href = buildStoreWhatsAppUrl({ phoneE164: store.whatsappE164, storeName: store.name });

  if (!href) {
    return (
      <span
        role="link"
        aria-disabled="true"
        aria-label={`WhatsApp no disponible para ${store.name}`}
        className={`${style} cursor-not-allowed bg-surface-variant text-outline ${className}`}
      >
        <Icon name="chat" className="text-[18px]" />
        <span>Sin WhatsApp</span>
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Escribir a ${store.name} por WhatsApp`}
      className={`${style} bg-whatsapp/15 text-whatsapp hover:bg-whatsapp/25 ${className}`}
    >
      <Icon name="chat" className="text-[18px]" />
      <span>WhatsApp</span>
    </a>
  );
}
