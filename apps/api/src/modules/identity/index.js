// Fachada pública del módulo `identity` (regla M-1): lo único que otros módulos pueden importar.
// Operaciones: authenticate(token), getUser(id), setRole(userId, role) e issueAccessToken(userId).
// Al eliminar una cuenta publica `user.anonymized` en el bus de eventos.
import bcrypt from 'bcryptjs';
import { createAuthMiddleware } from '../../http/auth.js';
import { createIdentityRepository } from './repository.js';
import { createIdentityRouter } from './routes.js';
import { createIdentityService } from './service.js';
import { createTokenSigner } from './tokens.js';

const BCRYPT_COST = 10;

/**
 * @param {{ db: { query: Function }, jwtSecret?: string, secureCookie?: boolean,
 *   rateLimitOptions?: object, forgotRateLimitOptions?: object, bcryptCost?: number,
 *   email?: object, events?: object, webUrl?: string, onEmailError?: Function }} deps
 *   `email` es el puerto de correo y `events`, el bus de eventos de dominio
 */
export function createIdentityModule({
  db,
  jwtSecret,
  secureCookie = false,
  rateLimitOptions,
  forgotRateLimitOptions,
  bcryptCost = BCRYPT_COST,
  email,
  events,
  webUrl,
  onEmailError,
}) {
  const service = createIdentityService({
    repository: createIdentityRepository(db),
    signer: createTokenSigner({ secret: jwtSecret }),
    hasher: {
      hash: (plain) => bcrypt.hash(plain, bcryptCost),
      compare: (plain, hash) => bcrypt.compare(plain, hash),
    },
    email,
    events,
    webUrl,
    onEmailError,
  });
  const middleware = createAuthMiddleware(service.authenticate);
  return {
    router: createIdentityRouter({
      service,
      requireAuth: middleware.requireAuth,
      secureCookie,
      rateLimitOptions,
      forgotRateLimitOptions,
    }),
    /** requireAuth y requireRole para las rutas protegidas de otros módulos. */
    middleware,
    facade: {
      authenticate: service.authenticate,
      getUser: service.getMe,
      setRole: service.setRole,
      issueAccessToken: service.issueAccessToken,
    },
  };
}
