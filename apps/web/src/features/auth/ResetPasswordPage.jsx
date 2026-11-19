import { resetBodySchema } from '@hw/contracts';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link, useSearchParams } from 'react-router';
import { z } from 'zod';
import { ApiError, getErrorMessage } from '../../shared/api/client.js';
import { PLATFORM_NAME } from '../../shared/config.js';
import Icon from '../../shared/ui/Icon.jsx';
import AuthShell from './AuthShell.jsx';
import { FormAlert, PasswordField, SubmitButton } from './fields.jsx';
import { PasswordRules, withPasswordMatch } from './passwordForm.jsx';
import { resetPassword } from './recovery.js';

const formSchema = z.object({
  password: z.string().min(1, 'Escribe una contraseña').pipe(resetBodySchema.shape.password),
  confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
});

const resolver = withPasswordMatch(zodResolver(formSchema));

const linkButton =
  'flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary-container text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90';

/** El enlace del correo no sirve (falta el token, venció o ya se usó). */
function InvalidLink() {
  return (
    <AuthShell
      title="El enlace no es válido"
      description="El enlace de recuperación no es válido o venció. Pide uno nuevo para continuar."
      footer={
        <Link
          to="/ingresar"
          className="inline-flex min-h-11 items-center gap-1 text-label-md font-semibold text-primary hover:underline"
        >
          <Icon name="arrow_back" className="text-[16px]" />
          Volver al inicio de sesión
        </Link>
      }
    >
      <Link to="/recuperar" className={linkButton}>
        Pedir un enlace nuevo
        <Icon name="send" className="text-[18px]" />
      </Link>
    </AuthShell>
  );
}

/** Restablecer contraseña (/restablecer?token=…): la contraseña nueva, con POST /auth/reset. */
export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token')?.trim() ?? '';
  const [serverError, setServerError] = useState(null);
  const [tokenRejected, setTokenRejected] = useState(false);
  const [done, setDone] = useState(false);

  const {
    register,
    handleSubmit,
    trigger,
    control,
    formState: { errors, touchedFields, isSubmitting },
  } = useForm({
    resolver,
    mode: 'onTouched',
    defaultValues: { password: '', confirmPassword: '' },
  });
  const password = useWatch({ control, name: 'password' }) ?? '';
  const confirmPassword = useWatch({ control, name: 'confirmPassword' }) ?? '';

  useEffect(() => {
    document.title = `Nueva contraseña · ${PLATFORM_NAME}`;
  }, []);

  if (!token || tokenRejected) return <InvalidLink />;

  if (done) {
    return (
      <AuthShell
        title="Contraseña actualizada"
        description="Ya puedes ingresar con tu contraseña nueva."
      >
        <Link to="/ingresar" className={linkButton}>
          Ingresar
          <Icon name="arrow_forward" className="text-[18px]" />
        </Link>
      </AuthShell>
    );
  }

  const onSubmit = async (values) => {
    setServerError(null);
    try {
      // La confirmación no se envía: el servidor solo recibe los campos del contrato
      await resetPassword({ token, password: values.password });
      setDone(true);
    } catch (error) {
      if (error instanceof ApiError && error.code === 'INVALID_RESET_TOKEN') {
        setTokenRejected(true);
        return;
      }
      setServerError(error instanceof ApiError ? error.userMessage : getErrorMessage(error));
    }
  };

  return (
    <AuthShell
      title="Crea tu nueva contraseña"
      description="Elige una contraseña nueva para tu cuenta. Cuando la guardes, el enlace deja de servir."
      footer={
        <Link
          to="/ingresar"
          className="inline-flex min-h-11 items-center gap-1 text-label-md font-semibold text-primary hover:underline"
        >
          <Icon name="arrow_back" className="text-[16px]" />
          Volver al inicio de sesión
        </Link>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-space-md">
        <PasswordField
          label="Contraseña nueva"
          toggleName="contraseña nueva"
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
          label="Confirmar contraseña nueva"
          toggleName="confirmación de contraseña"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          describedBy="password-rules"
          registration={register('confirmPassword')}
        />
        <PasswordRules password={password} confirm={confirmPassword} />
        <FormAlert>{serverError}</FormAlert>
        <SubmitButton busy={isSubmitting} busyLabel="Guardando…" icon="check">
          Guardar contraseña nueva
        </SubmitButton>
      </form>
    </AuthShell>
  );
}
