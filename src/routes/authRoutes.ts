import { Router } from 'express';
import { AuthController } from '@/controllers/AuthController';
import { validateBody } from '@/utils/validators';
import { generateTokenSchema, setTokenSchema } from '@/utils/validators';
import { strictLimiter } from '@/middleware/security';

export function authRoutes(authController: AuthController): Router {
  const router = Router();

  // Apply strict rate limiting to auth routes
  router.use(strictLimiter);

  // GET /api/auth/login-url - Get Kite Connect login URL
  router.get('/login-url', authController.getLoginUrl);

  // POST /api/auth/generate-token - Generate access token from request token
  router.post('/generate-token', validateBody(generateTokenSchema), authController.generateToken);

  // POST /api/auth/set-token - Set access token
  router.post('/set-token', validateBody(setTokenSchema), authController.setToken);

  return router;
}
