import { loginBodySchema, registerBodySchema } from '@hw/contracts';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { validate } from '../../http/validate.js';
import { AppError } from '../../kernel/errors.js';
import { REFRESH_TTL_SECONDS } from './tokens.js';

const COOKIE_NAME = 'refresh_token';
const COOKIE_PATH = '/api/v1/auth';

/**
 * Rutas de sesión (cuelgan de /api/v1). El token de refresco viaja solo en una cookie
 * HttpOnly con SameSite=Lax; el de acceso va en el cuerpo y el frontend lo guarda en memoria.
 * @param {{
 *   service: ReturnType<import('./service.js').createIdentityService>,
 *   requireAuth: import('express').RequestHandler,
 *   secureCookie?: boolean,
 *   rateLimitOptions?: { windowMs?: number, limit?: number },
 * }} deps
 */
export function createIdentityRouter({
  service,
  requireAuth,
  secureCookie = false,
  rateLimitOptions = {},
}) {
  const router = Router();

  const limiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new AppError('RATE_LIMITED')),
    ...rateLimitOptions,
  });

  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax',
    secure: secureCookie,
    path: COOKIE_PATH,
  };

  function sendSession(res, status, { refreshToken, ...body }) {
    res.cookie(COOKIE_NAME, refreshToken, { ...cookieOptions, maxAge: REFRESH_TTL_SECONDS * 1000 });
    res.status(status).json(body);
  }

  router.post(
    '/auth/register',
    limiter,
    validate({ body: registerBodySchema }),
    async (req, res) => {
      sendSession(res, 201, await service.register(req.valid.body));
    },
  );

  router.post('/auth/login', limiter, validate({ body: loginBodySchema }), async (req, res) => {
    sendSession(res, 200, await service.login(req.valid.body));
  });

  router.post('/auth/refresh', limiter, async (req, res) => {
    try {
      sendSession(res, 200, await service.refresh(req.cookies?.[COOKIE_NAME]));
    } catch (error) {
      // Una cookie inválida no debe quedarse en el navegador
      res.clearCookie(COOKIE_NAME, cookieOptions);
      throw error;
    }
  });

  router.post('/auth/logout', async (req, res) => {
    await service.logout(req.cookies?.[COOKIE_NAME]);
    res.clearCookie(COOKIE_NAME, cookieOptions);
    res.status(204).end();
  });

  router.get('/me', requireAuth, async (req, res) => {
    res.json({ user: await service.getMe(req.user.userId) });
  });

  return router;
}
