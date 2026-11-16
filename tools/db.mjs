// Comandos de base de datos: node tools/db.mjs <reset|verify|migrate>
// Los scripts .sql usan comandos propios de psql (\set, \o), así que se ejecutan con psql.
// La conexión sale de DATABASE_URL en el .env de la raíz (o de la variable de entorno).
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  adaptScriptForPlatform,
  assertSafeDatabaseName,
  buildApproveStoreSql,
  isValidEmail,
  nullDevice,
  parseDatabaseUrl,
  quoteIdent,
  sortSqlFiles,
} from './db-lib.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dbDir = join(root, 'db');
const baseScripts = [
  '001_schema.sql',
  '002_seed_reference.sql',
  '003_seed_components.sql',
  '004_seed_demo.sql',
];

function fail(message) {
  console.error(`\nError: ${message}\n`);
  process.exit(1);
}

function loadEnv() {
  const envFile = join(root, '.env');
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}

function findPsql() {
  const probe = spawnSync('psql', ['--version'], { encoding: 'utf8' });
  if (!probe.error && probe.status === 0) return 'psql';
  // Windows: PostgreSQL suele instalarse en Program Files aunque no esté en el PATH
  const base = 'C:\\Program Files\\PostgreSQL';
  if (existsSync(base)) {
    const versions = readdirSync(base).sort((a, b) => Number(b) - Number(a));
    for (const v of versions) {
      const candidate = join(base, v, 'bin', 'psql.exe');
      if (existsSync(candidate)) return candidate;
    }
  }
  fail('No encuentro psql. Agrega la carpeta bin de PostgreSQL al PATH.');
}

const psqlPath = findPsql();

/** Ejecuta psql con la clave en PGPASSWORD (no aparece en la línea de comandos). */
function psql(conn, database, extraArgs, { capture = false } = {}) {
  const args = [
    '-h',
    conn.host,
    '-p',
    conn.port,
    '-U',
    conn.user,
    '-d',
    database,
    '-v',
    'ON_ERROR_STOP=1',
    ...extraArgs,
  ];
  const result = spawnSync(psqlPath, args, {
    env: { ...process.env, PGPASSWORD: conn.password, PGCLIENTENCODING: 'UTF8' },
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : ['ignore', 'inherit', 'inherit'],
  });
  if (result.error) fail(result.error.message);
  return result;
}

/** Ejecuta un script de db/. Con `quiet` se descarta la salida de los SELECT de relleno. */
function runFile(conn, file, { quiet = false } = {}) {
  console.log(`>>> ${file}`);
  const original = readFileSync(join(dbDir, file), 'utf8');
  const adapted = adaptScriptForPlatform(original);
  // Se ejecuta una copia temporal adaptada al sistema operativo; el archivo de db/ no se toca.
  const tmpDir = mkdtempSync(join(tmpdir(), 'hw-db-'));
  const tmpFile = join(tmpDir, file);
  writeFileSync(tmpFile, adapted);
  try {
    const args = ['-q', ...(quiet ? ['-o', nullDevice()] : []), '-f', tmpFile];
    const result = psql(conn, conn.database, args);
    if (result.status !== 0) fail(`falló ${file}`);
  } finally {
    rmSync(tmpDir, { recursive: true, force: true });
  }
}

function sql(conn, database, statement) {
  const result = psql(conn, database, ['-q', '-t', '-A', '-c', statement], { capture: true });
  if (result.status !== 0) fail(`${statement}\n${result.stderr}`);
  return result.stdout.trim();
}

function migrate(conn) {
  sql(
    conn,
    conn.database,
    'CREATE TABLE IF NOT EXISTS public.schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  const dir = join(dbDir, 'migrations');
  const files = existsSync(dir) ? sortSqlFiles(readdirSync(dir)) : [];
  const applied = new Set(
    sql(conn, conn.database, 'SELECT name FROM public.schema_migrations')
      .split('\n')
      .filter(Boolean),
  );
  const pending = files.filter((f) => !applied.has(f));
  if (pending.length === 0) return console.log('Migraciones: nada pendiente.');
  for (const file of pending) {
    console.log(`>>> migrations/${file}`);
    const result = psql(conn, conn.database, ['-q', '-1', '-f', join(dir, file)]);
    if (result.status !== 0) fail(`falló la migración ${file}`);
    sql(
      conn,
      conn.database,
      `INSERT INTO public.schema_migrations(name) VALUES ('${file.replaceAll("'", "''")}')`,
    );
  }
  console.log(`Migraciones aplicadas: ${pending.length}.`);
}

function reset(conn) {
  assertSafeDatabaseName(conn.database);
  console.log(`Recreando la base "${conn.database}" en ${conn.host}:${conn.port}…`);
  sql(conn, 'postgres', `DROP DATABASE IF EXISTS ${quoteIdent(conn.database)} WITH (FORCE)`);
  sql(conn, 'postgres', `CREATE DATABASE ${quoteIdent(conn.database)}`);
  for (const file of baseScripts) runFile(conn, file, { quiet: true });
  migrate(conn);
  console.log('\nBase lista. Ejecuta "npm run db:verify" para correr las 34 pruebas.');
}

function verify(conn) {
  runFile(conn, '005_verify.sql');
}

/**
 * Simula la aprobación de un comercio (la revisión de documentos queda fuera de esta entrega):
 * completa el perfil mínimo que exige la verificación, marca la solicitud como aprobada por el
 * administrador de demostración y deja el comercio verificado.
 */
function approveStore(conn) {
  const email = process.argv[3];
  if (!isValidEmail(email)) fail('Uso: npm run dev:approve-store -- correo@del.vendedor');
  const quoted = `'${email.replaceAll("'", "''")}'`;
  const approved = sql(conn, conn.database, buildApproveStoreSql(quoted));
  if (!approved) {
    fail(
      `No hay un comercio para ${email}. Debe haberse convertido en vendedor, ` +
        'y debe existir el administrador admin@demo.test (carga de demostración).',
    );
  }
  console.log(`Comercio verificado: ${approved}`);
}

const commands = { reset, verify, migrate, 'approve-store': approveStore };
const command = process.argv[2];
if (!commands[command]) fail('Uso: node tools/db.mjs <reset|verify|migrate|approve-store>');

loadEnv();
const url = process.env.DATABASE_URL;
if (!url) {
  fail(
    'Falta DATABASE_URL. Crea el archivo .env en la raíz del repositorio con una línea como:\n' +
      '  DATABASE_URL=postgres://postgres:TU_CLAVE@localhost:5432/hardware_validator',
  );
}
try {
  commands[command](parseDatabaseUrl(url));
} catch (error) {
  fail(error.message);
}
