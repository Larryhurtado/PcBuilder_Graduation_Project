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

/**
 * Reglas del contrato (registerBodySchema) con mensajes propios para los campos vacíos, más la
 * confirmación de la contraseña, que existe solo en el formulario (el servidor no la recibe).
 */
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
  confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  acceptTerms: registerBodySchema.shape.acceptTerms,
});

const schemaResolver = zodResolver(formSchema);

/**
 * Valida con el esquema y además comprueba que las dos contraseñas coincidan. La coincidencia no
 * va dentro del esquema (`.refine`) porque Zod la omite mientras otro campo sea inválido, y
 * entonces el aviso no saldría al salir del campo de confirmación.
 */
const resolver = async (values, context, options) => {
  const result = await schemaResolver(values, context, options);
  const mismatch =
    values.confirmPassword && values.password !== values.confirmPassword
      ? { type: 'validate', message: 'Las contraseñas no coinciden' }
      : null;
  if (!mismatch || result.errors?.confirmPassword) return result;
  return { values: {}, errors: { ...result.errors, confirmPassword: mismatch } };
};

/** Requisitos de la contraseña: los tres del servidor (8 a 72, una letra, un número) y la coincidencia. */
const passwordRules = [
  {
    id: 'length',
    label: 'Entre 8 y 72 caracteres',
    test: (password) => password.length >= 8 && password.length <= 72,
  },
  { id: 'letter', label: 'Al menos una letra', test: (password) => /[A-Za-z]/.test(password) },
  { id: 'number', label: 'Al menos un número', test: (password) => /[0-9]/.test(password) },
  {
    id: 'match',
    label: 'Las dos contraseñas coinciden',
    test: (password, confirm) => confirm.length > 0 && password === confirm,
  },
];

function PasswordRules({ password, confirm }) {
  return (
    <ul
      id="password-rules"
      aria-label="Requisitos de la contraseña"
      className="grid gap-1 rounded-xl bg-surface p-space-sm text-body-sm"
    >
      {passwordRules.map((rule) => {
        const met = rule.test(password, confirm);
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
    trigger,
    control,
    formState: { errors, touchedFields, isSubmitting },
  } = useForm({
    resolver,
    // Valida cada campo al salir de él y, desde entonces, mientras se corrige
    mode: 'onTouched',
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  });
  const password = useWatch({ control, name: 'password' }) ?? '';
  const confirmPassword = useWatch({ control, name: 'confirmPassword' }) ?? '';

  useEffect(() => {
    document.title = `Crear cuenta · ${PLATFORM_NAME}`;
  }, []);

  // Con sesión (recién creada o ya existente) se sale de esta pantalla
  if (user) return <Navigate to={next ?? homeForRole(user.role)} replace />;

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      // La confirmación no se envía: el servidor solo recibe los campos del contrato
      await registerAccount({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        acceptTerms: values.acceptTerms,
      });
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
        <div className="space-y-space-md">
          <PasswordField
            autoComplete="new-password"
            error={errors.password?.message}
            describedBy="password-rules"
            registration={register('password', {
              // Si ya se tocó la confirmación, se revisa de nuevo al cambiar la contraseña
              onChange: () => touchedFields.confirmPassword && trigger('confirmPassword'),
            })}
          />
          <PasswordField
            id="confirmPassword"
            label="Confirmar contraseña"
            toggleName="confirmación de contraseña"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            describedBy="password-rules"
            registration={register('confirmPassword')}
          />
          <PasswordRules password={password} confirm={confirmPassword} />
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
