import { Request, Response } from 'express';
import { HealthCheckResponse } from '@/types';
import { KiteService } from '@/services/KiteService';
import { DataService } from '@/services/DataService';
import { PeriodicFetchService } from '@/services/PeriodicFetchService';
import { asyncHandler } from '@/middleware/errorHandler';
import logger from '@/utils/logger';

export class HealthController {
  constructor(
    private kiteService: KiteService,
    private dataService: DataService,
    private periodicFetchService: PeriodicFetchService
  ) {}

  public getHealth = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    try {
      const stats = this.dataService.getHistoricalDataStats();
      const googleSheetsStatus = await this.dataService.getGoogleSheetsStatus();
      const fetchStatus = this.periodicFetchService.getFetchStatus();
      const storageInfo = this.dataService.getStorageInfo();

      const healthResponse: HealthCheckResponse = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '3.0.0',
        kite_initialized: this.kiteService.isKiteInitialized(),
        api_key: this.kiteService.getApiKey(),
        historical_data: stats,
        google_sheets: googleSheetsStatus,
        storage: storageInfo,
        periodic_fetch: fetchStatus
      };

      logger.info('Health check requested');
      res.json(healthResponse);
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(500).json({
        success: false,
        error: 'Health check failed',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  public getVersion = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    res.json({
      success: true,
      version: '3.0.0',
      name: 'NSE Option Chain Tracker',
      description: 'Real-time NIFTY option chain tracker with historical data storage - TypeScript Edition',
      timestamp: new Date().toISOString()
    });
  });
}
