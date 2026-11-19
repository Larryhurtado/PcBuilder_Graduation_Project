import { loginBodySchema } from '@hw/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { ApiError, getErrorMessage } from '../../shared/api/client.js';
import { PLATFORM_NAME } from '../../shared/config.js';
import { login } from '../../shared/session/actions.js';
import { homeForRole, safeNext } from '../../shared/session/redirect.js';
import { useSession } from '../../shared/session/useSession.js';
import Icon from '../../shared/ui/Icon.jsx';
import AuthShell from './AuthShell.jsx';
import DemoSellerShortcut from './DemoSellerShortcut.jsx';
import { FormAlert, PasswordField, SubmitButton, TextField } from './fields.jsx';

/** Mismas reglas del contrato (loginBodySchema) con mensajes propios para los campos vacíos. */
const formSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Escribe tu correo electrónico')
    .pipe(loginBodySchema.shape.email),
  password: z.string().min(1, 'Escribe tu contraseña').max(72, 'Máximo 72 caracteres'),
});

/** Ingresar (/ingresar): correo y contraseña contra POST /auth/login. */
export default function LoginPage() {
  const { user } = useSession();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(formSchema), defaultValues: { email: '', password: '' } });

  useEffect(() => {
    document.title = `Ingresar · ${PLATFORM_NAME}`;
  }, []);

  // Con sesión (recién ingresada o ya existente) se sale de esta pantalla
  if (user) return <Navigate to={next ?? homeForRole(user.role)} replace />;

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      await login(values);
    } catch (error) {
      setServerError(error instanceof ApiError ? error.userMessage : getErrorMessage(error));
    }
  };

  // Conserva el destino al pasar entre ingresar y crear cuenta
  const registerLink = next ? `/registro?next=${encodeURIComponent(next)}` : '/registro';

  return (
    <AuthShell
      title="Ingresar a tu cuenta"
      description="Accede para guardar tus armados y gestionar tu cuenta."
      footer={
        <>
          <p className="text-body-sm text-on-surface-variant">¿Aún no tienes una cuenta?</p>
          <Link
            to={registerLink}
            className="inline-flex min-h-11 items-center gap-1 text-label-md font-semibold text-primary hover:underline"
          >
            Crear cuenta gratis
            <Icon name="arrow_forward" className="text-[16px]" />
          </Link>
        </>
      }
      note={
        <>
          Al ingresar aceptas el tratamiento de tus datos según la política de privacidad (Ley 1581
          de 2012).{' '}
          <Link to="/terminos" className="underline hover:text-on-surface">
            Términos
          </Link>
          {' · '}
          <Link to="/privacidad" className="underline hover:text-on-surface">
            Privacidad
          </Link>
        </>
      }
    >
      {next && (
        <p
          role="note"
          className="flex items-start gap-space-xs rounded-xl bg-surface p-space-sm text-body-sm text-on-surface-variant"
        >
          <Icon name="lock" className="mt-0.5 text-[18px] text-outline" />
          Inicia sesión para continuar.
        </p>
      )}
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
        <PasswordField
          autoComplete="current-password"
          error={errors.password?.message}
          registration={register('password')}
          action={
            <Link
              to="/recuperar"
              className="inline-flex min-h-11 items-center text-label-sm text-primary hover:underline md:min-h-0"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          }
        />
        <FormAlert>{serverError}</FormAlert>
        <SubmitButton busy={isSubmitting} busyLabel="Ingresando…">
          Ingresar
        </SubmitButton>
      </form>
      <DemoSellerShortcut />
    </AuthShell>
  );
}
