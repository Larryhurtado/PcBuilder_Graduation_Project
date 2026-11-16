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

  /**
   * Sesión opcional: sin encabezado `Authorization` sigue como visitante (`req.user` indefinido);
   * con uno, debe ser válido (un token vencido responde TOKEN_EXPIRED para que el cliente refresque).
   */
  function optionalAuth(req, res, next) {
    if (!req.get('authorization')) return next();
    return requireAuth(req, res, next);
  }

  /** Exige uno de los roles indicados (se usa después de requireAuth). */
  const requireRole =
    (...roles) =>
    (req, _res, next) =>
      roles.includes(req.user?.role) ? next() : next(new AppError('ROLE_FORBIDDEN'));

  return { requireAuth, optionalAuth, requireRole };
}
