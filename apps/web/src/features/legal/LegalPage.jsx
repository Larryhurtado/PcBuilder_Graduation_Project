import { useEffect } from 'react';
import { Link } from 'react-router';
import { PLATFORM_NAME } from '../../shared/config.js';
import Container from '../../shared/ui/Container.jsx';
import Icon from '../../shared/ui/Icon.jsx';

/** Los tres documentos legales, para el pie de cada página. */
export const LEGAL_DOCUMENTS = [
  { to: '/terminos', label: 'Términos y condiciones' },
  { to: '/privacidad', label: 'Política de privacidad' },
  { to: '/atribucion', label: 'Atribución de datos' },
];

/**
 * Dato que todavía no está definido en un documento legal: se ve resaltado y entre corchetes para
 * que nadie lo confunda con texto definitivo.
 */
export function Pending({ children }) {
  return (
    <mark className="rounded bg-unverifiable/20 px-1.5 py-0.5 text-on-surface">[{children}]</mark>
  );
}

/**
 * Marco de las páginas legales: título, aviso de borrador (si lo es), índice con enlaces a cada
 * sección y las secciones en tarjetas.
 * @param {{ path: string, title: string, intro: string, version?: string, draft?: boolean, sections: { id: string, title: string, body: import('react').ReactNode }[] }} props
 */
export default function LegalPage({ path, title, intro, version, draft = false, sections }) {
  useEffect(() => {
    document.title = `${title} · ${PLATFORM_NAME}`;
  }, [title]);

  return (
    <Container className="space-y-space-lg py-space-xl md:py-space-2xl">
      <header className="max-w-3xl space-y-space-xs">
        <p className="text-label-sm uppercase tracking-wider text-primary">Institucional y legal</p>
        <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">{title}</h1>
        <p className="text-body-lg text-on-surface-variant">{intro}</p>
        {version && <p className="tnum text-code-metric text-outline">{version}</p>}
      </header>

      {draft && (
        <p
          role="note"
          className="flex max-w-3xl items-start gap-space-sm rounded-2xl bg-[color-mix(in_srgb,var(--color-unverifiable)_10%,var(--color-surface-container))] p-space-md text-body-sm text-on-surface"
        >
          <Icon name="edit_note" className="mt-0.5 text-[22px] text-unverifiable" />
          <span>
            <strong>Este documento es un borrador</strong> y está pendiente de revisión jurídica. Lo
            que aparece <Pending>entre corchetes</Pending> aún no está definido.
          </span>
        </p>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-space-lg lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start">
        <nav
          aria-label="En esta página"
          className="space-y-space-xs rounded-2xl bg-surface-container p-space-md lg:sticky lg:top-24"
        >
          <p className="text-label-sm uppercase tracking-wider text-outline">En esta página</p>
          <ol className="space-y-1">
            {sections.map((section, index) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-body-sm text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-on-surface"
                >
                  <span className="tnum text-outline">{index + 1}.</span>
                  {section.title}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0 space-y-space-md">
          {sections.map((section, index) => (
            <section
              key={section.id}
              id={section.id}
              aria-labelledby={`${section.id}-titulo`}
              className="scroll-mt-24 space-y-space-sm rounded-2xl bg-surface-container p-space-md md:p-space-lg"
            >
              <h2 id={`${section.id}-titulo`} className="text-headline-sm text-on-surface">
                <span className="tnum mr-2 text-outline">{index + 1}.</span>
                {section.title}
              </h2>
              <div className="space-y-space-sm break-words text-body-md text-on-surface-variant [&_a]:text-primary [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1">
                {section.body}
              </div>
            </section>
          ))}

          <nav
            aria-label="Otros documentos legales"
            className="flex flex-wrap gap-x-space-lg gap-y-space-xs rounded-2xl bg-surface-container-low p-space-md"
          >
            <span className="text-label-sm uppercase tracking-wider text-outline">
              Otros documentos
            </span>
            {LEGAL_DOCUMENTS.filter((doc) => doc.to !== path).map((doc) => (
              <Link
                key={doc.to}
                to={doc.to}
                className="inline-flex min-h-11 items-center text-body-sm text-primary hover:underline md:min-h-0"
              >
                {doc.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </Container>
  );
}
