import LoginPage from '../features/auth/LoginPage.jsx';
import BuilderPage from '../features/builder/BuilderPage.jsx';
import CatalogPage from '../features/catalog/CatalogPage.jsx';
import HomePage from '../features/home/HomePage.jsx';
import ProductPage from '../features/product/ProductPage.jsx';
import StoreProfilePage from '../features/stores/StoreProfilePage.jsx';
import StoresPage from '../features/stores/StoresPage.jsx';
import RequireAuth from '../shared/session/RequireAuth.jsx';
import AppLayout from './AppLayout.jsx';
import { ComingSoonPage, NotFoundPage } from './pages.jsx';

// Pantallas pendientes (docs/contexto-frontend.md, sección 11). Cada una se reemplaza por su
// componente real al construirla.
const pendingPublic = [
  ['registro', 'Crear cuenta'],
  ['recuperar', 'Recuperar contraseña'],
  ['vender', 'Quiero vender'],
  ['armado/:codigo', 'Armado compartido'],
  ['terminos', 'Términos y condiciones'],
  ['privacidad', 'Política de privacidad'],
  ['atribucion', 'Atribución de datos'],
];

// Requieren sesión: cualquier cuenta
const pendingAccount = [
  ['cuenta', 'Mi cuenta'],
  ['cuenta/armados', 'Armados guardados'],
  ['cuenta/favoritos', 'Favoritos'],
];

// Requieren sesión de vendedor
const pendingSeller = [
  ['vendedor', 'Panel del vendedor'],
  ['vendedor/inventario', 'Inventario'],
  ['vendedor/publicar', 'Publicar producto'],
  ['vendedor/negocio', 'Mi negocio'],
  ['vendedor/verificacion', 'Estado de verificación'],
];

const soon = ([path, title]) => ({ path, element: <ComingSoonPage title={title} /> });

export const routes = [
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'armador', element: <BuilderPage /> },
      { path: 'catalogo', element: <CatalogPage /> },
      { path: 'producto/:id', element: <ProductPage /> },
      { path: 'tiendas', element: <StoresPage /> },
      { path: 'tiendas/:id', element: <StoreProfilePage /> },
      { path: 'ingresar', element: <LoginPage /> },
      ...pendingPublic.map(soon),
      { element: <RequireAuth />, children: pendingAccount.map(soon) },
      { element: <RequireAuth roles={['seller']} />, children: pendingSeller.map(soon) },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
