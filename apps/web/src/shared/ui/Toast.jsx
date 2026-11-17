import { useEffect } from 'react';
import Icon from './Icon.jsx';

/**
 * Aviso breve que se cierra solo (6 s por defecto). Se anuncia a los lectores de pantalla.
 * `children` es la acción opcional (por ejemplo un enlace "Ver armador"). `tone="error"` es para
 * avisos de algo que no salió bien.
 * @param {{ message: string, onClose: () => void, duration?: number, tone?: 'success' | 'error', children?: import('react').ReactNode }} props
 */
export default function Toast({ message, onClose, duration = 6000, tone = 'success', children }) {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [message, onClose, duration]);

  return (
    <div
      role="status"
      className="fixed inset-x-space-md bottom-space-md z-50 mx-auto flex max-w-md items-center gap-space-sm rounded-2xl border border-outline-variant bg-surface-container-high p-space-sm pl-space-md text-body-sm text-on-surface shadow-[0_8px_24px_rgba(0,0,0,0.45)] lg:bottom-space-lg"
    >
      <Icon
        name={tone === 'error' ? 'error' : 'check_circle'}
        className={`text-[20px] ${tone === 'error' ? 'text-incompatible' : 'text-compatible'}`}
      />
      <span className="flex-1">{message}</span>
      {children}
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar aviso"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-outline transition-colors hover:bg-surface hover:text-on-surface"
      >
        <Icon name="close" className="text-[18px]" />
      </button>
    </div>
  );
}
