import { Router } from 'express';
import { healthRoutes } from './healthRoutes';
import { authRoutes } from './authRoutes';
import { dataRoutes } from './dataRoutes';
import { analysisRoutes } from './analysisRoutes';
import { googleSheetsRoutes } from './googleSheetsRoutes';
import { stockResearchRoutes } from './stockResearchRoutes';
import { enhancedBreakoutRoutes } from './enhancedBreakoutRoutes';

// Services
import { KiteService } from '@/services/KiteService';
import { DataService } from '@/services/DataService';
import { PeriodicFetchService } from '@/services/PeriodicFetchService';
import { StockResearchService } from '@/services/StockResearchService';
import { EnhancedBreakoutSignalService } from '@/services/EnhancedBreakoutSignalService';

// Controllers
import { HealthController } from '@/controllers/HealthController';
import { AuthController } from '@/controllers/AuthController';
import { DataController } from '@/controllers/DataController';
import { AnalysisController } from '@/controllers/AnalysisController';
import { GoogleSheetsController } from '@/controllers/GoogleSheetsController';
import { StockResearchController } from '@/controllers/StockResearchController';
import { EnhancedBreakoutController } from '@/controllers/EnhancedBreakoutController';

export function createRoutes(): {
  router: Router;
  services: {
    kiteService: KiteService;
    dataService: DataService;
    periodicFetchService: PeriodicFetchService;
    stockResearchService: StockResearchService;
    enhancedBreakoutService: EnhancedBreakoutSignalService;
  };
} {
  const router = Router();

  // Initialize services
  const kiteService = new KiteService();
  const dataService = new DataService();
  const periodicFetchService = new PeriodicFetchService(kiteService, dataService);
  const stockResearchService = new StockResearchService();
  const enhancedBreakoutService = new EnhancedBreakoutSignalService();

  // Initialize controllers
  const healthController = new HealthController(kiteService, dataService, periodicFetchService);
  const authController = new AuthController(kiteService);
  const dataController = new DataController(kiteService, dataService, periodicFetchService);
  const analysisController = new AnalysisController(dataService);
  const googleSheetsController = new GoogleSheetsController(dataService);
  const stockResearchController = new StockResearchController(stockResearchService);
  const enhancedBreakoutController = new EnhancedBreakoutController(enhancedBreakoutService, dataService);

  // Mount routes
  router.use('/health', healthRoutes(healthController));
  router.use('/auth', authRoutes(authController));
  router.use('/data', dataRoutes(dataController));
  router.use('/analysis', analysisRoutes(analysisController));
  router.use('/sheets', googleSheetsRoutes(googleSheetsController));
  router.use('/stock-research', stockResearchRoutes(stockResearchController));
  router.use('/enhanced-breakouts', enhancedBreakoutRoutes(enhancedBreakoutController));
  
  // Backward compatibility routes
  router.get('/nifty-data', dataController.getNiftyData);
  router.post('/stock-research', stockResearchController.researchStock);
  router.get('/stock-search', stockResearchController.getStockSuggestions);

  return {
    router,
    services: {
      kiteService,
      dataService,
      periodicFetchService,
      stockResearchService,
      enhancedBreakoutService
    }
  };
}
