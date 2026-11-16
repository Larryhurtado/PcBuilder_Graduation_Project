import { createBrowserRouter, RouterProvider } from 'react-router';
import { routes } from './routes.jsx';

const browserRouter = createBrowserRouter(routes);

/** Raíz de la aplicación. Las pruebas pasan su propio router en memoria. */
export default function App({ router = browserRouter }) {
  return <RouterProvider router={router} />;
}
