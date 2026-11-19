import { useSyncExternalStore } from 'react';
import Icon from './Icon.jsx';

function subscribe(onChange) {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

/** Si el navegador tiene conexión a internet (se actualiza solo al perderla o recuperarla). */
export function useOnline() {
  return useSyncExternalStore(
    subscribe,
    () => navigator.onLine,
    () => true,
  );
}

/** Barra de aviso que aparece mientras no hay conexión y desaparece sola al volver. */
export default function OfflineBanner() {
  const online = useOnline();
  if (online) return null;
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-space-xs bg-unverifiable/20 px-space-md py-space-xs text-center text-body-sm text-on-surface"
    >
      <Icon name="wifi_off" className="text-[18px] text-unverifiable" />
      Sin conexión: algunas acciones no funcionarán hasta que vuelvas a conectarte.
    </div>
  );
}
