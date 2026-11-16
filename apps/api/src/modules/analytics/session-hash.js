import { createHmac, randomBytes } from 'node:crypto';

/** Día calendario en Colombia (AAAA-MM-DD): la sal se renueva cada día a medianoche hora local. */
function bogotaDay(date) {
  return date.toLocaleDateString('en-CA', { timeZone: 'America/Bogota' });
}

/**
 * Hash de sesión anónimo (Diseño Integral, 4.8): HMAC con una sal diaria derivada de un secreto,
 * calculado sobre IP + agente de usuario. No es reversible, no se guarda la IP, y como la sal
 * cambia cada día no sirve para seguir a una persona de un día para otro.
 * @param {{ secret?: string, now?: () => Date }} [options]
 * @returns {(ip?: string, userAgent?: string) => string} hexadecimal de 64 caracteres
 */
export function createSessionHasher({
  secret = randomBytes(32).toString('hex'),
  now = () => new Date(),
} = {}) {
  return (ip, userAgent) => {
    const dailySalt = createHmac('sha256', secret)
      .update(`salt:${bogotaDay(now())}`)
      .digest();
    return createHmac('sha256', dailySalt)
      .update(`${ip ?? ''}|${userAgent ?? ''}`)
      .digest('hex');
  };
}
