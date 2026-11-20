import {
  changePasswordBodySchema,
  deleteAccountBodySchema,
  forgotBodySchema,
  loginBodySchema,
  registerBodySchema,
  resetBodySchema,
  updateMeBodySchema,
} from '@hw/contracts';
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
 *   forgotRateLimitOptions?: { windowMs?: number, limit?: number },
 * }} deps
 */
export function createIdentityRouter({
  service,
  requireAuth,
  secureCookie = false,
  rateLimitOptions = {},
  forgotRateLimitOptions = {},
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

  // Pedir enlaces de recuperación es más delicado (envía correos): 5 por hora por IP
  const forgotLimiter = rateLimit({
    windowMs: 60 * 60_000,
    limit: 5,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (_req, _res, next) => next(new AppError('RATE_LIMITED')),
    ...forgotRateLimitOptions,
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

  // Recuperar contraseña: límite estricto por IP; responde 200 igual exista o no el correo
  router.post(
    '/auth/forgot',
    forgotLimiter,
    validate({ body: forgotBodySchema }),
    async (req, res) => {
      await service.requestPasswordReset(req.valid.body.email);
      res.json({});
    },
  );

  router.post('/auth/reset', limiter, validate({ body: resetBodySchema }), async (req, res) => {
    await service.resetPassword(req.valid.body);
    res.clearCookie(COOKIE_NAME, cookieOptions);
    res.status(204).end();
  });

  router.get('/me', requireAuth, async (req, res) => {
    res.json({ user: await service.getMe(req.user.userId) });
  });

  router.patch('/me', requireAuth, validate({ body: updateMeBodySchema }), async (req, res) => {
    res.json({ user: await service.updateProfile(req.user.userId, req.valid.body) });
  });

  router.post(
    '/me/password',
    requireAuth,
    limiter,
    validate({ body: changePasswordBodySchema }),
    async (req, res) => {
      const { refreshToken } = await service.changePassword(req.user.userId, req.valid.body);
      // Las demás sesiones se cerraron; este dispositivo sigue con una cookie de refresco nueva
      res.cookie(COOKIE_NAME, refreshToken, {
        ...cookieOptions,
        maxAge: REFRESH_TTL_SECONDS * 1000,
      });
      res.status(204).end();
    },
  );

  router.delete(
    '/me',
    requireAuth,
    limiter,
    validate({ body: deleteAccountBodySchema }),
    async (req, res) => {
      await service.deleteAccount(req.user.userId, req.valid.body);
      res.clearCookie(COOKIE_NAME, cookieOptions);
      res.status(204).end();
    },
  );

  return router;
}
