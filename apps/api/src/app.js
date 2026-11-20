import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { errorHandler, notFoundHandler } from './http/error-handler.js';
import { requestId } from './http/request-id.js';
import { createDb } from './kernel/db.js';
import { createConsoleEmail, createMemoryEmail } from './kernel/email.js';
import { createEventBus } from './kernel/event-bus.js';
import { createLocalStorage } from './kernel/storage.js';
import { createAnalyticsModule } from './modules/analytics/index.js';
import { createBuildsModule } from './modules/builds/index.js';
import { createCatalogModule } from './modules/catalog/index.js';
import { createCompatModule } from './modules/compat/index.js';
import { createIdentityModule } from './modules/identity/index.js';
import { createOffersModule } from './modules/offers/index.js';
import { createStoresModule } from './modules/stores/index.js';
import { createVerificationModule } from './modules/verification/index.js';

/**
 * Construye la aplicación Express sin arrancarla (así se puede probar con supertest).
 * @param {{ config: ReturnType<import('./kernel/config.js').loadConfig>, pool?: { query: Function } | null, logger?: import('pino').Logger, email?: { send: Function }, rateLimits?: { auth?: object, forgot?: object } }} options
 * `email` es el puerto de correo (por defecto, el adaptador de consola)
 */
export function createApp({ config, pool = null, logger, email, rateLimits = {} } = {}) {
  const app = express();
  app.disable('x-powered-by');

  app.use(requestId);
  if (logger) app.use(pinoHttp({ logger, genReqId: (req) => req.id }));
  app.use(helmet());
  app.use(cors({ origin: config.CORS_ORIGIN.split(',').map((o) => o.trim()), credentials: true }));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Salud del proceso y de la base de datos (Diseño Integral, 3.7)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/ready', async (_req, res) => {
    if (!pool) {
      return res.status(503).json({ status: 'not_ready', reason: 'database_not_configured' });
    }
    try {
      await pool.query('SELECT 1');
      return res.json({ status: 'ready' });
    } catch {
      return res.status(503).json({ status: 'not_ready', reason: 'database_unreachable' });
    }
  });

  // Todas las rutas de negocio cuelgan de /api/v1. Cada módulo monta aquí su router.
  const api = express.Router();
  if (pool) {
    const db = createDb(pool);
    const events = createEventBus({
      onError: (event, error) =>
        logger?.error({ err: error }, `Error en un manejador de "${event}"`),
    });
    const identity = createIdentityModule({
      db,
      jwtSecret: config.JWT_SECRET,
      secureCookie: config.NODE_ENV === 'production',
      // En pruebas el correo no escribe nada; en desarrollo se ve en la consola de la API
      email:
        email ??
        (config.NODE_ENV === 'test' ? createMemoryEmail() : createConsoleEmail({ logger })),
      events,
      webUrl: config.WEB_URL ?? config.CORS_ORIGIN.split(',')[0].trim(),
      onEmailError: (error) => logger?.error({ err: error }, 'No se pudo enviar el correo'),
      rateLimitOptions: rateLimits.auth,
      forgotRateLimitOptions: rateLimits.forgot,
    });
    api.use(identity.router);
    app.locals.auth = identity.middleware;
    const verification = createVerificationModule({ db });
    const stores = createStoresModule({
      db,
      identity: identity.facade,
      verification: verification.facade,
      auth: identity.middleware,
    });
    api.use(stores.router);
    const catalog = createCatalogModule({ db, auth: identity.middleware });
    api.use(catalog.router);
    const compat = createCompatModule({ catalog: catalog.facade });
    api.use(compat.router);
    const storage = createLocalStorage({ dir: config.STORAGE_DIR });
    const offers = createOffersModule({
      db,
      catalog: catalog.facade,
      stores: stores.facade,
      storage,
      auth: identity.middleware,
    });
    api.use(offers.router);
    api.use(offers.sellerRouter);
    const builds = createBuildsModule({
      db,
      compat: compat.facade,
      offers: offers.facade,
      catalog: catalog.facade,
      auth: identity.middleware,
      events,
    });
    api.use(builds.router);
    // Fotos subidas (almacenamiento local): se sirven como archivos estáticos, sin adivinar tipos
    app.use('/storage', express.static(storage.root, { index: false, dotfiles: 'deny' }));
    const analytics = createAnalyticsModule({
      db,
      offers: offers.facade,
      stores: stores.facade,
      auth: identity.middleware,
      secret: config.ANALYTICS_SECRET,
    });
    api.use(analytics.router);
    app.locals.analytics = analytics.facade;
  }
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
