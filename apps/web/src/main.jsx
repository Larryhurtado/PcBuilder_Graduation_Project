import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App.jsx';
import './index.css';

// Con VITE_USE_MOCKS=true el navegador responde con los datos simulados (MSW) en vez de la API.
async function enableMocking() {
  if (import.meta.env.VITE_USE_MOCKS !== 'true') return;
  try {
    const { worker } = await import('./mocks/browser.js');
    await worker.start({ onUnhandledRequest: 'bypass' });
  } catch (error) {
    // Si el navegador no permite service workers, la app sigue cargando y usa la API real.
    console.warn('[mocks] No se pudo iniciar MSW; las llamadas irán a la API real.', error);
  }
}

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1 } } });

enableMocking().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>,
  );
});
