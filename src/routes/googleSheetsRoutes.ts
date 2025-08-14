import { Router } from 'express';
import { GoogleSheetsController } from '@/controllers/GoogleSheetsController';
import { validateQuery } from '@/utils/validators';
import { 
  sheetsHistoricalDataQuerySchema, 
  sheetsDailySummaryQuerySchema 
} from '@/utils/validators';

export function googleSheetsRoutes(googleSheetsController: GoogleSheetsController): Router {
  const router = Router();

  // GET /api/sheets/status - Google Sheets connection status
  router.get('/status', googleSheetsController.getSheetsStatus);

  // GET /api/sheets/historical-data - Historical data from Google Sheets
  router.get('/historical-data', 
    validateQuery(sheetsHistoricalDataQuerySchema), 
    googleSheetsController.getSheetsHistoricalData
  );

  // GET /api/sheets/daily-summary - Daily summary statistics
  router.get('/daily-summary', 
    validateQuery(sheetsDailySummaryQuerySchema), 
    googleSheetsController.getSheetsDailySummary
  );

  return router;
}
