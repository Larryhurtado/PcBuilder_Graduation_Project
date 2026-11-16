import pino from 'pino';
import { createApp } from './app.js';
import { loadConfig } from './kernel/config.js';
import { createPool } from './kernel/db.js';

const config = loadConfig();
const logger = pino({ level: config.LOG_LEVEL });
const pool = config.DATABASE_URL ? createPool(config.DATABASE_URL) : null;

if (!pool) logger.warn('DATABASE_URL no está definida: /ready responderá 503.');

const app = createApp({ config, pool, logger });

// Las particiones mensuales de analítica se crean al arrancar (sin necesidad de un worker)
if (pool) {
  app.locals.analytics.ensurePartitions().catch((error) => {
    logger.warn({ err: error }, 'No se pudieron crear las particiones de analítica.');
  });
}
const server = app.listen(config.PORT, () => {
  logger.info(`API escuchando en http://localhost:${config.PORT}`);
});

function shutdown(signal) {
  logger.info(`${signal} recibido, cerrando…`);
  server.close(async () => {
    await pool?.end();
    process.exit(0);
  });
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
