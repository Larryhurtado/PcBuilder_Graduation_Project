// Fachada pública del módulo `identity` (regla M-1): lo único que otros módulos pueden importar.
// Operaciones previstas (Diseño Integral, 4.1): authenticate(token), getUser(id),
// setRole(userId, role), anonymize(userId).
import bcrypt from 'bcryptjs';
import { createAuthMiddleware } from '../../http/auth.js';
import { createIdentityRepository } from './repository.js';
import { createIdentityRouter } from './routes.js';
import { createIdentityService } from './service.js';
import { createTokenSigner } from './tokens.js';

const BCRYPT_COST = 10;

/**
 * @param {{ db: { query: Function }, jwtSecret?: string, secureCookie?: boolean,
 *   rateLimitOptions?: object, bcryptCost?: number }} deps
 */
export function createIdentityModule({
  db,
  jwtSecret,
  secureCookie = false,
  rateLimitOptions,
  bcryptCost = BCRYPT_COST,
}) {
  const service = createIdentityService({
    repository: createIdentityRepository(db),
    signer: createTokenSigner({ secret: jwtSecret }),
    hasher: {
      hash: (plain) => bcrypt.hash(plain, bcryptCost),
      compare: (plain, hash) => bcrypt.compare(plain, hash),
    },
  });
  const middleware = createAuthMiddleware(service.authenticate);
  return {
    router: createIdentityRouter({
      service,
      requireAuth: middleware.requireAuth,
      secureCookie,
      rateLimitOptions,
    }),
    /** requireAuth y requireRole para las rutas protegidas de otros módulos. */
    middleware,
    facade: { authenticate: service.authenticate, getUser: service.getMe },
  };
}
