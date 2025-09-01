import { Request, Response } from 'express';
import fs from 'fs';
import { KiteService } from '@/services/KiteService';
import { DataService } from '@/services/DataService';
import { PeriodicFetchService } from '@/services/PeriodicFetchService';
import { asyncHandler } from '@/middleware/errorHandler';
import { isMarketOpen } from '@/utils/market';
import { NotFoundError, ValidationError } from '@/types';
import logger from '@/utils/logger';

export class DataController {
  constructor(
    private kiteService: KiteService,
    private dataService: DataService,
    private periodicFetchService: PeriodicFetchService
  ) {}

  public getNiftyData = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    try {
      // If we have latest data in memory, serve it
      const latestData = this.periodicFetchService.getLatestOptionData();
      if (latestData) {
        logger.info('Serving latest option data from memory');

        const marketOpen = isMarketOpen();
        
        // Generate breakout signals (simplified version for TypeScript compatibility)
        let breakoutSignals = null;
        try {
          // Basic signal structure for compatibility
          breakoutSignals = {
            signals: [],
            signalCount: 0,
            primarySignalType: null,
            signalStrength: 0,
            signalDirection: 'neutral',
            timestamp: new Date().toISOString()
          };
        } catch (signalError) {
          logger.warn('Failed to generate breakout signals:', signalError);
        }

        res.json({
          success: true,
          data: latestData,
          breakout_signals: breakoutSignals,
          source: 'memory',
          last_updated: latestData.timestamp,
          market_status: {
            is_open: marketOpen,
            message: marketOpen 
              ? 'Market is open - Data being updated every 30s' 
              : 'Market is closed - Serving last available data',
            market_hours: '9:30 AM - 3:30 PM IST (Mon-Fri)'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // If no data in memory, try to get from historical file
      const historicalData = await this.dataService.getHistoricalData({ limit: 1 });
      if (historicalData.success && historicalData.data && historicalData.data.timestamps.length > 0) {
        logger.info('Serving latest data from historical file');

        const latest = historicalData.data.timestamps.length - 1;
        const reconstructedData = {
          spot_price: historicalData.data.spotPrices[latest],
          atm_strike: historicalData.data.atmStrikes[latest],
          expiry: historicalData.data.expiry,
          timestamp: historicalData.data.timestamps[latest],
          options: this.reconstructOptionsFromHistorical(historicalData.data, latest)
        };

        const marketOpen = isMarketOpen();

        res.json({
          success: true,
          data: reconstructedData,
          source: 'historical_file',
          last_updated: reconstructedData.timestamp,
          market_status: {
            is_open: marketOpen,
            message: marketOpen 
              ? 'Market is open - Background data fetch may be starting' 
              : 'Market is closed - Serving historical data',
            market_hours: '9:30 AM - 3:30 PM IST (Mon-Fri)'
          },
          timestamp: new Date().toISOString()
        });
        return;
      }

      // If no data available anywhere, return error
      throw new NotFoundError('No data available. Please ensure KiteConnect is properly configured and authenticated.');
    } catch (error) {
      logger.error('Error in nifty-data endpoint:', error);
      res.status(error instanceof NotFoundError ? 404 : 500).json({
        success: false,
        error: error instanceof NotFoundError ? 'No data available' : 'Failed to fetch NIFTY data',
        message: (error as Error).message,
        market_status: {
          is_open: isMarketOpen(),
          market_hours: '9:30 AM - 3:30 PM IST (Mon-Fri)'
        },
        timestamp: new Date().toISOString()
      });
    }
  });

  public fetchData = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    try {
      if (!this.kiteService.isKiteInitialized()) {
        throw new ValidationError('KiteConnect not initialized');
      }

      logger.info('Manual data fetch triggered...');

      const data = await this.periodicFetchService.performDataFetch();
      if (data) {
        res.json({
          success: true,
          message: 'Data fetched and saved successfully',
          data: data,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to fetch data',
          message: 'Data fetch returned null',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Error in manual data fetch:', error);
      res.status(500).json({
        success: false,
        error: 'Manual data fetch failed',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  public controlFetch = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { action } = req.body;

      switch (action) {
        case 'start':
          if (this.periodicFetchService.isFetchRunning()) {
            res.json({
              success: true,
              message: 'Periodic fetch is already running',
              status: 'running',
              timestamp: new Date().toISOString()
            });
            return;
          }

          this.periodicFetchService.startPeriodicDataFetch();
          res.json({
            success: true,
            message: 'Periodic data fetch started',
            status: 'started',
            interval: '30 seconds',
            timestamp: new Date().toISOString()
          });
          break;

        case 'stop':
          this.periodicFetchService.stopPeriodicDataFetch();
          res.json({
            success: true,
            message: 'Periodic data fetch stopped',
            status: 'stopped',
            timestamp: new Date().toISOString()
          });
          break;

        case 'status':
          const fetchStatus = this.periodicFetchService.getFetchStatus();
          res.json({
            success: true,
            ...fetchStatus,
            timestamp: new Date().toISOString()
          });
          break;

        default:
          throw new ValidationError('Action must be "start", "stop", or "status"');
      }
    } catch (error) {
      logger.error('Error controlling fetch:', error);
      res.status(error instanceof ValidationError ? 400 : 500).json({
        success: false,
        error: 'Failed to control fetch',
        message: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  public getHistoricalData = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    try {
      const { timeframe, limit } = req.query;

      const filters: any = {};
      if (timeframe) filters.timeframe = timeframe;
      if (limit) filters.limit = parseInt(limit as string);

      const result = await this.dataService.getHistoricalData(filters);

      logger.info(
        `Historical data request: timeframe=${timeframe || 'all'}, limit=${limit || 'none'}, records=${result.filteredRecords || 0}`
      );

      if (result.success) {
        res.json({
          ...result,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          ...result,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      logger.error('Error fetching historical data:', error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  public getHistoricalSummary = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    try {
      const stats = this.dataService.getHistoricalDataStats();

      if (stats.available) {
        // Get additional analytics
        const result = await this.dataService.getHistoricalData({ limit: 100 });

        if (result.success && result.data && result.data.spotPrices.length > 0) {
          const prices = result.data.spotPrices;
          const volumes = result.data.calls.volume.map((v, i) => v + (result.data?.puts.volume[i] || 0));

          (stats as any).analytics = {
            price_range: {
              min: Math.min(...prices),
              max: Math.max(...prices),
              current: prices[prices.length - 1]
            },
            average_volume: volumes.reduce((a, b) => a + b, 0) / volumes.length,
            data_points_last_100: prices.length
          };
        }
      }

      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error getting historical summary:', error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  public clearHistoricalData = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    try {
      this.dataService.clearHistoricalData();

      logger.info('Historical data cleared by user request');

      res.json({
        success: true,
        message: 'Historical data cleared successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Error clearing historical data:', error);
      res.status(500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  public exportHistoricalData = asyncHandler(async (_req: Request, res: Response): Promise<void> => {
    try {
      const filePath = this.dataService.getExcelFilePath();

      if (!this.dataService.excelFileExists()) {
        throw new NotFoundError('No historical data available');
      }

      const filename = `nifty_historical_data_v1_${new Date().toISOString().split('T')[0]}.xlsx`;

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);

      logger.info(`Historical data exported: ${filename}`);
    } catch (error) {
      logger.error('Error exporting historical data:', error);
      res.status(error instanceof NotFoundError ? 404 : 500).json({
        success: false,
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      });
    }
  });

  private reconstructOptionsFromHistorical(data: any, latest: number): any {
    const atmStrike = data.atmStrikes[latest];
    const options: any = {};

    // Reconstruct all strikes from ATM-3 to ATM+3 using the new multi-strike data structure
    for (let i = -3; i <= 3; i++) {
      const strike = atmStrike + (i * 50);
      
      // Determine which data arrays to use based on the strike offset
      let callData, putData;
      
      switch (i) {
        case -3:
          callData = data.atmM3Calls || { ltp: [], volume: [], oi: [], change: [], iv: [] };
          putData = data.atmM3Puts || { ltp: [], volume: [], oi: [], change: [], iv: [] };
          break;
        case -2:
          callData = data.atmM2Calls || { ltp: [], volume: [], oi: [], change: [], iv: [] };
          putData = data.atmM2Puts || { ltp: [], volume: [], oi: [], change: [], iv: [] };
          break;
        case -1:
          callData = data.atmM1Calls || { ltp: [], volume: [], oi: [], change: [], iv: [] };
          putData = data.atmM1Puts || { ltp: [], volume: [], oi: [], change: [], iv: [] };
          break;
        case 0:
          callData = data.calls || { ltp: [], volume: [], oi: [], change: [], iv: [] };
          putData = data.puts || { ltp: [], volume: [], oi: [], change: [], iv: [] };
          break;
        case 1:
          callData = data.atmP1Calls || { ltp: [], volume: [], oi: [], change: [], iv: [] };
          putData = data.atmP1Puts || { ltp: [], volume: [], oi: [], change: [], iv: [] };
          break;
        case 2:
          callData = data.atmP2Calls || { ltp: [], volume: [], oi: [], change: [], iv: [] };
          putData = data.atmP2Puts || { ltp: [], volume: [], oi: [], change: [], iv: [] };
          break;
        case 3:
          callData = data.atmP3Calls || { ltp: [], volume: [], oi: [], change: [], iv: [] };
          putData = data.atmP3Puts || { ltp: [], volume: [], oi: [], change: [], iv: [] };
          break;
        default:
          callData = { ltp: [], volume: [], oi: [], change: [], iv: [] };
          putData = { ltp: [], volume: [], oi: [], change: [], iv: [] };
      }

      options[strike] = {
        CE: {
          strike: strike,
          last_price: callData.ltp[latest] || 0,
          volume: callData.volume[latest] || 0,
          oi: callData.oi[latest] || 0,
          change: callData.change[latest] || 0,
          iv: callData.iv[latest] || 0
        },
        PE: {
          strike: strike,
          last_price: putData.ltp[latest] || 0,
          volume: putData.volume[latest] || 0,
          oi: putData.oi[latest] || 0,
          change: putData.change[latest] || 0,
          iv: putData.iv[latest] || 0
        }
      };
    }

    return options;
  }
}
