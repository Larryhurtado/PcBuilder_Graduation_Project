// Las pruebas de integración leen DATABASE_URL del .env de la raíz (que no se sube a git).
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envFile = resolve(import.meta.dirname, '../../../../.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);
