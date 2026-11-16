// Utilidades puras de los comandos de base de datos (se prueban sin PostgreSQL).

/**
 * Descompone una cadena de conexión postgres://usuario:clave@host:puerto/base.
 * @param {string} url
 */
export function parseDatabaseUrl(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(
      'DATABASE_URL no tiene un formato válido (postgres://usuario:clave@host:5432/base).',
    );
  }
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('DATABASE_URL debe empezar por postgres://');
  }
  const database = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  if (!database) throw new Error('DATABASE_URL no indica el nombre de la base de datos.');
  return {
    host: parsed.hostname || 'localhost',
    port: parsed.port || '5432',
    user: decodeURIComponent(parsed.username || 'postgres'),
    password: decodeURIComponent(parsed.password || ''),
    database,
  };
}

const SAFE_DATABASE_NAME = /^hardware_validator(_[a-z0-9]+)?$/;

/**
 * Seguro de `db:reset`: solo se puede borrar una base del proyecto.
 * @param {string} name
 */
export function assertSafeDatabaseName(name) {
  if (!SAFE_DATABASE_NAME.test(name)) {
    throw new Error(
      `Por seguridad, db:reset solo actúa sobre bases llamadas "hardware_validator" o ` +
        `"hardware_validator_<sufijo>". La base indicada es "${name}".`,
    );
  }
}

/** Ordena archivos .sql por nombre (001_, 002_…). */
export function sortSqlFiles(names) {
  return names.filter((n) => n.endsWith('.sql')).sort((a, b) => a.localeCompare(b));
}

/** Dispositivo nulo del sistema operativo (donde se descarta la salida). */
export function nullDevice(platform = process.platform) {
  return platform === 'win32' ? 'NUL' : '/dev/null';
}

/**
 * Los scripts usan `\o /dev/null` para ocultar salida; en Windows ese dispositivo es `NUL`.
 * Devuelve el contenido adaptado al sistema operativo, sin tocar el archivo original.
 */
export function adaptScriptForPlatform(sql, platform = process.platform) {
  return sql.replaceAll('\\o /dev/null', `\\o ${nullDevice(platform)}`);
}

/** Escapa un identificador de PostgreSQL entre comillas dobles. */
export function quoteIdent(name) {
  return `"${name.replaceAll('"', '""')}"`;
}

/** Valida de forma básica un correo (evita pasar texto arbitrario a la consola de comandos). */
export function isValidEmail(value) {
  return typeof value === 'string' && /^[^@\s'";\\]+@[^@\s'";\\]+\.[^@\s'";\\]+$/.test(value);
}

/**
 * SQL que verifica el comercio del correo dado (`quotedEmail` ya viene entre comillas simples).
 * Respeta lo que el vendedor ya completó y rellena solo lo que falta. Devuelve el nombre comercial
 * del comercio verificado, o nada si no existe el comercio o el administrador de demostración.
 */
export function buildApproveStoreSql(quotedEmail) {
  const owner = `(SELECT id FROM identity.users WHERE email = ${quotedEmail})`;
  return `
    UPDATE verification.requests
       SET status = 'approved',
           submitted_at = COALESCE(submitted_at, now()),
           reviewed_at = now(),
           reviewed_by = (SELECT id FROM identity.users WHERE email = 'admin@demo.test'),
           reviewer_note = 'Aprobado en desarrollo (dev:approve-store).',
           deadline_at = NULL
     WHERE store_id = (SELECT id FROM stores.stores WHERE owner_user_id = ${owner});
    UPDATE stores.stores
       SET nit = COALESCE(nit, lpad(floor(random() * 1e9)::bigint::text, 9, '0') || '-' || floor(random() * 10)::int),
           whatsapp_e164 = COALESCE(whatsapp_e164, '+573000000000'),
           department = COALESCE(department, 'Valle del Cauca'),
           city = COALESCE(city, 'Cali'),
           address = COALESCE(address, 'Direccion de prueba'),
           is_verified = true,
           updated_at = now()
     WHERE owner_user_id = ${owner};
    SELECT trade_name FROM stores.stores s
      JOIN verification.requests r ON r.store_id = s.id AND r.status = 'approved'
     WHERE s.owner_user_id = ${owner};`;
}
