import { Router } from 'express';
import { DataController } from '@/controllers/DataController';
import { validateQuery, validateBody } from '@/utils/validators';
import { 
  historicalDataQuerySchema, 
  controlFetchSchema 
} from '@/utils/validators';

export function dataRoutes(dataController: DataController): Router {
  const router = Router();

  // GET /api/data/nifty - Current NIFTY option chain data
  router.get('/nifty', dataController.getNiftyData);
  
  // Alias for backward compatibility
  router.get('/nifty-data', dataController.getNiftyData);

  // POST /api/data/fetch - Manual data fetch trigger
  router.post('/fetch', dataController.fetchData);

  // POST /api/data/control-fetch - Control periodic fetch process
  router.post('/control-fetch', validateBody(controlFetchSchema), dataController.controlFetch);

  // GET /api/data/historical - Historical data with filtering
  router.get('/historical', validateQuery(historicalDataQuerySchema), dataController.getHistoricalData);

  // GET /api/data/historical/summary - Historical data summary/stats
  router.get('/historical/summary', dataController.getHistoricalSummary);

  // DELETE /api/data/historical - Clear historical data
  router.delete('/historical', dataController.clearHistoricalData);

  // GET /api/data/export - Export historical data as Excel download
  router.get('/export', dataController.exportHistoricalData);

  return router;
}
