import AccountPage from '../features/account/AccountPage.jsx';
import LoginPage from '../features/auth/LoginPage.jsx';
import RegisterPage from '../features/auth/RegisterPage.jsx';
import BuilderPage from '../features/builder/BuilderPage.jsx';
import SavedBuildsPage from '../features/builds/SavedBuildsPage.jsx';
import CatalogPage from '../features/catalog/CatalogPage.jsx';
import FavoritesPage from '../features/favorites/FavoritesPage.jsx';
import HomePage from '../features/home/HomePage.jsx';
import ProductPage from '../features/product/ProductPage.jsx';
import BecomeSellerPage from '../features/seller/BecomeSellerPage.jsx';
import DashboardPage from '../features/seller-portal/DashboardPage.jsx';
import SellerLayout from '../features/seller-portal/SellerLayout.jsx';
import StoreProfilePage from '../features/stores/StoreProfilePage.jsx';
import StoresPage from '../features/stores/StoresPage.jsx';
import RequireAuth from '../shared/session/RequireAuth.jsx';
import AppLayout from './AppLayout.jsx';
import { ComingSoonPage, NotFoundPage } from './pages.jsx';
import Root from './Root.jsx';

// Pantallas pendientes (docs/contexto-frontend.md, sección 11). Cada una se reemplaza por su
// componente real al construirla.
const pendingPublic = [
  ['recuperar', 'Recuperar contraseña'],
  ['armado/:codigo', 'Armado compartido'],
  ['terminos', 'Términos y condiciones'],
  ['privacidad', 'Política de privacidad'],
  ['atribucion', 'Atribución de datos'],
];

// Requieren sesión de vendedor; viven dentro del marco del portal (SellerLayout)
const pendingSeller = [
  ['vendedor/inventario', 'Inventario'],
  ['vendedor/publicar', 'Publicar producto'],
  ['vendedor/negocio', 'Mi negocio'],
  ['vendedor/verificacion', 'Estado de verificación'],
];

const soon = ([path, title]) => ({ path, element: <ComingSoonPage title={title} /> });

export const routes = [
  {
    element: <Root />,
    children: [
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
          { path: 'registro', element: <RegisterPage /> },
          { path: 'vender', element: <BecomeSellerPage /> },
          ...pendingPublic.map(soon),
          {
            element: <RequireAuth />,
            children: [
              { path: 'cuenta', element: <AccountPage /> },
              { path: 'cuenta/armados', element: <SavedBuildsPage /> },
              { path: 'cuenta/favoritos', element: <FavoritesPage /> },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      {
        // El portal del vendedor tiene su propio marco (menú lateral y barra), sin la barra pública
        element: <RequireAuth roles={['seller']} />,
        children: [
          {
            element: <SellerLayout />,
            children: [
              { path: 'vendedor', element: <DashboardPage /> },
              ...pendingSeller.map(soon),
            ],
          },
        ],
      },
    ],
  },
];
