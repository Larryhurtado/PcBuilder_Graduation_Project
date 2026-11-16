const widths = {
  page: 'max-w-page', // 1280 px
  wide: 'max-w-[85rem]', // 1360 px (pantallas de trabajo como el asistente)
};

/**
 * Contenedor de página: ancho máximo de 1280 px (o 1360 px con `size="wide"`) y márgenes laterales
 * de 1 / 1,5 / 2 rem (móvil, tableta y escritorio), como define el DESIGN.md.
 */
export default function Container({
  as: Tag = 'div',
  size = 'page',
  className = '',
  children,
  ...rest
}) {
  return (
    <Tag
      className={`mx-auto w-full ${widths[size]} px-margin-mobile md:px-gutter lg:px-margin ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
