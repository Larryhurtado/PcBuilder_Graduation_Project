import ErrorScreen from '../shared/ui/ErrorScreen.jsx';

/** Ruta inexistente. */
export function NotFoundPage() {
  return <ErrorScreen variant="notFound" />;
}
