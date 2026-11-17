import { useState } from 'react';
import { getErrorMessage } from '../../shared/api/client.js';
import { login } from '../../shared/session/actions.js';
import Icon from '../../shared/ui/Icon.jsx';

/**
 * TEMPORAL, solo para desarrollo: atajo para entrar al portal del vendedor con la cuenta de
 * demostración de los datos simulados. Solo existe con `VITE_USE_MOCKS=true`: en cualquier otra
 * compilación el valor se reemplaza por `false` y este código (y las cuentas de demostración, que
 * se cargan solo al pulsar) no llega al sitio. Se borra cuando haya backend real.
 */
export default function DemoSellerShortcut() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (import.meta.env.VITE_USE_MOCKS !== 'true') return null;

  const enter = async () => {
    setBusy(true);
    setError(null);
    try {
      const { demoUsers } = await import('../../mocks/auth.js');
      const seller = demoUsers.find((account) => account.role === 'seller');
      // LoginPage redirige solo al detectar la sesión: un vendedor va a /vendedor
      await login({ email: seller.email, password: seller.password });
    } catch (cause) {
      setError(getErrorMessage(cause));
      setBusy(false);
    }
  };

  return (
    <div className="space-y-space-xs rounded-xl border border-dashed border-outline-variant p-space-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-outline">
        Solo desarrollo · temporal
      </p>
      <button
        type="button"
        onClick={enter}
        disabled={busy}
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-outline-variant px-4 text-label-md text-on-surface transition-colors hover:bg-surface-variant disabled:cursor-not-allowed disabled:opacity-70"
      >
        <Icon name="storefront" className="text-[18px]" />
        {busy ? 'Entrando…' : 'Entrar como vendedor de demostración'}
      </button>
      {error && (
        <p role="alert" className="text-body-sm text-incompatible">
          {error}
        </p>
      )}
    </div>
  );
}
