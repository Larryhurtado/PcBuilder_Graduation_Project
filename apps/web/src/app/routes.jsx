import BuilderPage from '../features/builder/BuilderPage.jsx';
import CatalogPage from '../features/catalog/CatalogPage.jsx';
import HomePage from '../features/home/HomePage.jsx';
import ProductPage from '../features/product/ProductPage.jsx';
import AppLayout from './AppLayout.jsx';
import { ComingSoonPage, NotFoundPage } from './pages.jsx';

// Pantallas pendientes (docs/contexto-frontend.md, sección 11). Cada una se reemplaza por su
// componente real al construirla. Las guardas por rol se agregan con la autenticación.
const pending = [
  ['tiendas', 'Directorio de tiendas'],
  ['tiendas/:id', 'Perfil de tienda'],
  ['ingresar', 'Ingresar'],
  ['registro', 'Crear cuenta'],
  ['vender', 'Quiero vender'],
  ['vendedor', 'Panel del vendedor'],
  ['vendedor/inventario', 'Inventario'],
  ['vendedor/publicar', 'Publicar producto'],
  ['vendedor/negocio', 'Mi negocio'],
  ['vendedor/verificacion', 'Estado de verificación'],
  ['armado/:codigo', 'Armado compartido'],
  ['cuenta', 'Mi cuenta'],
  ['cuenta/armados', 'Armados guardados'],
  ['cuenta/favoritos', 'Favoritos'],
  ['terminos', 'Términos y condiciones'],
  ['privacidad', 'Política de privacidad'],
  ['atribucion', 'Atribución de datos'],
];

export const routes = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'armador', element: <BuilderPage /> },
      { path: 'catalogo', element: <CatalogPage /> },
      { path: 'producto/:id', element: <ProductPage /> },
      ...pending.map(([path, title]) => ({ path, element: <ComingSoonPage title={title} /> })),
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
