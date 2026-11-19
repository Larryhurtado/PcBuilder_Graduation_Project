import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import { ApiError, getErrorMessage } from '../../shared/api/client.js';
import { convertToSeller } from '../../shared/session/actions.js';
import { useSession } from '../../shared/session/useSession.js';
import Container from '../../shared/ui/Container.jsx';
import Icon from '../../shared/ui/Icon.jsx';
import { Field, FormAlert, SubmitButton, TextField } from '../auth/fields.jsx';
import { updateMyStore } from './api.js';
import { LOCATIONS, OTHER_LOCATION, OTHER_LOCATION_LABEL, resolveLocation } from './locations.js';

const NIT_PATTERN = /^[0-9]{8,10}-[0-9]$/;

/** Mismas reglas del contrato (convertBodySchema y updateStoreBodySchema), con mensajes propios. */
const formSchema = z
  .object({
    legalName: z
      .string()
      .trim()
      .min(2, 'Escribe la razón social de la empresa')
      .max(200, 'Máximo 200 caracteres'),
    tradeName: z
      .string()
      .trim()
      .min(2, 'Escribe el nombre comercial de tu tienda')
      .max(120, 'Máximo 120 caracteres'),
    // Acepta el NIT con puntos o espacios ("900.234.567-8") y lo normaliza ("900234567-8")
    nit: z
      .string()
      .trim()
      .min(1, 'Escribe el NIT con su dígito de verificación')
      .transform((value) => value.replace(/[.\s]/g, ''))
      .pipe(z.string().regex(NIT_PATTERN, 'NIT con dígito de verificación, p. ej. 900234567-8')),
    location: z.string().min(1, 'Elige tu ciudad y centro comercial'),
    otherCity: z.string().trim().max(80, 'Máximo 80 caracteres').optional(),
    otherDepartment: z.string().trim().max(80, 'Máximo 80 caracteres').optional(),
    address: z
      .string()
      .trim()
      .min(3, 'Escribe la dirección o el número de local')
      .max(200, 'Máximo 200 caracteres'),
    // Los 10 dígitos del celular, sin el +57
    whatsapp: z
      .string()
      .trim()
      .min(1, 'Escribe el WhatsApp comercial de ventas')
      .transform((value) => value.replace(/[\s-]/g, ''))
      .pipe(z.string().regex(/^3[0-9]{9}$/, 'Celular colombiano: 10 dígitos que empiezan en 3')),
    certify: z.literal(true, {
      error: 'Debes certificar que representas a una persona jurídica',
    }),
  })
  .superRefine((data, ctx) => {
    if (data.location !== OTHER_LOCATION) return;
    if (!data.otherCity || data.otherCity.length < 2) {
      ctx.addIssue({ code: 'custom', path: ['otherCity'], message: 'Escribe la ciudad' });
    }
    if (!data.otherDepartment || data.otherDepartment.length < 2) {
      ctx.addIssue({
        code: 'custom',
        path: ['otherDepartment'],
        message: 'Escribe el departamento',
      });
    }
  });

const selectClass =
  'h-12 w-full rounded-xl border bg-surface px-3 text-body-md text-on-surface focus:outline-none focus:ring-3';
const okBorder =
  'border-outline-variant focus:border-primary-container focus:ring-primary-container/25';
const badBorder = 'border-incompatible focus:border-incompatible focus:ring-incompatible/25';

function SoonTag() {
  return (
    <span className="rounded bg-surface px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-outline">
      Próximamente
    </span>
  );
}

function Panel({ icon, tone, title, children, actions }) {
  return (
    <div className="space-y-space-md rounded-2xl bg-surface-container p-space-lg md:p-space-xl">
      <div className="flex items-start gap-space-sm">
        <Icon name={icon} className={`mt-0.5 text-[28px] ${tone}`} />
        <div className="space-y-1">
          <h3 className="text-headline-sm text-on-surface">{title}</h3>
          <div className="space-y-space-xs text-body-md text-on-surface-variant">{children}</div>
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-space-xs">{actions}</div>}
    </div>
  );
}

const primaryLink =
  'inline-flex h-12 items-center rounded-xl bg-primary-container px-5 text-label-md text-on-primary-container transition-colors hover:bg-primary-container/90';
const secondaryLink =
  'inline-flex h-12 items-center rounded-xl border border-outline-variant px-5 text-label-md text-on-surface transition-colors hover:bg-surface-variant';

/**
 * Solicitud para convertirse en vendedor. Primero convierte la cuenta (POST /seller/convert, que da
 * un token nuevo con rol de vendedor) y luego guarda los datos del negocio (PATCH /seller/store).
 * Si el segundo paso falla, la cuenta ya es de vendedor y se pide completar el resto en "Ajustes de tienda".
 */
