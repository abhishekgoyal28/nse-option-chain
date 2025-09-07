import { Router } from 'express';
import { healthRoutes } from './healthRoutes';
import { authRoutes } from './authRoutes';
import { dataRoutes } from './dataRoutes';
import { analysisRoutes } from './analysisRoutes';
import { googleSheetsRoutes } from './googleSheetsRoutes';
import { breakoutRoutes } from './breakoutRoutes';

// Services
import { KiteService } from '@/services/KiteService';
import { DataService } from '@/services/DataService';
import { PeriodicFetchService } from '@/services/PeriodicFetchService';
import { BreakoutDetectionService } from '@/services/BreakoutDetectionService';

// Controllers
import { HealthController } from '@/controllers/HealthController';
import { AuthController } from '@/controllers/AuthController';
import { DataController } from '@/controllers/DataController';
import { AnalysisController } from '@/controllers/AnalysisController';
import { GoogleSheetsController } from '@/controllers/GoogleSheetsController';
import { BreakoutController } from '@/controllers/BreakoutController';

export function createRoutes(): {
  router: Router;
  services: {
    kiteService: KiteService;
    dataService: DataService;
    periodicFetchService: PeriodicFetchService;
    breakoutService: BreakoutDetectionService;
  };
} {
  const router = Router();

  // Initialize services
  const kiteService = new KiteService();
  const dataService = new DataService();
  const periodicFetchService = new PeriodicFetchService(kiteService, dataService);
  const breakoutService = new BreakoutDetectionService();

  // Initialize controllers
  const healthController = new HealthController(kiteService, dataService, periodicFetchService);
  const authController = new AuthController(kiteService);
  const dataController = new DataController(kiteService, dataService, periodicFetchService);
  const analysisController = new AnalysisController(dataService);
  const googleSheetsController = new GoogleSheetsController(dataService);
  const breakoutController = new BreakoutController(breakoutService, dataService);

  // Mount routes
  router.use('/health', healthRoutes(healthController));
  router.use('/auth', authRoutes(authController));
  router.use('/data', dataRoutes(dataController));
  router.use('/analysis', analysisRoutes(analysisController));
  router.use('/sheets', googleSheetsRoutes(googleSheetsController));
  router.use('/breakouts', breakoutRoutes(breakoutController));

  return {
    router,
    services: {
      kiteService,
      dataService,
      periodicFetchService,
      breakoutService
    }
  };
}
