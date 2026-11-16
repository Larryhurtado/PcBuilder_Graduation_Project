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
import Container from '../../shared/ui/Container.jsx';
import Icon from '../../shared/ui/Icon.jsx';

/** Mismas reglas del contrato (loginBodySchema) con mensajes propios para los campos vacíos. */
const formSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Escribe tu correo electrónico')
    .pipe(loginBodySchema.shape.email),
  password: z.string().min(1, 'Escribe tu contraseña').max(72, 'Máximo 72 caracteres'),
});

const inputClass =
  'h-12 w-full rounded-xl border bg-surface pl-11 pr-3 text-body-md text-on-surface placeholder:text-outline focus:outline-none focus:ring-3';
const okBorder =
  'border-outline-variant focus:border-primary-container focus:ring-primary-container/25';
const badBorder = 'border-incompatible focus:border-incompatible focus:ring-incompatible/25';

function Field({ id, label, error, action, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-space-sm">
        <label htmlFor={id} className="text-label-md text-on-surface">
          {label}
        </label>
        {action}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} className="flex items-center gap-1 text-body-sm text-incompatible">
          <Icon name="error" className="text-[16px]" />
          {error}
        </p>
      )}
    </div>
  );
}

/** Ingresar (/ingresar): correo y contraseña contra POST /auth/login. */
export default function LoginPage() {
  const { user } = useSession();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [showPassword, setShowPassword] = useState(false);
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

  return (
    <Container className="flex justify-center py-space-xl md:py-space-2xl">
      <div className="w-full max-w-md space-y-space-md">
        <div className="overflow-hidden rounded-2xl bg-surface-container">
          <div className="space-y-space-lg p-space-lg">
            <div className="space-y-space-xs">
              <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
                Ingresar a tu cuenta
              </h1>
              <p className="text-body-md text-on-surface-variant">
                Accede para guardar tus armados y gestionar tu cuenta.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-space-md">
              <Field id="email" label="Correo electrónico" error={errors.email?.message}>
                <div className="relative">
                  <Icon
                    name="mail"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline"
                  />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
                    placeholder="tucorreo@ejemplo.com"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    className={`${inputClass} ${errors.email ? badBorder : okBorder}`}
                    {...register('email')}
                  />
                </div>
              </Field>

              <Field
                id="password"
                label="Contraseña"
                error={errors.password?.message}
                action={
                  <Link
                    to="/recuperar"
                    className="inline-flex min-h-11 items-center text-label-sm text-primary hover:underline md:min-h-0"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                }
              >
                <div className="relative">
                  <Icon
                    name="lock"
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline"
                  />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={errors.password ? 'password-error' : undefined}
                    className={`${inputClass} pr-12 ${errors.password ? badBorder : okBorder}`}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                    aria-pressed={showPassword}
                    className="absolute right-1 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-lg text-outline transition-colors hover:text-on-surface"
                  >
                    <Icon
                      name={showPassword ? 'visibility_off' : 'visibility'}
                      className="text-[20px]"
                    />
                  </button>
                </div>
              </Field>

              {serverError && (
                <p
                  role="alert"
                  className="flex items-start gap-space-xs rounded-xl bg-[color-mix(in_srgb,var(--color-incompatible)_10%,var(--color-surface-container))] p-space-sm text-body-sm text-on-surface"
                >
                  <Icon name="error" className="mt-0.5 text-[18px] text-incompatible" />
                  {serverError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-container text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? (
                  'Ingresando…'
                ) : (
                  <>
                    Ingresar
                    <Icon name="arrow_forward" className="text-[18px]" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="space-y-1 bg-surface-container-low p-space-md text-center">
            <p className="text-body-sm text-on-surface-variant">¿Aún no tienes una cuenta?</p>
            <Link
              to="/registro"
              className="inline-flex min-h-11 items-center gap-1 text-label-md font-semibold text-primary hover:underline"
            >
              Crear cuenta gratis
              <Icon name="arrow_forward" className="text-[16px]" />
            </Link>
          </div>
        </div>

        <p className="px-space-sm text-center text-body-sm text-on-surface-variant">
          Al ingresar aceptas el tratamiento de tus datos según la política de privacidad (Ley 1581
          de 2012).{' '}
          <Link to="/terminos" className="underline hover:text-on-surface">
            Términos
          </Link>
          {' · '}
          <Link to="/privacidad" className="underline hover:text-on-surface">
            Privacidad
          </Link>
        </p>
      </div>
    </Container>
  );
}
