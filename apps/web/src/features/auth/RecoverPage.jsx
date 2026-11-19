import { forgotBodySchema } from '@hw/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import { ApiError, getErrorMessage } from '../../shared/api/client.js';
import { PLATFORM_NAME } from '../../shared/config.js';
import Icon from '../../shared/ui/Icon.jsx';
import AuthShell from './AuthShell.jsx';
import { FormAlert, SubmitButton, TextField } from './fields.jsx';
import { requestPasswordReset } from './recovery.js';

/** Segundos que hay que esperar para pedir otro enlace. */
export const RESEND_SECONDS = 60;

const formSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Escribe tu correo electrónico')
    .pipe(forgotBodySchema.shape.email),
});

const privacyNote = (
  <>
    Tratamos tus datos según la política de privacidad (Ley 1581 de 2012).{' '}
    <Link to="/terminos" className="underline hover:text-on-surface">
      Términos
    </Link>
    {' · '}
    <Link to="/privacidad" className="underline hover:text-on-surface">
      Privacidad
    </Link>
  </>
);

/**
 * TEMPORAL, solo para desarrollo: muestra el enlace de restablecimiento simulado, porque aún no hay
 * servicio de correo. Solo existe con `VITE_USE_MOCKS=true`. Se borra cuando haya backend real.
 */
function DevResetLink({ email, version }) {
  const [token, setToken] = useState(null);
  const enabled = import.meta.env.VITE_USE_MOCKS === 'true';

  useEffect(() => {
    if (!enabled) return undefined;
    let active = true;
    import('../../mocks/auth.js').then((mock) => {
      if (active) setToken(mock.getMockResetToken(email));
    });
    return () => {
      active = false;
    };
  }, [enabled, email, version]);

  if (!enabled || !token) return null;
  return (
    <div className="space-y-space-xs rounded-xl border border-dashed border-outline-variant p-space-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-outline">
        Solo desarrollo · temporal
      </p>
      <p className="text-body-sm text-on-surface-variant">
        Aún no hay servicio de correo. Este es el enlace que llegaría al correo:
      </p>
      <Link
        to={`/restablecer?token=${encodeURIComponent(token)}`}
        className="inline-flex min-h-11 items-center gap-1 break-all text-label-md text-primary hover:underline"
      >
        <Icon name="link" className="text-[18px]" />
        Abrir enlace de restablecimiento
      </Link>
    </div>
  );
}

const tips = [
  'Revisa la carpeta de spam, correo no deseado o promociones.',
  'Comprueba que escribiste bien tu correo.',
  'El enlace es de un solo uso: si pides otro, usa el más reciente.',
];

function SentView({ email, onChangeEmail, resendSeconds }) {
  const [seconds, setSeconds] = useState(resendSeconds);
  const [version, setVersion] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [resent, setResent] = useState(false);

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  const resend = async () => {
    setBusy(true);
    setError(null);
    try {
      await requestPasswordReset(email);
      setResent(true);
      setVersion((value) => value + 1);
      setSeconds(resendSeconds);
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.userMessage : getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      title="Revisa tu correo"
      description={`Si existe una cuenta con ${email}, te enviamos un enlace para restablecer tu contraseña.`}
      footer={
        <Link
          to="/ingresar"
          className="inline-flex min-h-11 items-center gap-1 text-label-md font-semibold text-primary hover:underline"
        >
          <Icon name="arrow_back" className="text-[16px]" />
          Volver al inicio de sesión
        </Link>
      }
      note={privacyNote}
    >
      <div className="space-y-space-md">
        <div className="flex items-start gap-space-sm rounded-xl bg-surface p-space-sm">
          <Icon name="mark_email_read" className="mt-0.5 text-[24px] text-primary" />
          <p className="text-body-sm text-on-surface-variant">
            Por seguridad no confirmamos si un correo tiene cuenta: verás este mismo mensaje en
            cualquier caso.
          </p>
        </div>

        <ul aria-label="Si no te llega el correo" className="space-y-space-xs">
          {tips.map((tip) => (
            <li key={tip} className="flex items-start gap-1.5 text-body-sm text-on-surface-variant">
              <Icon name="check" className="mt-0.5 text-[16px] text-compatible" />
              {tip}
            </li>
          ))}
        </ul>

        <FormAlert>{error}</FormAlert>
        {resent && !error && (
          <p role="status" className="text-body-sm text-compatible">
            Enviamos otro enlace.
          </p>
        )}

        <button
          type="button"
          onClick={resend}
          disabled={seconds > 0 || busy}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-container text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Icon name="replay" className="text-[18px]" />
          {busy
            ? 'Enviando…'
            : seconds > 0
              ? `Reenviar enlace (espera ${seconds} s)`
              : 'Reenviar enlace'}
        </button>
        <button
          type="button"
          onClick={onChangeEmail}
          className="flex min-h-11 w-full items-center justify-center text-label-md text-primary hover:underline"
        >
          Cambiar correo
        </button>

        <DevResetLink email={email} version={version} />
      </div>
    </AuthShell>
  );
}

/** Recuperar contraseña (/recuperar): pide el enlace de restablecimiento con POST /auth/forgot. */
export default function RecoverPage({ resendSeconds = RESEND_SECONDS }) {
  const [sentTo, setSentTo] = useState(null);
  const [draftEmail, setDraftEmail] = useState('');
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(formSchema), defaultValues: { email: draftEmail } });

  useEffect(() => {
    document.title = `Recuperar contraseña · ${PLATFORM_NAME}`;
  }, []);

  const onSubmit = async ({ email }) => {
    setServerError(null);
    try {
      await requestPasswordReset(email);
      setDraftEmail(email);
      setSentTo(email);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.userMessage : getErrorMessage(error));
    }
  };

  if (sentTo) {
    return (
      <SentView
        email={sentTo}
        onChangeEmail={() => setSentTo(null)}
        resendSeconds={resendSeconds}
      />
    );
  }

  return (
    <AuthShell
      title="Recuperar contraseña"
      description={`Escribe el correo de tu cuenta de ${PLATFORM_NAME} y te enviaremos un enlace para crear una contraseña nueva.`}
      footer={
        <div className="flex flex-wrap items-center justify-center gap-x-space-md">
          <Link
            to="/ingresar"
            className="inline-flex min-h-11 items-center gap-1 text-label-md font-semibold text-primary hover:underline"
          >
            <Icon name="arrow_back" className="text-[16px]" />
            ¿Recordaste tu contraseña? Ingresar
          </Link>
          <Link
            to="/registro"
            className="inline-flex min-h-11 items-center gap-1 text-label-md font-semibold text-primary hover:underline"
          >
            Crear cuenta nueva
            <Icon name="person_add" className="text-[16px]" />
          </Link>
        </div>
      }
      note={privacyNote}
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-space-md">
        <TextField
          id="email"
          label="Correo electrónico"
          icon="mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="tucorreo@ejemplo.com"
          error={errors.email?.message}
          registration={register('email')}
        />
        <FormAlert>{serverError}</FormAlert>
        <SubmitButton busy={isSubmitting} busyLabel="Enviando…" icon="send">
          Enviar enlace de recuperación
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
