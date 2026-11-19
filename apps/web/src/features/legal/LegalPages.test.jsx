import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test/utils.jsx';
import {
  ATTRIBUTION_TEXT,
  BUILDCORES_REPO_URL,
  LICENSE_NAME,
  LICENSE_URL,
} from '../../shared/attribution.js';

const open = (path) => {
  const utils = renderApp(path);
  return { ...utils, user: userEvent.setup() };
};
const index = () => within(screen.getByRole('navigation', { name: 'En esta página' }));
const main = () => within(screen.getByRole('main'));

describe('Atribución de datos', () => {
  it('muestra el texto exacto de la licencia y los enlaces a la fuente', () => {
    open('/atribucion');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Atribución de datos' }),
    ).toBeInTheDocument();
    expect(document.title).toBe('Atribución de datos · PcBuilder');
    expect(ATTRIBUTION_TEXT).toBe(
      'Data from BuildCores OpenDB (https://github.com/buildcores/buildcores-open-db), licensed under CC BY-NC-SA 4.0.',
    );
    expect(main().getByText(ATTRIBUTION_TEXT)).toBeInTheDocument();
    const repo = main().getByRole('link', { name: 'BuildCores OpenDB' });
    expect(repo).toHaveAttribute('href', BUILDCORES_REPO_URL);
    expect(repo).toHaveAttribute('target', '_blank');
    expect(repo).toHaveAttribute('rel', expect.stringContaining('noopener'));
    const license = main().getByRole('link', { name: LICENSE_NAME });
    expect(license).toHaveAttribute('href', LICENSE_URL);
    expect(license).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('explica las tres condiciones de la licencia y que BuildCores no la respalda', () => {
    open('/atribucion');
    for (const term of ['Atribución:', 'No comercial:', 'Compartir igual:']) {
      expect(main().getByText(term)).toBeInTheDocument();
    }
    expect(main().getByText(/BuildCores no respalda ni patrocina/)).toBeInTheDocument();
  });

  it('avisa que las tiendas y los precios de esta versión son de ejemplo', () => {
    open('/atribucion');
    expect(
      main().getByText(/son datos de ejemplo y no corresponden a comercios reales/),
    ).toBeInTheDocument();
  });

  it('no es un borrador: no lleva el aviso de revisión jurídica', () => {
    open('/atribucion');
    expect(screen.queryByRole('note')).not.toBeInTheDocument();
  });
});

describe('Política de privacidad', () => {
  it('es un borrador con la versión de la política y los datos por definir resaltados', () => {
    open('/privacidad');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Política de privacidad' }),
    ).toBeInTheDocument();
    expect(document.title).toBe('Política de privacidad · PcBuilder');
    expect(screen.getByRole('note')).toHaveTextContent(
      'borrador y está pendiente de revisión jurídica',
    );
    expect(main().getByText('Versión 2026-01')).toBeInTheDocument();
    expect(main().getAllByText('[correo de contacto por definir]').length).toBeGreaterThan(0);
    expect(main().getByText('[nombre del responsable por definir]')).toBeInTheDocument();
  });

  it('nombra los derechos de la Ley 1581 de 2012', () => {
    open('/privacidad');
    expect(
      main().getByRole('heading', { name: /Tus derechos \(Ley 1581 de 2012\)/ }),
    ).toBeInTheDocument();
    expect(
      main().getByText('Revocar la autorización y pedir que se supriman tus datos.'),
    ).toBeInTheDocument();
  });

  it('no promete lo que todavía no existe: eliminar la cuenta es Próximamente', () => {
    open('/privacidad');
    expect(main().getByText(/todavía no está disponible/)).toBeInTheDocument();
  });

  it('cuenta lo que hace el sitio con la sesión, las tipografías y WhatsApp', () => {
    open('/privacidad');
    expect(main().getByText(/cookie de sesión/)).toBeInTheDocument();
    expect(main().getByText(/Google Fonts/)).toBeInTheDocument();
    expect(main().getByText(/Contactar por WhatsApp/)).toBeInTheDocument();
  });
});

describe('Términos y condiciones', () => {
  it('es un borrador con las condiciones reales del servicio', () => {
    open('/terminos');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Términos y condiciones' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('note')).toHaveTextContent('borrador');
    expect(main().getByText('Versión preliminar')).toBeInTheDocument();
    expect(main().getByText(/no cobramos comisiones y no procesamos pagos/)).toBeInTheDocument();
    expect(
      main().getByText(
        'La verificación confirma que el negocio existe; no garantiza el cumplimiento de sus ofertas.',
      ),
    ).toBeInTheDocument();
  });

  it('deja por definir la limitación de responsabilidad y la ley aplicable', () => {
    open('/terminos');
    expect(
      main().getByText('[limitación de responsabilidad por definir con asesoría jurídica]'),
    ).toBeInTheDocument();
    expect(main().getByText('[por definir]')).toBeInTheDocument();
  });

  it('remite a la política de privacidad y a la atribución', () => {
    open('/terminos');
    expect(main().getByRole('link', { name: 'política de privacidad' })).toHaveAttribute(
      'href',
      '/privacidad',
    );
    expect(main().getByRole('link', { name: 'atribución de datos' })).toHaveAttribute(
      'href',
      '/atribucion',
    );
  });
});

describe.each([
  ['/atribucion', 4],
  ['/privacidad', 8],
  ['/terminos', 9],
])('índice de %s', (path, count) => {
  it('lleva a cada sección y cada sección existe', () => {
    open(path);
    const links = index().getAllByRole('link');
    expect(links).toHaveLength(count);
    for (const link of links) {
      const id = link.getAttribute('href').slice(1);
      const section = document.getElementById(id);
      expect(section, id).toBeInTheDocument();
      const strip = (text) => text.replace(/^[0-9]+[.]s*/, '');
      expect(strip(within(section).getByRole('heading').textContent)).toBe(strip(link.textContent));
    }
  });
});

describe('Navegación entre los documentos legales', () => {
  it('cada página enlaza a las otras dos y no a sí misma', () => {
    open('/privacidad');
    const others = within(screen.getByRole('navigation', { name: 'Otros documentos legales' }));
    expect(others.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/terminos',
      '/atribucion',
    ]);
  });

  it('desde los términos se llega a la privacidad', async () => {
    const { user, router } = open('/terminos');
    const others = within(screen.getByRole('navigation', { name: 'Otros documentos legales' }));
    await user.click(others.getByRole('link', { name: 'Política de privacidad' }));
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Política de privacidad' }),
    ).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/privacidad');
  });

  it('desde el pie del sitio se abren las tres páginas', async () => {
    const { user } = open('/');
    const footer = () => within(screen.getByRole('contentinfo'));
    await user.click(footer().getByRole('link', { name: 'Términos' }));
    await screen.findByRole('heading', { level: 1, name: 'Términos y condiciones' });
    await user.click(footer().getByRole('link', { name: 'Privacidad' }));
    await screen.findByRole('heading', { level: 1, name: 'Política de privacidad' });
    await user.click(footer().getByRole('link', { name: 'Atribución de datos' }));
    await screen.findByRole('heading', { level: 1, name: 'Atribución de datos' });
  });

  it('el pie sigue enlazando al repositorio de BuildCores con la licencia', () => {
    open('/atribucion');
    const link = within(screen.getByRole('contentinfo')).getByRole('link', {
      name: `BuildCores OpenDB (${LICENSE_NAME})`,
    });
    expect(link).toHaveAttribute('href', BUILDCORES_REPO_URL);
  });
});