export default function ApplicationForm() {
  const { user } = useSession();
  // 'idle' | 'busy' | 'done' | 'partial': durante 'busy' el rol cambia a vendedor pero el formulario
  // sigue en pantalla hasta terminar
  const [phase, setPhase] = useState('idle');
  const [partialMessage, setPartialMessage] = useState('');
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(formSchema),
    mode: 'onTouched',
    defaultValues: {
      legalName: '',
      tradeName: '',
      nit: '',
      location: '',
      otherCity: '',
      otherDepartment: '',
      address: '',
      whatsapp: '',
      certify: false,
    },
  });
  const location = useWatch({ control, name: 'location' });

  const onSubmit = async (values) => {
    setPhase('busy');
    setServerError(null);
    try {
      await convertToSeller({ legalName: values.legalName, tradeName: values.tradeName });
    } catch (error) {
      setServerError(error instanceof ApiError ? error.userMessage : getErrorMessage(error));
      setPhase('idle');
      return;
    }
    try {
      await updateMyStore({
        nit: values.nit,
        whatsappE164: `+57${values.whatsapp}`,
        address: values.address,
        ...resolveLocation(values),
      });
      setPhase('done');
    } catch (error) {
      setPartialMessage(getErrorMessage(error));
      setPhase('partial');
    }
  };

  let content;
  if (phase === 'done') {
    content = (
      <Panel
        icon="check_circle"
        tone="text-compatible"
        title="¡Solicitud radicada!"
        actions={
          <>
            <Link to="/vendedor/verificacion" className={primaryLink}>
              Ver el estado de verificación
            </Link>
            <Link to="/vendedor/negocio" className={secondaryLink}>
              Completar mi negocio
            </Link>
          </>
        }
      >
        <p>
          Tu cuenta ya es de vendedor y los datos de tu comercio quedaron guardados. El siguiente
          paso es la verificación: un administrador revisará tu comercio antes de que puedas
          publicar ofertas.
        </p>
      </Panel>
    );
  } else if (phase === 'partial') {
    content = (
      <Panel
        icon="warning"
        tone="text-unverifiable"
        title="Tu cuenta ya es de vendedor, pero faltan datos"
        actions={
          <Link to="/vendedor/negocio" className={primaryLink}>
            Completar mi negocio
          </Link>
        }
      >
        <p>
          Creamos tu cuenta de vendedor, pero no pudimos guardar los datos del comercio.{' '}
          {partialMessage} Complétalos en «Ajustes de tienda».
        </p>
      </Panel>
    );
  } else if (phase === 'idle' && user && user.role !== 'buyer') {
    content = (
      <Panel
        icon="storefront"
        tone="text-primary"
        title={
          user.role === 'seller'
            ? 'Tu cuenta ya es de vendedor'
            : 'Esta solicitud es para cuentas de comprador'
        }
        actions={
          user.role === 'seller' && (
            <>
              <Link to="/vendedor" className={primaryLink}>
                Ir a mi panel
              </Link>
              <Link to="/vendedor/verificacion" className={secondaryLink}>
                Ver la verificación
              </Link>
            </>
          )
        }
      >
        <p>
          {user.role === 'seller'
            ? 'No necesitas postularte de nuevo. Revisa el estado de verificación de tu comercio o completa los datos de tu negocio.'
            : 'Las cuentas de administrador no pueden convertirse en vendedoras.'}
        </p>
      </Panel>
    );
  } else {
    const guest = !user;
    const next = encodeURIComponent('/vender');
    content = (
      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="space-y-space-md rounded-2xl bg-surface-container p-space-lg md:p-space-xl"
      >
        {guest && (
          <p
            role="note"
            className="flex flex-wrap items-center gap-x-1 gap-y-1 rounded-xl bg-surface p-space-sm text-body-sm text-on-surface"
          >
            <Icon name="info" className="mr-1 text-[18px] text-primary" />
            Para radicar la solicitud necesitas una cuenta.
            <Link to={`/ingresar?next=${next}`} className="font-semibold text-primary underline">
              Ingresa
            </Link>
            o
            <Link to={`/registro?next=${next}`} className="font-semibold text-primary underline">
              crea una cuenta
            </Link>
            y vuelve a este formulario.
          </p>
        )}

        <fieldset disabled={guest} className="space-y-space-md">
          <legend className="sr-only">Datos de tu empresa</legend>
          <div className="grid gap-space-md md:grid-cols-2">
            <TextField
              id="legalName"
              label="Razón social de la empresa"
              icon="business"
              autoComplete="organization"
              placeholder="Ej. Soluciones SAS"
              error={errors.legalName?.message}
              registration={register('legalName')}
            />
            <TextField
              id="tradeName"
              label="Nombre comercial de la tienda"
              icon="storefront"
              placeholder="Como te conocen tus clientes"
              error={errors.tradeName?.message}
              registration={register('tradeName')}
            />
            <TextField
              id="nit"
              label="NIT (con dígito de verificación)"
              icon="badge"
              inputMode="numeric"
              placeholder="900.234.567-8"
              error={errors.nit?.message}
              registration={register('nit')}
            />
            <TextField
              id="whatsapp"
              label="WhatsApp comercial de ventas (+57)"
              icon="call"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="310 123 4567"
              error={errors.whatsapp?.message}
              registration={register('whatsapp')}
            />
            <Field
              id="location"
              label="Ciudad principal y centro comercial"
              error={errors.location?.message}
            >
              <select
                id="location"
                aria-invalid={Boolean(errors.location)}
                aria-describedby={errors.location ? 'location-error' : undefined}
                className={`${selectClass} ${errors.location ? badBorder : okBorder}`}
                {...register('location')}
              >
                <option value="">Selecciona tu ubicación</option>
                {LOCATIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
                <option value={OTHER_LOCATION}>{OTHER_LOCATION_LABEL}</option>
              </select>
            </Field>
            <TextField
              id="address"
              label="Dirección o número de local"
              icon="location_on"
              autoComplete="street-address"
              placeholder="Ej. Local 77, C.C. Unilago"
              error={errors.address?.message}
              registration={register('address')}
            />
            {location === OTHER_LOCATION && (
              <>
                <TextField
                  id="otherCity"
                  label="Ciudad"
                  icon="location_city"
                  placeholder="Ej. Bucaramanga"
                  error={errors.otherCity?.message}
                  registration={register('otherCity')}
                />
                <TextField
                  id="otherDepartment"
                  label="Departamento"
                  icon="map"
                  placeholder="Ej. Santander"
                  error={errors.otherDepartment?.message}
                  registration={register('otherDepartment')}
                />
              </>
            )}
            <TextField
              id="corporateEmail"
              label="Correo electrónico corporativo"
              icon="mail"
              type="email"
              action={<SoonTag />}
              disabled
              placeholder="ventas@tutienda.com.co"
              registration={{}}
            />
            <TextField
              id="website"
              label="Sitio web o catálogo actual (opcional)"
              icon="language"
              action={<SoonTag />}
              disabled
              placeholder="https://tutienda.com"
              registration={{}}
            />
          </div>

          <div className="space-y-1">
            <label className="flex cursor-pointer items-start gap-space-sm py-1 text-body-sm text-on-surface-variant">
              <input
                type="checkbox"
                aria-invalid={Boolean(errors.certify)}
                aria-describedby={errors.certify ? 'certify-error' : undefined}
                className="mt-0.5 h-5 w-5 shrink-0 accent-primary-container"
                {...register('certify')}
              />
              <span>
                Certifico que represento a una{' '}
                <strong className="font-semibold text-on-surface">persona jurídica</strong>{' '}
                legalmente constituida ante Cámara de Comercio en Colombia, facultada para expedir
                facturación electrónica DIAN y garantizar la autenticidad de los componentes
                informáticos.
              </span>
            </label>
            {errors.certify && (
              <p
                id="certify-error"
                className="flex items-start gap-1 text-body-sm text-incompatible"
              >
                <Icon name="error" className="mt-0.5 text-[16px]" />
                <span>{errors.certify.message}</span>
              </p>
            )}
          </div>

          <FormAlert>{serverError}</FormAlert>

          <div className="flex flex-col items-start justify-between gap-space-sm md:flex-row md:items-center">
            <p className="text-body-sm text-outline">
              Paso 1 de 2: la carga de los documentos en PDF llegará más adelante (próximamente).
            </p>
            <div className="w-full md:w-auto md:min-w-72">
              <SubmitButton
                busy={phase === 'busy'}
                busyLabel="Radicando tu solicitud…"
                icon="badge"
              >
                Radicar solicitud de vendedor
              </SubmitButton>
            </div>
          </div>
        </fieldset>
      </form>
    );
  }

  return (
    <Container
      as="section"
      id="postulacion"
      aria-labelledby="postulacion-titulo"
      className="scroll-mt-24 py-space-2xl"
    >
      <div className="mx-auto mb-space-lg max-w-3xl space-y-space-xs text-center">
        <p className="text-label-sm uppercase tracking-wider text-secondary">
          Formulario de postulación inicial
        </p>
        <h2
          id="postulacion-titulo"
          className="text-headline-md text-on-surface md:text-headline-lg"
        >
          Comienza la auditoría de tu establecimiento
        </h2>
        <p className="text-body-md text-on-surface-variant">
          Completa los datos preliminares de tu empresa. Con ellos convertimos tu cuenta en una
          cuenta de vendedor.
        </p>
      </div>
      <div className="mx-auto max-w-4xl">{content}</div>
    </Container>
  );
}
