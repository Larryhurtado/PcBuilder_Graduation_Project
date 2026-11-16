/**
 * Contenedor de página: ancho máximo de 1280 px y márgenes laterales de 1 / 1,5 / 2 rem
 * (móvil, tableta y escritorio), como define el DESIGN.md.
 */
export default function Container({ as: Tag = 'div', className = '', children, ...rest }) {
  return (
    <Tag
      className={`mx-auto w-full max-w-page px-margin-mobile md:px-gutter lg:px-margin ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}
