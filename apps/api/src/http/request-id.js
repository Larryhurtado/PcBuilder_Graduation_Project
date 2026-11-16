import { randomUUID } from 'node:crypto';

/** Asigna un identificador a cada petición y lo devuelve en la cabecera X-Request-Id. */
export function requestId(req, res, next) {
  req.id = randomUUID();
  res.setHeader('X-Request-Id', req.id);
  next();
}
