import { errorCodes, registerBodySchema } from '@hw/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, Navigate, useSearchParams } from 'react-router';
import { z } from 'zod';
import { ApiError, getErrorMessage } from '../../shared/api/client.js';
import { PLATFORM_NAME } from '../../shared/config.js';
import { register as registerAccount } from '../../shared/session/actions.js';
import { homeForRole, safeNext } from '../../shared/session/redirect.js';
import { useSession } from '../../shared/session/useSession.js';
import Icon from '../../shared/ui/Icon.jsx';
import AuthShell from './AuthShell.jsx';
import { FormAlert, PasswordField, SubmitButton, TextField } from './fields.jsx';

/** Reglas del contrato (registerBodySchema) con mensajes propios para los campos vacíos. */
const formSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Escribe tu nombre (mínimo 2 caracteres)')
    .max(120, 'Máximo 120 caracteres'),
  email: z
    .string()
    .trim()
    .min(1, 'Escribe tu correo electrónico')
    .pipe(registerBodySchema.shape.email),
  password: z.string().min(1, 'Escribe una contraseña').pipe(registerBodySchema.shape.password),
  acceptTerms: registerBodySchema.shape.acceptTerms,
});

/** Requisitos de la contraseña, los mismos que valida el servidor (8 a 72, una letra y un número). */
const passwordRules = [
  { id: 'length', label: 'Entre 8 y 72 caracteres', test: (v) => v.length >= 8 && v.length <= 72 },
  { id: 'letter', label: 'Al menos una letra', test: (v) => /[A-Za-z]/.test(v) },
  { id: 'number', label: 'Al menos un número', test: (v) => /[0-9]/.test(v) },
];

function PasswordRules({ value }) {
  return (
    <ul
      id="password-rules"
      aria-label="Requisitos de la contraseña"
      className="grid gap-1 rounded-xl bg-surface p-space-sm text-body-sm"
    >
      {passwordRules.map((rule) => {
        const met = rule.test(value);
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-1.5 ${met ? 'text-compatible' : 'text-on-surface-variant'}`}
          >
            <Icon name={met ? 'check_circle' : 'radio_button_unchecked'} className="text-[18px]" />
            <span>{rule.label}</span>
            <span className="sr-only">{met ? '(cumplido)' : '(pendiente)'}</span>
          </li>
        );
      })}
    </ul>
  );
}

/** Registro (/registro): crea la cuenta con POST /auth/register y deja la sesión abierta. */
export default function RegisterPage() {
  const { user } = useSession();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { fullName: '', email: '', password: '', acceptTerms: false },
  });
  const password = useWatch({ control, name: 'password' }) ?? '';

  useEffect(() => {
    document.title = `Crear cuenta · ${PLATFORM_NAME}`;
  }, []);

  // Con sesión (recién creada o ya existente) se sale de esta pantalla
  if (user) return <Navigate to={next ?? homeForRole(user.role)} replace />;

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      await registerAccount(values);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'EMAIL_TAKEN') {
        setError('email', { type: 'taken', message: errorCodes.EMAIL_TAKEN.message });
      } else {
        setServerError(error instanceof ApiError ? error.userMessage : getErrorMessage(error));
      }
    }
  };

  const loginLink = next ? `/ingresar?next=${encodeURIComponent(next)}` : '/ingresar';
  const emailError =
    errors.email?.type === 'taken' ? (
      <>
        {errors.email.message}{' '}
        <Link to={loginLink} className="font-semibold underline">
          Ingresar
        </Link>
      </>
    ) : (
      errors.email?.message
    );

  return (
    <AuthShell
      title={`Crea tu cuenta en ${PLATFORM_NAME}`}
      description="Guarda tus armados, compara ofertas de tiendas verificadas en Colombia y valida la compatibilidad de tus componentes."
      footer={
        <>
          <p className="text-body-sm text-on-surface-variant">¿Ya tienes una cuenta registrada?</p>
          <Link
            to={loginLink}
            className="inline-flex min-h-11 items-center gap-1 text-label-md font-semibold text-primary hover:underline"
          >
            Ingresar a tu cuenta
            <Icon name="arrow_forward" className="text-[16px]" />
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-space-md">
        <TextField
          id="fullName"
          label="Nombre y apellido"
          icon="badge"
          type="text"
          autoComplete="name"
          placeholder="Tu nombre completo"
          error={errors.fullName?.message}
          registration={register('fullName')}
        />
        <TextField
          id="email"
          label="Correo electrónico"
          icon="mail"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="tucorreo@ejemplo.com"
          error={emailError}
          registration={register('email')}
        />
        <div className="space-y-space-xs">
          <PasswordField
            autoComplete="new-password"
            error={errors.password?.message}
            describedBy="password-rules"
            registration={register('password')}
          />
          <PasswordRules value={password} />
        </div>

        <div className="space-y-1">
          <label className="flex cursor-pointer items-start gap-space-sm py-1 text-body-sm text-on-surface-variant">
            <input
              type="checkbox"
              aria-invalid={Boolean(errors.acceptTerms)}
              aria-describedby={errors.acceptTerms ? 'acceptTerms-error' : undefined}
              className="mt-0.5 h-5 w-5 shrink-0 accent-primary-container"
              {...register('acceptTerms')}
            />
            <span>
              Acepto los{' '}
              <Link
                to="/terminos"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Términos y Condiciones
              </Link>{' '}
              y autorizo el tratamiento de mis datos personales según la{' '}
              <Link
                to="/privacidad"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                Política de Privacidad
              </Link>{' '}
              (Ley 1581 de 2012).
            </span>
          </label>
          {errors.acceptTerms && (
            <p
              id="acceptTerms-error"
              className="flex items-start gap-1 text-body-sm text-incompatible"
            >
              <Icon name="error" className="mt-0.5 text-[16px]" />
              <span>{errors.acceptTerms.message}</span>
            </p>
          )}
        </div>

        <FormAlert>{serverError}</FormAlert>
        <SubmitButton busy={isSubmitting} busyLabel="Creando tu cuenta…">
          Crear cuenta en {PLATFORM_NAME}
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
