import { Router } from 'express';
import { HealthController } from '@/controllers/HealthController';

export function healthRoutes(healthController: HealthController): Router {
  const router = Router();

  // GET /api/health - Health check and system status
  router.get('/', healthController.getHealth);

  // GET /api/health/version - Get version information
  router.get('/version', healthController.getVersion);

  return router;
}
