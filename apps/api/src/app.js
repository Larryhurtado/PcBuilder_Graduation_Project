import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { errorHandler, notFoundHandler } from './http/error-handler.js';
import { requestId } from './http/request-id.js';

/**
 * Construye la aplicación Express sin arrancarla (así se puede probar con supertest).
 * @param {{ config: ReturnType<import('./kernel/config.js').loadConfig>, pool?: { query: Function } | null, logger?: import('pino').Logger }} options
 */
export function createApp({ config, pool = null, logger } = {}) {
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
  app.use('/api/v1', api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
