import Container from '../../shared/ui/Container.jsx';

/**
 * Estructura de las pantallas de cuenta (ingresar, registro…): tarjeta centrada con título,
 * descripción y formulario, un pie con el enlace alternativo y una nota debajo.
 * @param {{ title: string, description: string, footer?: import('react').ReactNode, note?: import('react').ReactNode, children: import('react').ReactNode }} props
 */
export default function AuthShell({ title, description, footer, note, children }) {
  return (
    <Container className="flex justify-center py-space-xl md:py-space-2xl">
      <div className="w-full max-w-md space-y-space-md">
        <div className="overflow-hidden rounded-2xl bg-surface-container">
          <div className="space-y-space-lg p-space-lg">
            <div className="space-y-space-xs">
              <h1 className="text-headline-lg-mobile text-on-surface md:text-headline-lg">
                {title}
              </h1>
              <p className="text-body-md text-on-surface-variant">{description}</p>
            </div>
            {children}
          </div>
          {footer && (
            <div className="space-y-1 bg-surface-container-low p-space-md text-center">
              {footer}
            </div>
          )}
        </div>
        {note && (
          <p className="px-space-sm text-center text-body-sm text-on-surface-variant">{note}</p>
        )}
      </div>
    </Container>
  );
}
