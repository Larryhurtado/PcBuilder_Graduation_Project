import { Link } from 'react-router';
import { PLATFORM_NAME } from '../../shared/config.js';
import LegalPage, { Pending } from './LegalPage.jsx';

const sections = [
  {
    id: 'servicio',
    title: 'Qué es este servicio',
    body: (
      <>
        <p>
          {PLATFORM_NAME} es una plataforma educativa que reúne ofertas de tiendas de hardware de
          Colombia y verifica la compatibilidad de los componentes de un armado.
        </p>
        <p>
          No vendemos ni despachamos componentes, no cobramos comisiones y no procesamos pagos en la
          web.
        </p>
      </>
    ),
  },
  {
    id: 'cuentas',
    title: 'Cuentas',
    body: (
      <ul>
        <li>Para guardar armados o tener favoritos necesitas una cuenta de comprador.</li>
        <li>Los datos que das al registrarte deben ser verdaderos y estar al día.</li>
        <li>
          Tu contraseña es personal: no la compartas. Eres responsable de lo que se haga con tu
          cuenta.
        </li>
        <li>
          Puedes ver cómo tratamos tus datos en la{' '}
          <Link to="/privacidad">política de privacidad</Link>.
        </li>
      </ul>
    ),
  },
  {
    id: 'compatibilidad',
    title: 'Compatibilidad de los armados',
    body: (
      <>
        <p>
          La plataforma evalúa tu armado con reglas de compatibilidad física y eléctrica a partir de
          los datos disponibles de cada componente. Es una ayuda informativa, no una garantía.
        </p>
        <p>
          Cuando falta un dato, la regla se muestra como «No verificable». Antes de comprar,
          confirma la compatibilidad con la tienda.
        </p>
      </>
    ),
  },
  {
    id: 'ofertas',
    title: 'Ofertas y compras',
    body: (
      <ul>
        <li>Cada tienda publica sus propios precios y es responsable de sus ofertas.</li>
        <li>
          La disponibilidad y el precio final se confirman con la tienda. La compra se acuerda
          directamente con ella, por WhatsApp.
        </li>
        <li>
          {PLATFORM_NAME} no interviene en el pago, la entrega ni la garantía de lo que compres.
        </li>
      </ul>
    ),
  },
  {
    id: 'vendedores',
    title: 'Vendedores y verificación',
    body: (
      <ul>
        <li>Solo se publican productos que la tienda realmente tiene.</li>
        <li>
          Las fotos deben ser del producto real; no se aceptan imágenes genéricas de terceros.
        </li>
        <li>
          La verificación confirma que el negocio existe; no garantiza el cumplimiento de sus
          ofertas.
        </li>
        <li>Una cuenta de vendedor puede quedar suspendida si incumple estas condiciones.</li>
      </ul>
    ),
  },
  {
    id: 'uso',
    title: 'Uso adecuado',
    body: (
      <ul>
        <li>
          No uses la plataforma para engañar a otras personas ni para publicar contenido falso.
        </li>
        <li>
          No hagas peticiones masivas o automáticas: hay límites de uso para proteger el servicio.
        </li>
        <li>No intentes entrar a cuentas o datos que no son tuyos.</li>
      </ul>
    ),
  },
  {
    id: 'datos',
    title: 'Datos de los componentes',
    body: (
      <p>
        Las especificaciones técnicas vienen de BuildCores OpenDB y se usan con su licencia. Mira la{' '}
        <Link to="/atribucion">atribución de datos</Link>.
      </p>
    ),
  },
  {
    id: 'responsabilidad',
    title: 'Responsabilidad',
    body: (
      <p>
        <Pending>limitación de responsabilidad por definir con asesoría jurídica</Pending>
      </p>
    ),
  },
  {
    id: 'cambios',
    title: 'Cambios y ley aplicable',
    body: (
      <>
        <p>
          Podemos actualizar estas condiciones.{' '}
          <Pending>forma de aviso de cambios por definir</Pending>
        </p>
        <p>
          Ley aplicable y jurisdicción: <Pending>por definir</Pending>.
        </p>
      </>
    ),
  },
];

/** Términos y condiciones (/terminos): borrador de las condiciones de uso. */
export default function TermsPage() {
  return (
    <LegalPage
      path="/terminos"
      title="Términos y condiciones"
      intro="Las condiciones para usar la plataforma como comprador o como vendedor."
      version="Versión preliminar"
      draft
      sections={sections}
    />
  );
}
