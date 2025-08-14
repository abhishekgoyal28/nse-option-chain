import { Router } from 'express';
import { AnalysisController } from '@/controllers/AnalysisController';
import { validateQuery, validateParams } from '@/utils/validators';
import { 
  marketAnalysisQuerySchema, 
  signalsQuerySchema,
  exportDataParamsSchema,
  exportDataQuerySchema
} from '@/utils/validators';

export function analysisRoutes(analysisController: AnalysisController): Router {
  const router = Router();

  // GET /api/analysis/market - Market analysis endpoint
  router.get('/market', validateQuery(marketAnalysisQuerySchema), analysisController.getMarketAnalysis);

  // GET /api/analysis/signals - Signal alerts endpoint
  router.get('/signals', validateQuery(signalsQuerySchema), analysisController.getSignals);

  // GET /api/analysis/export/:format - Export data endpoint
  router.get('/export/:format', 
    validateParams(exportDataParamsSchema),
    validateQuery(exportDataQuerySchema),
    analysisController.exportData
  );

  // GET /api/analysis/ws-info - WebSocket info endpoint
  router.get('/ws-info', analysisController.getWebSocketInfo);

  return router;
}
