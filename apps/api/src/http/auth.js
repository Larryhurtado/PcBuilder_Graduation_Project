import { AppError } from '../kernel/errors.js';

/**
 * Middlewares de autenticación y autorización por rol. `authenticate` es la función de la fachada
 * de identity: recibe el token de acceso y devuelve `{ userId, role }` o lanza un AppError.
 * @param {(token: string) => { userId: string, role: string }} authenticate
 */
export function createAuthMiddleware(authenticate) {
  /** Exige `Authorization: Bearer <token>` y deja el usuario en `req.user`. */
  function requireAuth(req, _res, next) {
    const match = /^Bearer (\S+)$/.exec(req.get('authorization') ?? '');
    if (!match) return next(new AppError('UNAUTHENTICATED'));
    try {
      req.user = authenticate(match[1]);
      next();
    } catch (error) {
      next(error);
    }
  }

  /** Exige uno de los roles indicados (se usa después de requireAuth). */
  const requireRole =
    (...roles) =>
    (req, _res, next) =>
      roles.includes(req.user?.role) ? next() : next(new AppError('ROLE_FORBIDDEN'));

  return { requireAuth, requireRole };
}
