import {
  ATTRIBUTION_TEXT,
  BUILDCORES_REPO_URL,
  LICENSE_NAME,
  LICENSE_URL,
} from '../../shared/attribution.js';
import { PLATFORM_NAME } from '../../shared/config.js';
import LegalPage from './LegalPage.jsx';

const external = { target: '_blank', rel: 'noopener noreferrer' };

const sections = [
  {
    id: 'fuente',
    title: 'Fuente de los datos',
    body: (
      <>
        <p>
          Las especificaciones técnicas de los componentes (procesadores, placas base, memoria,
          tarjetas gráficas, fuentes, gabinetes, refrigeración y almacenamiento) vienen de{' '}
          <a href={BUILDCORES_REPO_URL} {...external}>
            BuildCores OpenDB
          </a>
          , una base de datos abierta de hardware.
        </p>
        <blockquote className="rounded-xl border border-outline-variant bg-surface p-space-md text-body-sm text-on-surface">
          {ATTRIBUTION_TEXT}
        </blockquote>
      </>
    ),
  },
  {
    id: 'licencia',
    title: `Licencia ${LICENSE_NAME}`,
    body: (
      <>
        <p>
          Esos datos se publican con la licencia{' '}
          <a href={LICENSE_URL} {...external}>
            {LICENSE_NAME}
          </a>{' '}
          (Creative Commons). Esto significa tres cosas:
        </p>
        <ul>
          <li>
            <strong>Atribución:</strong> citamos la fuente en esta página, en el pie de todas las
            pantallas y en la ficha técnica de cada producto.
          </li>
          <li>
            <strong>No comercial:</strong> por eso {PLATFORM_NAME} es una plataforma educativa, sin
            fines comerciales. No vendemos componentes ni cobramos comisiones.
          </li>
          <li>
            <strong>Compartir igual:</strong> lo que se derive de esos datos se comparte con la
            misma licencia.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'uso',
    title: 'Qué hacemos con los datos',
    body: (
      <>
        <p>
          Organizamos los datos en nuestro catálogo y los usamos para calcular la compatibilidad
          física y eléctrica de un armado. Las reglas de compatibilidad, la plataforma y su interfaz
          son trabajo propio del proyecto.
        </p>
        <p>BuildCores no respalda ni patrocina esta plataforma, y no afirmamos lo contrario.</p>
      </>
    ),
  },
  {
    id: 'limites',
    title: 'Alcance y límites',
    body: (
      <>
        <p>
          Los datos técnicos pueden tener errores o estar incompletos. Cuando falta un dato, la
          plataforma lo muestra como «No verificable» y recomienda confirmarlo con la tienda antes
          de comprar.
        </p>
        <p>
          En esta versión de demostración, las tiendas, las ofertas y los precios son datos de
          ejemplo y no corresponden a comercios reales.
        </p>
      </>
    ),
  },
];

/** Atribución de datos (/atribucion): la fuente, la licencia y el uso de los datos de BuildCores. */
export default function AttributionPage() {
  return (
    <LegalPage
      path="/atribucion"
      title="Atribución de datos"
      intro="De dónde salen los datos técnicos de los componentes y bajo qué licencia los usamos."
      sections={sections}
    />
  );
}
