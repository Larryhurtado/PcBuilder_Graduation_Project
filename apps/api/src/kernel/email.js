/**
 * Puerto de correo. En desarrollo el adaptador escribe el mensaje en la consola de la API (ahí
 * aparece el enlace de recuperación); al elegir un proveedor de correo se reemplaza por un
 * adaptador con la misma interfaz `send({ to, subject, text })`.
 */

/** @param {{ logger?: { info: Function } }} [options] */
export function createConsoleEmail({ logger } = {}) {
  return {
    async send({ to, subject, text }) {
      const lines = [`[correo simulado] Para: ${to}`, `Asunto: ${subject}`, '', text];
      if (logger) logger.info(lines.join('\n'));
      else console.log(lines.join('\n'));
    },
  };
}

/** Adaptador para pruebas: guarda los mensajes en memoria en vez de escribirlos. */
export function createMemoryEmail() {
  /** @type {{ to: string, subject: string, text: string }[]} */
  const sent = [];
  return {
    sent,
    async send(message) {
      sent.push(message);
    },
  };
}
