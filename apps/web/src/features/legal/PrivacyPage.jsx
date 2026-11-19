import { PRIVACY_POLICY_VERSION } from '@hw/contracts';
import { PLATFORM_NAME } from '../../shared/config.js';
import LegalPage, { Pending } from './LegalPage.jsx';

const sections = [
  {
    id: 'responsable',
    title: 'Quién trata tus datos',
    body: (
      <>
        <p>
          {PLATFORM_NAME} es una plataforma educativa que agrega ofertas de tiendas de hardware y
          verifica la compatibilidad de los componentes. El responsable del tratamiento de los datos
          personales es <Pending>nombre del responsable por definir</Pending>.
        </p>
        <p>
          Contacto para consultas sobre tus datos: <Pending>correo de contacto por definir</Pending>
          .
        </p>
      </>
    ),
  },
  {
    id: 'datos',
    title: 'Qué datos recogemos',
    body: (
      <ul>
        <li>
          <strong>Tu cuenta:</strong> nombre, correo electrónico y contraseña. La contraseña se
          guarda cifrada, nunca en texto legible.
        </li>
        <li>
          <strong>Lo que guardas:</strong> tus armados guardados y tus componentes favoritos.
        </li>
        <li>
          <strong>Si eres vendedor:</strong> razón social, nombre comercial, NIT, dirección, ciudad
          y el WhatsApp comercial de tu negocio, que se muestran de forma pública en el perfil de tu
          tienda (la razón social y el NIT no se muestran).
        </li>
        <li>
          <strong>Uso de las ofertas:</strong> registramos las visitas a las ofertas y los clics al
          WhatsApp de la tienda para mostrar estadísticas a los vendedores.{' '}
          <Pending>detalle de qué se almacena de cada visita por definir</Pending>
        </li>
      </ul>
    ),
  },
  {
    id: 'finalidades',
    title: 'Para qué usamos tus datos',
    body: (
      <ul>
        <li>Crear y mantener tu cuenta, y mantener tu sesión iniciada.</li>
        <li>Guardar tus armados y favoritos, y poder compartir un armado con un enlace.</li>
        <li>Mostrar las tiendas verificadas y permitir que los compradores las contacten.</li>
        <li>Darle a cada vendedor las estadísticas de visitas y clics de sus ofertas.</li>
        <li>Enviarte el enlace para recuperar tu contraseña, cuando lo pides.</li>
        <li>Proteger la plataforma, por ejemplo limitando los intentos repetidos.</li>
      </ul>
    ),
  },
  {
    id: 'derechos',
    title: 'Tus derechos (Ley 1581 de 2012)',
    body: (
      <>
        <p>Como titular de tus datos personales puedes:</p>
        <ul>
          <li>Conocer, actualizar y rectificar tus datos.</li>
          <li>Pedir prueba de la autorización que diste para tratarlos.</li>
          <li>Ser informado del uso que se ha dado a tus datos.</li>
          <li>Revocar la autorización y pedir que se supriman tus datos.</li>
          <li>Presentar quejas ante la Superintendencia de Industria y Comercio.</li>
        </ul>
        <p>
          Para ejercerlos escríbenos a <Pending>correo de contacto por definir</Pending>. La opción
          de eliminar tu cuenta desde «Mi cuenta» todavía no está disponible: aparece como
          «Próximamente».
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies y almacenamiento del navegador',
    body: (
      <>
        <p>
          Usamos una cookie de sesión, que el navegador no deja leer a las páginas, para mantener tu
          sesión iniciada por un tiempo limitado. También guardamos en tu navegador el armado que
          estás haciendo, para que no se pierda si recargas la página.
        </p>
        <p>Esta versión no usa cookies de publicidad ni herramientas de seguimiento de terceros.</p>
      </>
    ),
  },
  {
    id: 'terceros',
    title: 'Terceros y enlaces externos',
    body: (
      <ul>
        <li>
          <strong>WhatsApp:</strong> al pulsar «Contactar por WhatsApp» se abre WhatsApp con la
          tienda. A partir de ahí, la conversación se rige por las políticas de WhatsApp.
        </li>
        <li>
          <strong>Tipografías:</strong> las letras y los iconos se cargan desde Google Fonts, por lo
          que ese servicio recibe tu dirección IP al abrir la página.
        </li>
        <li>
          <strong>Correo:</strong> el servicio que enviará los correos de recuperación de contraseña{' '}
          <Pending>proveedor de correo por definir</Pending>.
        </li>
      </ul>
    ),
  },
  {
    id: 'conservacion',
    title: 'Conservación y seguridad',
    body: (
      <>
        <p>
          Guardamos tus datos mientras tengas la cuenta y el tiempo que la ley exija:{' '}
          <Pending>tiempo de conservación por definir</Pending>.
        </p>
        <p>
          Protegemos las contraseñas con cifrado y limitamos los intentos repetidos de ingreso y de
          recuperación de contraseña.{' '}
          <Pending>medidas adicionales de seguridad por confirmar</Pending>
        </p>
      </>
    ),
  },
  {
    id: 'cambios',
    title: 'Cambios en esta política',
    body: (
      <p>
        Cuando cambie esta política, cambiará su versión. Al crear tu cuenta se registra la versión
        que aceptas. Versión actual: {PRIVACY_POLICY_VERSION}.
      </p>
    ),
  },
];

/** Política de privacidad (/privacidad): borrador del tratamiento de datos personales. */
export default function PrivacyPage() {
  return (
    <LegalPage
      path="/privacidad"
      title="Política de privacidad"
      intro="Qué datos personales tratamos, para qué y cómo puedes ejercer tus derechos."
      version={`Versión ${PRIVACY_POLICY_VERSION}`}
      draft
      sections={sections}
    />
  );
}
