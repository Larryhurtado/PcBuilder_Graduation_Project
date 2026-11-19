import AccountPage from '../features/account/AccountPage.jsx';
import RecoverPage from '../features/auth/RecoverPage.jsx';
import ResetPasswordPage from '../features/auth/ResetPasswordPage.jsx';
import LoginPage from '../features/auth/LoginPage.jsx';
import RegisterPage from '../features/auth/RegisterPage.jsx';
import BuilderPage from '../features/builder/BuilderPage.jsx';
import SharedBuildPage from '../features/builds/SharedBuildPage.jsx';
import SavedBuildsPage from '../features/builds/SavedBuildsPage.jsx';
import CatalogPage from '../features/catalog/CatalogPage.jsx';
import FavoritesPage from '../features/favorites/FavoritesPage.jsx';
import AttributionPage from '../features/legal/AttributionPage.jsx';
import PrivacyPage from '../features/legal/PrivacyPage.jsx';
import TermsPage from '../features/legal/TermsPage.jsx';
import HomePage from '../features/home/HomePage.jsx';
import ProductPage from '../features/product/ProductPage.jsx';
import BecomeSellerPage from '../features/seller/BecomeSellerPage.jsx';
import DashboardPage from '../features/seller-portal/DashboardPage.jsx';
import InventoryPage from '../features/seller-portal/InventoryPage.jsx';
import MetricsPage from '../features/seller-portal/MetricsPage.jsx';
import PublishPage from '../features/seller-portal/PublishPage.jsx';
import SettingsPage from '../features/seller-portal/SettingsPage.jsx';
import VerificationPage from '../features/seller-portal/VerificationPage.jsx';
import SellerLayout from '../features/seller-portal/SellerLayout.jsx';
import StoreProfilePage from '../features/stores/StoreProfilePage.jsx';
import StoresPage from '../features/stores/StoresPage.jsx';
import RequireAuth from '../shared/session/RequireAuth.jsx';
import ErrorScreen from '../shared/ui/ErrorScreen.jsx';
import AppLayout, { PublicFrame } from './AppLayout.jsx';
import ErrorPage, { RootErrorPage } from './ErrorPage.jsx';
import { NotFoundPage } from './pages.jsx';
import Root from './Root.jsx';

/** Salidas del 404 dentro del portal del vendedor (en vez de las del sitio público). */
const portalActions = [
  { label: 'Ir al dashboard', to: '/vendedor' },
  { label: 'Ver inventario', to: '/vendedor/inventario' },
];

export const routes = [
  {
    element: <Root />,
    // Último recurso, para un error fuera de los marcos
    errorElement: <RootErrorPage />,
    children: [
      {
        element: <AppLayout />,
        children: [
          {
            // Un error dentro de una pantalla se muestra con la barra y el pie puestos
            errorElement: <ErrorPage />,
            children: [
              { index: true, element: <HomePage /> },
              { path: 'armador', element: <BuilderPage /> },
              { path: 'armado/:codigo', element: <SharedBuildPage /> },
              { path: 'catalogo', element: <CatalogPage /> },
              { path: 'producto/:id', element: <ProductPage /> },
              { path: 'tiendas', element: <StoresPage /> },
              { path: 'tiendas/:id', element: <StoreProfilePage /> },
              { path: 'ingresar', element: <LoginPage /> },
              { path: 'registro', element: <RegisterPage /> },
              { path: 'recuperar', element: <RecoverPage /> },
              { path: 'restablecer', element: <ResetPasswordPage /> },
              { path: 'vender', element: <BecomeSellerPage /> },
              { path: 'terminos', element: <TermsPage /> },
              { path: 'privacidad', element: <PrivacyPage /> },
              { path: 'atribucion', element: <AttributionPage /> },
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
        ],
      },
      {
        // El portal del vendedor tiene su propio marco (menú lateral y barra), sin la barra pública.
        // Si la cuenta no es de vendedor, la pantalla de aviso se muestra con el marco público.
        element: <RequireAuth roles={['seller']} frame={PublicFrame} />,
        children: [
          {
            element: <SellerLayout />,
            children: [
              {
                errorElement: <ErrorPage actions={portalActions} />,
                children: [
                  { path: 'vendedor', element: <DashboardPage /> },
                  { path: 'vendedor/inventario', element: <InventoryPage /> },
                  { path: 'vendedor/metricas', element: <MetricsPage /> },
                  { path: 'vendedor/publicar', element: <PublishPage /> },
                  { path: 'vendedor/verificacion', element: <VerificationPage /> },
                  { path: 'vendedor/negocio', element: <SettingsPage /> },
                  {
                    path: 'vendedor/*',
                    element: <ErrorScreen variant="notFound" actions={portalActions} />,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];
